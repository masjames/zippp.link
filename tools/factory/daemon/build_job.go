package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

// BuildJob is the agent run state mirrored to the Factory UI.
type BuildJob struct {
	ID         string `json:"id"`
	Phase      string `json:"phase"` // starting | running | exited | error
	OK         bool   `json:"ok"`
	Message    string `json:"message"`
	BriefPath  string `json:"brief_path,omitempty"`
	Model      string `json:"model,omitempty"`
	Agent      string `json:"agent,omitempty"`
	PID        int    `json:"pid,omitempty"`
	OmpPID     int    `json:"omp_pid,omitempty"`
	ExitCode   *int   `json:"exit_code,omitempty"`
	StartedAt  string `json:"started_at,omitempty"`
	FinishedAt string `json:"finished_at,omitempty"`
}

type BuildConfig struct {
	Enabled  bool   `json:"enabled"`
	Agent    string `json:"agent"`
	Model    string `json:"model"`
	Terminal string `json:"terminal"`
	Script   string `json:"script"`
}

func (c *Config) buildDefaults() {
	if c.Build.Agent == "" {
		c.Build.Agent = "omp"
	}
	if c.Build.Model == "" {
		c.Build.Model = "deepseek/deepseek-v4-flash"
	}
	if c.Build.Terminal == "" {
		c.Build.Terminal = "ghostty"
	}
	if c.Build.Script == "" {
		c.Build.Script = "tools/factory/scripts/run-omp-build.sh"
	}
}

// BuildRunner spawns Ghostty+omp and polls status files for UI updates.
type BuildRunner struct {
	cfg       *Config
	broadcast func(typ string, fields map[string]any)

	mu   sync.Mutex
	jobs map[string]BuildJob
}

func NewBuildRunner(cfg *Config, broadcast func(typ string, fields map[string]any)) *BuildRunner {
	return &BuildRunner{
		cfg:       cfg,
		broadcast: broadcast,
		jobs:      map[string]BuildJob{},
	}
}

func (r *BuildRunner) Snapshot() map[string]BuildJob {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make(map[string]BuildJob, len(r.jobs))
	for id, job := range r.jobs {
		out[id] = job
	}
	return out
}

func (r *BuildRunner) Active(id string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	job, ok := r.jobs[id]
	if !ok {
		return false
	}
	return job.Phase == "starting" || job.Phase == "running"
}

// CompleteHandoff clears the building spinner and stops omp when the card
// reaches verify/done/blocked — even if Ghostty is still open.
func (r *BuildRunner) CompleteHandoff(id, reason string) {
	path := statusPath(r.cfg, id)
	disk, _ := readStatusFile(path)

	r.mu.Lock()
	cur, ok := r.jobs[id]
	r.mu.Unlock()
	if !ok {
		cur = disk
	}
	if cur.ID == "" {
		cur.ID = id
	}
	active := cur.Phase == "starting" || cur.Phase == "running" || disk.Phase == "starting" || disk.Phase == "running"
	if !active {
		return
	}

	// Ask wrapper to self-exit; also SIGTERM pids as backup.
	briefs := BriefsDir(r.cfg)
	_ = os.MkdirAll(briefs, 0o755)
	_ = os.WriteFile(filepath.Join(briefs, id+".stop"), []byte(reason+"\n"), 0o644)
	killPID(disk.OmpPID)
	killPID(disk.PID)
	killPID(cur.OmpPID)
	killPID(cur.PID)

	now := time.Now().UTC().Format(time.RFC3339)
	job := cur
	if job.BriefPath == "" {
		job.BriefPath = disk.BriefPath
	}
	if job.Model == "" {
		job.Model = r.cfg.Build.Model
	}
	if job.Agent == "" {
		job.Agent = r.cfg.Build.Agent
	}
	if job.StartedAt == "" {
		job.StartedAt = disk.StartedAt
	}
	job.Phase = "exited"
	job.OK = true
	job.Message = reason
	job.FinishedAt = now
	zero := 0
	job.ExitCode = &zero
	r.set(job)
	_ = writeStatusFile(path, job)
}

func killPID(pid int) {
	if pid <= 0 || !pidAlive(pid) {
		return
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return
	}
	_ = proc.Signal(syscall.SIGTERM)
}

func writeStatusFile(path string, job BuildJob) error {
	raw, err := json.MarshalIndent(job, "", "  ")
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (r *BuildRunner) set(job BuildJob) {
	r.mu.Lock()
	r.jobs[job.ID] = job
	r.mu.Unlock()
	if r.broadcast != nil {
		fields := map[string]any{
			"id":      job.ID,
			"phase":   job.Phase,
			"ok":      job.OK,
			"message": job.Message,
			"job":     job,
		}
		if job.BriefPath != "" {
			fields["brief_path"] = job.BriefPath
		}
		if job.Model != "" {
			fields["model"] = job.Model
		}
		r.broadcast("build_status", fields)
	}
}

func statusPath(cfg *Config, id string) string {
	return filepath.Join(BriefsDir(cfg), id+".status.json")
}

func readStatusFile(path string) (BuildJob, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return BuildJob{}, err
	}
	var job BuildJob
	if err := json.Unmarshal(raw, &job); err != nil {
		return BuildJob{}, err
	}
	return job, nil
}

func (r *BuildRunner) Launch(entity *Entity, briefAbs string) error {
	if r.Active(entity.ID) {
		return fmt.Errorf("build already running for %s", entity.ID)
	}

	relBrief, _ := filepath.Rel(r.cfg.RepoRoot, briefAbs)
	relBrief = filepath.ToSlash(relBrief)
	started := time.Now().UTC().Format(time.RFC3339)

	job := BuildJob{
		ID:        entity.ID,
		Phase:     "starting",
		OK:        true,
		Message:   "Preparing Ghostty + omp",
		BriefPath: relBrief,
		Model:     r.cfg.Build.Model,
		Agent:     r.cfg.Build.Agent,
		StartedAt: started,
	}
	r.set(job)

	if !r.cfg.Build.Enabled {
		job.Phase = "error"
		job.OK = false
		job.Message = "build.spawn disabled in factory.config.json"
		job.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		r.set(job)
		return fmt.Errorf("%s", job.Message)
	}

	script := r.cfg.Build.Script
	if !filepath.IsAbs(script) {
		script = filepath.Join(r.cfg.RepoRoot, filepath.FromSlash(script))
	}
	if _, err := os.Stat(script); err != nil {
		job.Phase = "error"
		job.OK = false
		job.Message = fmt.Sprintf("build script missing: %s", script)
		job.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		r.set(job)
		return err
	}

	_ = os.Remove(statusPath(r.cfg, entity.ID))

	entityAbs := filepath.Join(r.cfg.RepoRoot, filepath.FromSlash(entity.Path))
	envModel := r.cfg.Build.Model
	cmd := exec.Command("open", "-na", "Ghostty.app", "--args",
		"--working-directory="+r.cfg.RepoRoot,
		"-e", script, entity.ID,
	)
	cmd.Env = append(os.Environ(),
		"ZIPPP_FACTORY_BUILD_MODEL="+envModel,
		"ZIPPP_FACTORY_LLM_API_KEY_FILE="+r.cfg.LLM.APIKeyFile,
		"ZIPPP_REPO_ROOT="+r.cfg.RepoRoot,
		"ZIPPP_ENTITY_PATH="+entityAbs,
	)
	if err := cmd.Start(); err != nil {
		job.Phase = "error"
		job.OK = false
		job.Message = fmt.Sprintf("failed to open Ghostty: %v", err)
		job.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		r.set(job)
		return err
	}
	_ = cmd.Process.Release()

	job.Phase = "running"
	job.Message = fmt.Sprintf("Ghostty launched — omp %s on %s", r.cfg.Build.Model, entity.ID)
	r.set(job)

	go r.watch(entity.ID, started)
	return nil
}

func (r *BuildRunner) watch(id, startedAt string) {
	path := statusPath(r.cfg, id)
	deadline := time.Now().Add(4 * time.Hour)
	var lastPhase string
	var lastMsg string
	sawFile := false

	for time.Now().Before(deadline) {
		time.Sleep(800 * time.Millisecond)

		// Stop spinning if the wrapper PID died without writing exited.
		if job, err := readStatusFile(path); err == nil && job.PID > 0 &&
			(job.Phase == "starting" || job.Phase == "running") && !pidAlive(job.PID) {
			job.Phase = "exited"
			job.OK = true
			job.Message = "omp process ended"
			job.FinishedAt = time.Now().UTC().Format(time.RFC3339)
			if job.StartedAt == "" {
				job.StartedAt = startedAt
			}
			_ = writeStatusFile(path, job)
		}

		job, err := readStatusFile(path)
		if err != nil {
			if !sawFile && time.Since(mustParseTime(startedAt)) > 45*time.Second {
				fail := BuildJob{
					ID:         id,
					Phase:      "error",
					OK:         false,
					Message:    "No status from omp wrapper — is Ghostty/omp installed?",
					Model:      r.cfg.Build.Model,
					Agent:      r.cfg.Build.Agent,
					StartedAt:  startedAt,
					FinishedAt: time.Now().UTC().Format(time.RFC3339),
				}
				r.mu.Lock()
				cur := r.jobs[id]
				r.mu.Unlock()
				if cur.Phase == "starting" || cur.Phase == "running" {
					if cur.BriefPath != "" {
						fail.BriefPath = cur.BriefPath
					}
					r.set(fail)
				}
				return
			}
			continue
		}
		sawFile = true
		if job.StartedAt == "" {
			job.StartedAt = startedAt
		}
		if job.Model == "" {
			job.Model = r.cfg.Build.Model
		}
		if job.Agent == "" {
			job.Agent = r.cfg.Build.Agent
		}
		if job.Phase == lastPhase && job.Message == lastMsg {
			if job.Phase == "exited" || job.Phase == "error" {
				return
			}
			continue
		}
		lastPhase = job.Phase
		lastMsg = job.Message
		r.set(job)
		if job.Phase == "exited" || job.Phase == "error" {
			return
		}
	}
}

func pidAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	// On Unix, Signal(0) checks liveness without killing.
	err = proc.Signal(syscall.Signal(0))
	return err == nil
}

func mustParseTime(v string) time.Time {
	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return time.Now()
	}
	return t
}

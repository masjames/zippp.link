// @implements FEAT-111
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Verifier struct {
	cfg       *Config
	store     *Store
	broadcast func(typ string, fields map[string]any)

	queue    chan string
	mu       sync.Mutex
	queued   map[string]bool
	inflight map[string]bool
	done     chan struct{}
	closeOne sync.Once
}

func NewVerifier(cfg *Config, store *Store, broadcast func(typ string, fields map[string]any)) *Verifier {
	return &Verifier{
		cfg:       cfg,
		store:     store,
		broadcast: broadcast,
		queue:     make(chan string, 32),
		queued:    map[string]bool{},
		inflight:  map[string]bool{},
		done:      make(chan struct{}),
	}
}

func (v *Verifier) Enqueue(id string) error {
	entity := v.store.Get(id)
	if entity == nil {
		return fmt.Errorf("unknown entity %s", id)
	}
	if entity.Status != "verify" {
		return fmt.Errorf("entity %s is %s, not verify", id, entity.Status)
	}
	v.mu.Lock()
	if v.queued[id] || v.inflight[id] {
		v.mu.Unlock()
		return nil
	}
	v.queued[id] = true
	v.mu.Unlock()

	select {
	case v.queue <- id:
		return nil
	default:
		v.mu.Lock()
		delete(v.queued, id)
		v.mu.Unlock()
		return errors.New("verification queue full")
	}
}

func (v *Verifier) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-v.done:
			return
		case id := <-v.queue:
			v.mu.Lock()
			delete(v.queued, id)
			v.inflight[id] = true
			v.mu.Unlock()
			v.process(ctx, id)
			v.mu.Lock()
			delete(v.inflight, id)
			v.mu.Unlock()
		}
	}
}

func (v *Verifier) Close() {
	v.closeOne.Do(func() { close(v.done) })
}

func (v *Verifier) process(ctx context.Context, id string) {
	entity := v.store.Get(id)
	if entity == nil {
		log.Printf("verify %s: entity disappeared", id)
		return
	}
	v.broadcast("verification_started", map[string]any{"id": id})
	runCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	result := v.VerifyNow(runCtx, entity)
	if result.Passed {
		path := filepath.Join(v.cfg.RepoRoot, filepath.FromSlash(entity.Path))
		raw, err := os.ReadFile(path)
		if err != nil {
			result.Message = "status not written: " + err.Error()
		} else {
			current, parseErr := ParseEntity(entity.Path, raw)
			if parseErr != nil || current.ID != id || current.Status != "verify" {
				result.Message = "status changed before write"
				log.Printf("verify %s: status changed before write", id)
			} else if err := SetStatus(path, id, "verify", "done"); err != nil {
				result.Message = "status write failed: " + err.Error()
				log.Printf("verify %s: %v", id, err)
			} else {
				result.WroteStatus = true
			}
		}
	}

	v.store.SetResult(result)
	if err := v.writeReport(result); err != nil {
		log.Printf("verify %s: report: %v", id, err)
	}
	v.broadcast("verification", map[string]any{"result": result})
}

func (v *Verifier) VerifyNow(ctx context.Context, entity *Entity) Result {
	result := Result{
		ID:        entity.ID,
		StartedAt: time.Now().UTC().Format(time.RFC3339),
		Checks:    []CheckResult{},
	}
	checks := []CheckResult{}
	failedEarly := false

	if len(entity.Verification.TargetFiles) > 0 {
		check := v.checkStatic(entity)
		checks = append(checks, check)
		if check.Status == "fail" {
			failedEarly = true
		}
	}

	erdEntities := ERDEntitiesFromBody(entity.Body)
	if len(erdEntities) > 0 {
		check := v.checkModel(entity, erdEntities)
		checks = append(checks, check)
		if check.Status == "fail" {
			failedEarly = true
		}
	}

	if failedEarly {
		if entity.Verification.TestCommand != "" {
			checks = append(checks, CheckResult{
				Name:   "test",
				Status: "skip",
				Detail: "skipped: earlier check failed",
			})
		}
		if entity.Verification.ProdEndpoint != "" {
			checks = append(checks, CheckResult{
				Name:   "prod",
				Status: "skip",
				Detail: "skipped: earlier check failed",
			})
		}
	} else {
		if entity.Verification.TestCommand != "" {
			checks = append(checks, v.checkTest(ctx, entity))
		}
		if entity.Verification.ProdEndpoint != "" {
			checks = append(checks, v.checkProd(ctx, entity))
		}
	}

	result.Checks = checks
	result.FinishedAt = time.Now().UTC().Format(time.RFC3339)
	if len(checks) == 0 {
		result.Passed = false
		result.Message = "nothing to verify"
		return result
	}

	passed := true
	anyPass := false
	for _, check := range checks {
		if check.Status == "fail" {
			passed = false
		}
		if check.Status == "pass" {
			anyPass = true
		}
	}
	result.Passed = passed && anyPass
	if !result.Passed {
		result.Message = "verification failed"
	}
	return result
}

func (v *Verifier) checkStatic(entity *Entity) CheckResult {
	start := time.Now()
	for _, target := range entity.Verification.TargetFiles {
		path, err := v.resolveTarget(target)
		if err != nil {
			return failedCheck("static", start, err.Error())
		}
		info, err := os.Stat(path)
		if err != nil {
			return failedCheck("static", start, "missing target file "+target)
		}
		if !info.Mode().IsRegular() {
			return failedCheck("static", start, "not a regular file "+target)
		}
		if info.Size() > 2*1024*1024 {
			return failedCheck("static", start, "file too large "+target)
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return failedCheck("static", start, err.Error())
		}
		if !hasTraceMarker(string(raw), entity.ID) {
			return failedCheck("static", start, "missing trace marker for "+entity.ID+" in "+target)
		}
	}
	return passedCheck("static", start, fmt.Sprintf("%d target file(s) checked", len(entity.Verification.TargetFiles)))
}

type modelFile struct {
	declared map[string]bool
	tokens   map[string]bool
}

func (v *Verifier) checkModel(entity *Entity, erdEntities []ERDEntity) CheckResult {
	start := time.Now()
	if len(entity.Verification.TargetFiles) == 0 {
		return failedCheck("model", start, "ERD defined but no target_files")
	}
	files := []modelFile{}
	for _, target := range entity.Verification.TargetFiles {
		path, err := v.resolveTarget(target)
		if err != nil {
			return failedCheck("model", start, err.Error())
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return failedCheck("model", start, err.Error())
		}
		content := string(raw)
		declared := map[string]bool{}
		for _, name := range declaredNames(content) {
			declared[norm(name)] = true
		}
		files = append(files, modelFile{declared: declared, tokens: identifierSet(content)})
	}

	for _, erd := range erdEntities {
		matched := []modelFile{}
		for _, file := range files {
			if file.declared[norm(erd.Name)] {
				matched = append(matched, file)
			}
		}
		if len(matched) == 0 {
			return failedCheck("model", start, "ERD entity not found in code: "+erd.Name)
		}
		for _, field := range erd.Fields {
			found := false
			for _, file := range matched {
				if file.tokens[norm(field)] {
					found = true
					break
				}
			}
			if !found {
				return failedCheck("model", start, "ERD field not found in code: "+erd.Name+"."+field)
			}
		}
	}
	return passedCheck("model", start, fmt.Sprintf("%d ERD entity(s) matched", len(erdEntities)))
}

func (v *Verifier) checkTest(ctx context.Context, entity *Entity) CheckResult {
	start := time.Now()
	argv, err := parseCommand(entity.Verification.TestCommand)
	if err != nil {
		return failedCheck("test", start, err.Error())
	}
	allowed := false
	for _, command := range v.cfg.Verify.AllowedCommands {
		if argv[0] == command {
			allowed = true
			break
		}
	}
	if !allowed {
		return failedCheck("test", start, "command not allowed: "+argv[0])
	}
	timeout := time.Duration(v.cfg.Verify.TimeoutSeconds) * time.Second
	output, code, err := runCommand(ctx, v.cfg.RepoRoot, argv, timeout, v.cfg.Verify.MaxOutputBytes)
	if err != nil {
		check := failedCheck("test", start, err.Error())
		check.Output = output
		return check
	}
	if code != 0 {
		check := failedCheck("test", start, fmt.Sprintf("exit code %d", code))
		check.Output = output
		return check
	}
	check := passedCheck("test", start, "exit code 0")
	check.Output = output
	return check
}

func (v *Verifier) checkProd(ctx context.Context, entity *Entity) CheckResult {
	start := time.Now()
	parsed, err := url.Parse(entity.Verification.ProdEndpoint)
	if err != nil {
		return failedCheck("prod", start, err.Error())
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return failedCheck("prod", start, "unsupported url scheme")
	}
	client := &http.Client{Timeout: time.Duration(v.cfg.Verify.HTTPTimeoutSeconds) * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, entity.Verification.ProdEndpoint, nil)
	if err != nil {
		return failedCheck("prod", start, err.Error())
	}
	resp, err := client.Do(req)
	if err != nil {
		return failedCheck("prod", start, err.Error())
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return failedCheck("prod", start, err.Error())
	}
	if resp.StatusCode != http.StatusOK {
		return failedCheck("prod", start, fmt.Sprintf("status %d", resp.StatusCode))
	}
	var object map[string]any
	if json.Unmarshal(body, &object) == nil {
		if value, ok := object["ok"]; ok {
			flag, isBool := value.(bool)
			if !isBool || !flag {
				return failedCheck("prod", start, "ok is not true")
			}
		}
	}
	return passedCheck("prod", start, "status 200")
}

func (v *Verifier) resolveTarget(rel string) (string, error) {
	if filepath.IsAbs(rel) {
		return "", errors.New("absolute target path")
	}
	clean := filepath.Clean(filepath.Join(v.cfg.RepoRoot, rel))
	lexical, err := filepath.Rel(v.cfg.RepoRoot, clean)
	if err != nil || lexical == ".." || strings.HasPrefix(lexical, ".."+string(os.PathSeparator)) {
		return "", errors.New("path escapes repo")
	}
	eval, err := filepath.EvalSymlinks(clean)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("missing target file %s", rel)
		}
		return "", err
	}
	repoEval, err := filepath.EvalSymlinks(v.cfg.RepoRoot)
	if err != nil {
		repoEval = v.cfg.RepoRoot
	}
	escaped, err := filepath.Rel(repoEval, eval)
	if err != nil || escaped == ".." || strings.HasPrefix(escaped, ".."+string(os.PathSeparator)) {
		return "", errors.New("path escapes repo")
	}
	return eval, nil
}

func (v *Verifier) writeReport(result Result) error {
	if err := os.MkdirAll(v.cfg.ReportsDir, 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(v.cfg.ReportsDir, result.ID+".json"), raw, 0o644)
}

func passedCheck(name string, start time.Time, detail string) CheckResult {
	return CheckResult{
		Name:       name,
		Status:     "pass",
		Detail:     detail,
		DurationMS: time.Since(start).Milliseconds(),
	}
}

func failedCheck(name string, start time.Time, detail string) CheckResult {
	return CheckResult{
		Name:       name,
		Status:     "fail",
		Detail:     detail,
		DurationMS: time.Since(start).Milliseconds(),
	}
}

const denyChars = ";|&<>$`\n\r\\"

func parseCommand(s string) ([]string, error) {
	if strings.ContainsAny(s, denyChars) {
		return nil, errors.New("shell operators are not allowed")
	}
	var args []string
	var cur strings.Builder
	var quote rune
	has := false
	for _, r := range s {
		switch {
		case quote != 0:
			if r == quote {
				quote = 0
			} else {
				cur.WriteRune(r)
			}
		case r == '"' || r == '\'':
			quote = r
			has = true
		case r == ' ' || r == '\t':
			if has || cur.Len() > 0 {
				args = append(args, cur.String())
				cur.Reset()
				has = false
			}
		default:
			cur.WriteRune(r)
		}
	}
	if quote != 0 {
		return nil, errors.New("unterminated quote")
	}
	if has || cur.Len() > 0 {
		args = append(args, cur.String())
	}
	if len(args) == 0 {
		return nil, errors.New("empty command")
	}
	return args, nil
}

type tailBuf struct {
	max int
	b   []byte
}

func (t *tailBuf) Write(p []byte) (int, error) {
	t.b = append(t.b, p...)
	if len(t.b) > t.max {
		t.b = t.b[len(t.b)-t.max:]
	}
	return len(p), nil
}

func runCommand(ctx context.Context, dir string, argv []string, timeout time.Duration, maxOut int) (string, int, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, argv[0], argv[1:]...)
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	cmd.WaitDelay = 3 * time.Second
	tb := &tailBuf{max: maxOut}
	cmd.Stdout, cmd.Stderr = tb, tb
	err := cmd.Run()
	if ctx.Err() == context.DeadlineExceeded {
		return string(tb.b), -1, fmt.Errorf("timed out after %s", timeout)
	}
	var ee *exec.ExitError
	if errors.As(err, &ee) {
		return string(tb.b), ee.ExitCode(), nil
	}
	if err != nil {
		return string(tb.b), -1, err
	}
	return string(tb.b), 0, nil
}

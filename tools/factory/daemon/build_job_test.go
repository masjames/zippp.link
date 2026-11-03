package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestReadStatusFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "FEAT-1.status.json")
	raw := []byte(`{"id":"FEAT-1","phase":"running","ok":true,"message":"go","model":"deepseek/deepseek-v4-flash"}`)
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	job, err := readStatusFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if job.ID != "FEAT-1" || job.Phase != "running" || !job.OK {
		t.Fatalf("%+v", job)
	}
}

func TestBuildRunnerSnapshotActive(t *testing.T) {
	cfg := &Config{RepoRoot: t.TempDir(), Build: BuildConfig{Enabled: false, Model: "deepseek/deepseek-v4-flash", Agent: "omp"}}
	cfg.buildDefaults()
	r := NewBuildRunner(cfg, nil)
	r.set(BuildJob{ID: "FEAT-1", Phase: "running", OK: true, Message: "x"})
	if !r.Active("FEAT-1") {
		t.Fatal("expected active")
	}
	snap := r.Snapshot()
	if snap["FEAT-1"].Phase != "running" {
		t.Fatalf("%+v", snap)
	}
	b, _ := json.Marshal(snap["FEAT-1"])
	if !json.Valid(b) {
		t.Fatal("invalid json")
	}
}

func TestCompleteHandoffWritesStopAndExits(t *testing.T) {
	root := t.TempDir()
	cfg := &Config{RepoRoot: root, Build: BuildConfig{Enabled: true, Model: "deepseek/deepseek-v4-flash", Agent: "omp"}}
	cfg.buildDefaults()
	r := NewBuildRunner(cfg, nil)
	r.set(BuildJob{ID: "FEAT-9", Phase: "running", OK: true, Message: "go", StartedAt: "2026-01-01T00:00:00Z"})
	r.CompleteHandoff("FEAT-9", "card → verify")
	if r.Active("FEAT-9") {
		t.Fatal("should not be active")
	}
	stop := filepath.Join(BriefsDir(cfg), "FEAT-9.stop")
	if _, err := os.Stat(stop); err != nil {
		t.Fatalf("stop file: %v", err)
	}
	job, err := readStatusFile(statusPath(cfg, "FEAT-9"))
	if err != nil {
		t.Fatal(err)
	}
	if job.Phase != "exited" || !job.OK {
		t.Fatalf("%+v", job)
	}
}

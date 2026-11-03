package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfigResolvesRelativePaths(t *testing.T) {
	root := t.TempDir()
	cfgDir := filepath.Join(root, "config")
	if err := os.MkdirAll(cfgDir, 0o755); err != nil {
		t.Fatal(err)
	}
	raw := `{
		"repo_root": "..",
		"entities_root": "entities",
		"listen": "127.0.0.1:8080",
		"reports_dir": "reports",
		"verify": {}
	}`
	path := filepath.Join(cfgDir, "factory.config.json")
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.RepoRoot != root {
		t.Fatalf("repo root = %q, want %q", cfg.RepoRoot, root)
	}
	if cfg.EntitiesRoot != filepath.Join(root, "entities") {
		t.Fatalf("entities root = %q", cfg.EntitiesRoot)
	}
	if cfg.ReportsDir != filepath.Join(root, "reports") {
		t.Fatalf("reports dir = %q", cfg.ReportsDir)
	}
	if cfg.Verify.TimeoutSeconds != 120 || cfg.Verify.HTTPTimeoutSeconds != 10 || cfg.Verify.MaxOutputBytes != 65536 {
		t.Fatalf("defaults not applied: %+v", cfg.Verify)
	}
	for _, dir := range []string{"features", "bugs", "stories", "diagrams", "direction", "decisions", "roadmap"} {
		if info, err := os.Stat(filepath.Join(cfg.EntitiesRoot, dir)); err != nil || !info.IsDir() {
			t.Fatalf("missing entity dir %s", dir)
		}
	}
}

func TestLoadConfigRejectsNonLoopback(t *testing.T) {
	for _, listen := range []string{"0.0.0.0:8080", "evil.com:8080", "[::]:8080"} {
		t.Run(listen, func(t *testing.T) {
			path := writeConfigFile(t, func(value map[string]any) {
				value["listen"] = listen
			})
			if _, err := LoadConfig(path); err == nil {
				t.Fatalf("LoadConfig accepted non-loopback listen %q", listen)
			}
		})
	}
}

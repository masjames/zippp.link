package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBuildBriefMarkdownContainsCard(t *testing.T) {
	entity := &Entity{
		ID:       "FEAT-113",
		Type:     "feature",
		Title:    "Space auth",
		Status:   "todo",
		Assignee: "adit",
		Path:     "features/FEAT-113.md",
		Body:     "# What it is\nAuth.\n\n# Acceptance criteria\n- [ ] Sign in\n",
		Relations: Relations{
			DependsOn:  []string{"DIR-001"},
			Implements: []string{"DEC-003"},
		},
		Verification: Verification{
			TargetFiles: []string{"src/lib/auth/issue-mobile-session.ts"},
			TestCommand: "npm test",
		},
	}
	out := BuildBriefMarkdown(entity, "/repo")
	for _, want := range []string{
		"FEAT-113",
		"Space auth",
		"DIR-001",
		"DEC-003",
		"issue-mobile-session.ts",
		"npm test",
		"zippp-factory-build",
		"Sign in",
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("brief missing %q\n%s", want, out)
		}
	}
}

func TestWriteBuildBrief(t *testing.T) {
	root := t.TempDir()
	cfg := &Config{RepoRoot: root}
	entity := &Entity{
		ID:     "FEAT-1",
		Type:   "feature",
		Title:  "T",
		Status: "todo",
		Path:   "features/FEAT-1.md",
		Body:   "Body",
	}
	path, err := WriteBuildBrief(cfg, entity)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(path) != "FEAT-1.md" {
		t.Fatalf("path = %s", path)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "FEAT-1") {
		t.Fatalf("brief body: %s", raw)
	}
	latest := filepath.Join(BriefsDir(cfg), "LATEST.md")
	if _, err := os.Stat(latest); err != nil {
		t.Fatal(err)
	}
}

package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReplaceStatus(t *testing.T) {
	raw := []byte("---\nid: FEAT-1\ntype: feature\ntitle: T\nstatus: verify # note\nassignee: adit\n---\nstatus: verify\nBody\n")
	out, err := replaceStatus(raw, "done")
	if err != nil {
		t.Fatal(err)
	}
	want := strings.Replace(string(raw), "status: verify # note", "status: done", 1)
	if string(out) != want {
		t.Fatalf("output = %q, want %q", string(out), want)
	}
	if strings.Count(string(out), "status: verify") != 1 {
		t.Fatal("body status line was changed")
	}
}

func TestReplaceStatusCRLF(t *testing.T) {
	raw := []byte("---\r\nid: FEAT-1\r\ntype: feature\r\ntitle: T\r\nstatus: verify\r\n---\r\nBody\r\n")
	out, err := replaceStatus(raw, "done")
	if err != nil {
		t.Fatal(err)
	}
	want := strings.Replace(string(raw), "status: verify", "status: done", 1)
	if string(out) != want {
		t.Fatalf("output = %q, want %q", string(out), want)
	}
	if !strings.Contains(string(out), "status: done\r\n") {
		t.Fatal("CRLF was not preserved")
	}
}

func TestReplaceStatusErrors(t *testing.T) {
	if _, err := replaceStatus([]byte("no frontmatter"), "done"); err == nil || !strings.Contains(err.Error(), "no frontmatter") {
		t.Fatalf("error = %v", err)
	}
	raw := []byte("---\nid: FEAT-1\ntype: feature\ntitle: T\n---\n")
	if _, err := replaceStatus(raw, "done"); err == nil || !strings.Contains(err.Error(), "no status line") {
		t.Fatalf("error = %v", err)
	}
}

func TestSetStatusWritesAtomically(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	path := writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	if err := SetStatus(path, "FEAT-1", "todo", "done"); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	entity, err := ParseEntity("features/FEAT-1.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.Status != "done" {
		t.Fatalf("status = %q", entity.Status)
	}
	if entity.Body != "Body for FEAT-1\n" {
		t.Fatalf("body = %q", entity.Body)
	}
	matches, err := filepath.Glob(filepath.Join(filepath.Dir(path), ".factory-tmp-*"))
	if err != nil {
		t.Fatal(err)
	}
	if len(matches) != 0 {
		t.Fatalf("temp files left behind: %v", matches)
	}
}

func TestSetStatusRefusesMismatch(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	path := writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	if err := SetStatus(path, "FEAT-1", "verify", "done"); err == nil {
		t.Fatal("expected status mismatch")
	}
	if err := SetStatus(path, "FEAT-2", "todo", "done"); err == nil {
		t.Fatal("expected id mismatch")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	entity, err := ParseEntity("features/FEAT-1.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.Status != "todo" {
		t.Fatalf("status changed after refusal: %q", entity.Status)
	}
}

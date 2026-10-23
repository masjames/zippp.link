package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStoreInitialScan(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")

	diff, became := store.Rescan()
	if len(diff.Upserts) != 1 || diff.Upserts[0].ID != "FEAT-1" {
		t.Fatalf("upserts = %+v", diff.Upserts)
	}
	if len(became) != 0 {
		t.Fatalf("first scan became = %v", became)
	}
	if store.Count() != 1 {
		t.Fatalf("count = %d", store.Count())
	}
	snapshot := store.Snapshot()
	entities, ok := snapshot["entities"].([]*Entity)
	if !ok || len(entities) != 1 {
		t.Fatalf("snapshot entities = %+v", snapshot["entities"])
	}
	if _, ok := snapshot["errors"].([]ParseError); !ok {
		t.Fatalf("snapshot errors type = %T", snapshot["errors"])
	}
	if _, ok := snapshot["verifications"].(map[string]Result); !ok {
		t.Fatalf("snapshot verifications type = %T", snapshot["verifications"])
	}
}

func TestStoreChanges(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	pathB := writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-2.md", "FEAT-2", "todo", "Two")
	store.Rescan()

	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-3.md", "FEAT-3", "todo", "Three")
	diff, _ := store.Rescan()
	if len(diff.Upserts) != 1 || diff.Upserts[0].ID != "FEAT-3" {
		t.Fatalf("add upserts = %+v", diff.Upserts)
	}
	if len(diff.Removed) != 0 {
		t.Fatalf("add removed = %v", diff.Removed)
	}

	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One edited")
	diff, _ = store.Rescan()
	if len(diff.Upserts) != 1 || diff.Upserts[0].Title != "One edited" {
		t.Fatalf("edit upserts = %+v", diff.Upserts)
	}

	if err := os.Remove(pathB); err != nil {
		t.Fatal(err)
	}
	diff, _ = store.Rescan()
	if len(diff.Removed) != 1 || diff.Removed[0] != "FEAT-2" {
		t.Fatalf("remove = %v", diff.Removed)
	}

	diff, _ = store.Rescan()
	if diff.Changed || len(diff.Upserts) != 0 || len(diff.Removed) != 0 {
		t.Fatalf("unexpected change on stable scan: %+v", diff)
	}
	if store.Get("FEAT-1") == nil || store.Get("FEAT-2") != nil || store.Get("FEAT-3") == nil {
		t.Fatal("store state wrong")
	}
}

func TestStoreInvalidFile(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	store.Rescan()

	badPath := filepath.Join(cfg.EntitiesRoot, "features", "bad.md")
	if err := os.WriteFile(badPath, []byte("garbage\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	diff, _ := store.Rescan()
	if len(diff.Errors) != 1 || !strings.Contains(diff.Errors[0].Message, "missing frontmatter") {
		t.Fatalf("errors = %+v", diff.Errors)
	}
	if store.Get("FEAT-1") == nil {
		t.Fatal("valid entity was dropped")
	}
}

func TestStoreDuplicateID(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	writeEntityFile(t, cfg.EntitiesRoot, "features/a.md", "FEAT-9", "todo", "A")
	writeEntityFile(t, cfg.EntitiesRoot, "features/b.md", "FEAT-9", "todo", "B")

	diff, _ := store.Rescan()
	if len(diff.Upserts) != 1 {
		t.Fatalf("upserts = %+v", diff.Upserts)
	}
	if !strings.HasSuffix(diff.Upserts[0].Path, "features/a.md") {
		t.Fatalf("first path did not win: %q", diff.Upserts[0].Path)
	}
	if len(diff.Errors) != 1 || !strings.Contains(diff.Errors[0].Message, "duplicate id FEAT-9") {
		t.Fatalf("errors = %+v", diff.Errors)
	}
}

func TestStoreRenameIsUpsert(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	path := writeEntityFile(t, cfg.EntitiesRoot, "features/a.md", "FEAT-1", "todo", "One")
	store.Rescan()

	newPath := filepath.Join(cfg.EntitiesRoot, "features", "renamed.md")
	if err := os.Rename(path, newPath); err != nil {
		t.Fatal(err)
	}
	diff, _ := store.Rescan()
	if len(diff.Removed) != 0 {
		t.Fatalf("rename removed = %v", diff.Removed)
	}
	if len(diff.Upserts) != 1 || !strings.HasSuffix(diff.Upserts[0].Path, "features/renamed.md") {
		t.Fatalf("rename upserts = %+v", diff.Upserts)
	}
}

func TestStoreBecameVerify(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "verify", "One")

	_, became := store.Rescan()
	if len(became) != 0 {
		t.Fatalf("first scan became = %v", became)
	}

	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	if _, became = store.Rescan(); len(became) != 0 {
		t.Fatalf("todo became = %v", became)
	}
	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "verify", "One")
	if _, became = store.Rescan(); len(became) != 1 || became[0] != "FEAT-1" {
		t.Fatalf("verify became = %v", became)
	}

	writeEntityFile(t, cfg.EntitiesRoot, "features/FEAT-2.md", "FEAT-2", "verify", "Two")
	if _, became = store.Rescan(); len(became) != 1 || became[0] != "FEAT-2" {
		t.Fatalf("new verify became = %v", became)
	}
}

func TestStoreResults(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	store := NewStore(cfg)
	store.SetResult(Result{ID: "FEAT-1", Passed: true})
	results := store.Results()
	result, ok := results["FEAT-1"]
	if !ok || !result.Passed {
		t.Fatalf("results = %+v", results)
	}
	if result.Checks == nil {
		t.Fatal("checks should be non-nil")
	}
	snapshot := store.Snapshot()
	verifications := snapshot["verifications"].(map[string]Result)
	if !verifications["FEAT-1"].Passed {
		t.Fatal("snapshot result missing")
	}
}

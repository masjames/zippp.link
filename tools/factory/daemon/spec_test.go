package main

import (
	"strings"
	"testing"
)

func TestParseEntityValid(t *testing.T) {
	raw := []byte(`---
id: FEAT-1
type: feature
title: Valid entity
status: todo
assignee: adit
relations:
  blocks: [BUG-2]
  implements: []
  depends_on: [FEAT-0]
verification:
  target_files: [src/a.ts]
  test_command: "node ok.js"
  prod_endpoint: ""
---
Body line
`)
	entity, err := ParseEntity("features/FEAT-1.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.ID != "FEAT-1" || entity.Type != "feature" || entity.Title != "Valid entity" || entity.Status != "todo" {
		t.Fatalf("unexpected entity: %+v", entity)
	}
	if entity.Path != "features/FEAT-1.md" {
		t.Fatalf("path = %q", entity.Path)
	}
	if entity.Body != "Body line\n" {
		t.Fatalf("body = %q", entity.Body)
	}
	if len(entity.Hash) != 12 {
		t.Fatalf("hash = %q", entity.Hash)
	}
	if len(entity.Relations.Blocks) != 1 || entity.Relations.Blocks[0] != "BUG-2" {
		t.Fatalf("relations = %+v", entity.Relations)
	}
	if len(entity.Verification.TargetFiles) != 1 || entity.Verification.TargetFiles[0] != "src/a.ts" {
		t.Fatalf("verification = %+v", entity.Verification)
	}
}

func TestParseEntityCRLF(t *testing.T) {
	raw := []byte("---\r\nid: FEAT-2\r\ntype: bug\r\ntitle: CRLF\r\nstatus: done\r\n---\r\nBody\r\n")
	entity, err := ParseEntity("bugs/FEAT-2.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.Status != "done" {
		t.Fatalf("status = %q", entity.Status)
	}
	if !strings.Contains(entity.Body, "Body\r\n") {
		t.Fatalf("body = %q", entity.Body)
	}
}

func TestParseEntityErrors(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want string
	}{
		{"no frontmatter", "id: FEAT-1\n", "missing frontmatter"},
		{"bad yaml", "---\nid: [\n---\n", "yaml"},
		{"bad type", "---\nid: FEAT-1\ntype: task\ntitle: T\nstatus: todo\n---\n", "invalid type"},
		{"bad status", "---\nid: FEAT-1\ntype: feature\ntitle: T\nstatus: open\n---\n", "invalid status"},
		{"bad id", "---\nid: feat-1\ntype: feature\ntitle: T\nstatus: todo\n---\n", "invalid id"},
		{"empty title", "---\nid: FEAT-1\ntype: feature\ntitle: \"\"\nstatus: todo\n---\n", "title is required"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseEntity("features/FEAT-1.md", []byte(tc.raw))
			if err == nil {
				t.Fatal("expected error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %q, want %q", err.Error(), tc.want)
			}
		})
	}
}

func TestParseEntityNullRelations(t *testing.T) {
	raw := []byte(`---
id: FEAT-3
type: feature
title: Nulls
status: todo
relations:
verification:
---
`)
	entity, err := ParseEntity("features/FEAT-3.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.Relations.Blocks == nil || entity.Relations.Implements == nil || entity.Relations.DependsOn == nil {
		t.Fatalf("nil relation slices: %+v", entity.Relations)
	}
	if entity.Verification.TargetFiles == nil {
		t.Fatal("nil target_files")
	}
}

func TestParseEntityBodyPreserved(t *testing.T) {
	raw := []byte("---\nid: FEAT-4\ntype: story\ntitle: Body\nstatus: blocked\n---\n# Head\n\nstatus: todo\n\nTail\n")
	entity, err := ParseEntity("stories/FEAT-4.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	want := "# Head\n\nstatus: todo\n\nTail\n"
	if entity.Body != want {
		t.Fatalf("body = %q, want %q", entity.Body, want)
	}
}

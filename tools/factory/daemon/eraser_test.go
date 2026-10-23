package main

import (
	"strings"
	"testing"
)

func TestExtractEraserBlocks(t *testing.T) {
	body := "intro\n```eraser\na {\n  id uuid\n}\n```\nmid\n```eraser\nb {\n}\n```\n"
	blocks := ExtractEraserBlocks(body)
	if len(blocks) != 2 {
		t.Fatalf("blocks = %d", len(blocks))
	}
	if !strings.Contains(blocks[0], "a {") || !strings.Contains(blocks[1], "b {") {
		t.Fatalf("blocks = %+v", blocks)
	}
	if blocks := ExtractEraserBlocks("```eraser\na {\n}\n"); len(blocks) != 0 {
		t.Fatalf("unclosed block should be ignored: %+v", blocks)
	}
}

func TestParseERDEntities(t *testing.T) {
	block := "a [group] {\n  id uuid pk\n  name string\n  // note\n}\nb {\n}\n"
	entities := ParseERDEntities(block)
	if len(entities) != 2 {
		t.Fatalf("entities = %+v", entities)
	}
	if entities[0].Name != "a" || len(entities[0].Fields) != 2 {
		t.Fatalf("entity = %+v", entities[0])
	}
	if entities[0].Fields[0] != "id" || entities[0].Fields[1] != "name" {
		t.Fatalf("fields = %+v", entities[0].Fields)
	}
}

func TestERDEntitiesFromBody(t *testing.T) {
	body := "```eraser\na {\n  id uuid\n}\n```\n\n```eraser\nb {\n  id uuid\n}\n```\n"
	entities := ERDEntitiesFromBody(body)
	if len(entities) != 2 || entities[0].Name != "a" || entities[1].Name != "b" {
		t.Fatalf("entities = %+v", entities)
	}
}

func TestNorm(t *testing.T) {
	cases := map[string]string{
		"line_items": "lineitem",
		"LineItem":   "lineitem",
		"categories": "category",
		"address":    "address",
		"items":      "item",
	}
	for input, want := range cases {
		if got := norm(input); got != want {
			t.Fatalf("norm(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestTraceMarker(t *testing.T) {
	cases := []struct {
		content string
		id      string
		want    bool
	}{
		{"// @implements FEAT-1", "FEAT-1", true},
		{"// @implements FEAT-12", "FEAT-1", false},
		{"// @implements BUG-1, FEAT-1", "FEAT-1", true},
		{"// @implements FEAT-1,FEAT-2", "FEAT-2", true},
		{"// nothing", "FEAT-1", false},
	}
	for _, tc := range cases {
		if got := hasTraceMarker(tc.content, tc.id); got != tc.want {
			t.Fatalf("hasTraceMarker(%q, %q) = %v", tc.content, tc.id, got)
		}
	}
}

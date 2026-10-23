package main

import (
	"strings"
	"testing"
)

func TestReadThreadMissing(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	thread, err := ReadThread(cfg, "FEAT-1")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(thread, "# Grooming thread: FEAT-1") {
		t.Fatalf("thread = %q", thread)
	}
}

func TestAppendThread(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	if _, err := AppendThread(cfg, "FEAT-1", "user", "hello"); err != nil {
		t.Fatal(err)
	}
	thread, err := ReadThread(cfg, "FEAT-1")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(thread, "## user") || !strings.Contains(thread, "hello") {
		t.Fatalf("thread = %q", thread)
	}
	thread, err = AppendThread(cfg, "FEAT-1", "assistant", "DECISION: use magic link\nNext question")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(thread, "## assistant") || !strings.Contains(thread, "## decision") {
		t.Fatalf("thread = %q", thread)
	}
	if !strings.Contains(thread, "use magic link") {
		t.Fatalf("decision not recorded: %q", thread)
	}
}

func TestAppendThreadRejectsEmpty(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	if _, err := AppendThread(cfg, "FEAT-1", "user", "   "); err == nil {
		t.Fatal("expected empty message error")
	}
}

func TestThreadPathRejectsInvalidID(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	if _, err := ReadThread(cfg, "not an id"); err == nil {
		t.Fatal("expected invalid id error")
	}
}

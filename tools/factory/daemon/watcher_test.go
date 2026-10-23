package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWatcherFires(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "sub"), 0o755); err != nil {
		t.Fatal(err)
	}
	events := make(chan struct{}, 16)
	watcher, err := NewWatcher(root, 50*time.Millisecond, func() {
		select {
		case events <- struct{}{}:
		default:
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	defer watcher.Close()

	if err := os.WriteFile(filepath.Join(root, "sub", "a.md"), []byte("a"), 0o644); err != nil {
		t.Fatal(err)
	}
	waitEvent(t, events)

	drain(events)
	if err := os.Mkdir(filepath.Join(root, "newdir"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "newdir", "b.md"), []byte("b"), 0o644); err != nil {
		t.Fatal(err)
	}
	waitEvent(t, events)

	drain(events)
	if err := os.WriteFile(filepath.Join(root, "sub", ".save.tmp"), []byte("c"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Rename(filepath.Join(root, "sub", ".save.tmp"), filepath.Join(root, "sub", "c.md")); err != nil {
		t.Fatal(err)
	}
	waitEvent(t, events)

	drain(events)
	if err := os.WriteFile(filepath.Join(root, ".hidden"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	select {
	case <-events:
		t.Fatal("dotfile event should be ignored")
	case <-time.After(500 * time.Millisecond):
	}
}

func waitEvent(t *testing.T, events <-chan struct{}) {
	t.Helper()
	select {
	case <-events:
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for watcher event")
	}
}

func drain(events <-chan struct{}) {
	for {
		select {
		case <-events:
		default:
			return
		}
	}
}

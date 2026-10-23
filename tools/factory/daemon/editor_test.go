package main

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"
)

func TestOpenInEditorMissingSocket(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	called := false
	run := func(ctx context.Context, name string, args ...string) ([]byte, error) {
		called = true
		return nil, nil
	}
	if _, err := OpenInEditor(context.Background(), cfg, run, "/tmp/file.md"); err == nil {
		t.Fatal("expected missing socket error")
	} else if !strings.Contains(err.Error(), "start nvim with: nvim --listen") {
		t.Fatalf("error = %q", err.Error())
	}
	if called {
		t.Fatal("runner should not be called")
	}
}

func TestOpenInEditorArgvAndFocus(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	if err := os.WriteFile(cfg.Editor.NvimServer, []byte{}, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg.Editor.FocusCommand = []string{"focus", "pane"}
	var calls [][]string
	run := func(ctx context.Context, name string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{name}, args...))
		return nil, nil
	}

	message, err := OpenInEditor(context.Background(), cfg, run, "/repo/file.md")
	if err != nil {
		t.Fatal(err)
	}
	if len(calls) != 2 {
		t.Fatalf("calls = %+v", calls)
	}
	wantFirst := []string{"nvim", "--server", cfg.Editor.NvimServer, "--remote", "/repo/file.md"}
	if !slices.Equal(calls[0], wantFirst) {
		t.Fatalf("nvim argv = %v", calls[0])
	}
	if !slices.Equal(calls[1], []string{"focus", "pane"}) {
		t.Fatalf("focus argv = %v", calls[1])
	}
	if !strings.Contains(message, "opened /repo/file.md") {
		t.Fatalf("message = %q", message)
	}
}

func TestOpenInEditorFocusWarning(t *testing.T) {
	cfg := writeTestConfig(t, nil)
	if err := os.WriteFile(cfg.Editor.NvimServer, []byte{}, 0o644); err != nil {
		t.Fatal(err)
	}
	cfg.Editor.FocusCommand = []string{"focus"}
	run := func(ctx context.Context, name string, args ...string) ([]byte, error) {
		if name == "focus" {
			return nil, errors.New("no pane")
		}
		return nil, nil
	}
	message, err := OpenInEditor(context.Background(), cfg, run, "/repo/file.md")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(message, "focus command failed: no pane") {
		t.Fatalf("message = %q", message)
	}
}

func TestHubEditUnknownID(t *testing.T) {
	app, _, wsURL := newTestApp(t)
	called := false
	app.editorRunner = func(ctx context.Context, name string, args ...string) ([]byte, error) {
		called = true
		return nil, nil
	}
	conn := dialWS(t, wsURL, nil)
	readWS(t, conn)
	if err := conn.WriteJSON(map[string]string{"type": "edit", "id": "NOPE-1"}); err != nil {
		t.Fatal(err)
	}
	message := readWS(t, conn)
	if message.Type != "error" || !strings.Contains(message.Message, "unknown entity") {
		t.Fatalf("message = %+v", message)
	}
	if called {
		t.Fatal("runner should not be called for an unknown id")
	}
}

func TestHubEditUsesIndexedPath(t *testing.T) {
	app, _, wsURL := newTestApp(t)
	writeEntityFile(t, app.cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	if err := os.WriteFile(app.cfg.Editor.NvimServer, []byte{}, 0o644); err != nil {
		t.Fatal(err)
	}
	var calls [][]string
	app.editorRunner = func(ctx context.Context, name string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{name}, args...))
		return nil, nil
	}
	conn := dialWS(t, wsURL, nil)
	readWS(t, conn)
	waitForWS(t, conn, 5*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertTitle(message.Upserts, "FEAT-1") == "One"
	})

	if err := conn.WriteJSON(map[string]string{"type": "edit", "id": "FEAT-1"}); err != nil {
		t.Fatal(err)
	}
	message := readWS(t, conn)
	if message.Type != "editor_result" || !message.OK {
		t.Fatalf("message = %+v", message)
	}
	wantPath := filepath.Join(app.cfg.RepoRoot, "entities", "features", "FEAT-1.md")
	want := []string{"nvim", "--server", app.cfg.Editor.NvimServer, "--remote", wantPath}
	if len(calls) != 1 || !slices.Equal(calls[0], want) {
		t.Fatalf("calls = %+v, want %v", calls, want)
	}
}

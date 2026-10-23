package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestIntegrationDiffLifecycle(t *testing.T) {
	app, _, wsURL := newTestApp(t)
	conn := dialWS(t, wsURL, nil)
	if first := readWS(t, conn); first.Type != "snapshot" {
		t.Fatalf("first message = %q", first.Type)
	}

	path := writeEntityFile(t, app.cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One")
	waitForWS(t, conn, 5*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertTitle(message.Upserts, "FEAT-1") == "One"
	})

	writeEntityFile(t, app.cfg.EntitiesRoot, "features/FEAT-1.md", "FEAT-1", "todo", "One edited")
	waitForWS(t, conn, 5*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertTitle(message.Upserts, "FEAT-1") == "One edited"
	})

	if err := os.Remove(path); err != nil {
		t.Fatal(err)
	}
	waitForWS(t, conn, 5*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && contains(message.Removed, "FEAT-1")
	})

	badPath := filepath.Join(app.cfg.EntitiesRoot, "features", "bad.md")
	if err := os.WriteFile(badPath, []byte("garbage\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	waitForWS(t, conn, 5*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && len(message.Errors) > 0
	})
}

func waitForWS(t *testing.T, conn *websocket.Conn, timeout time.Duration, predicate func(wsMessage) bool) wsMessage {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for {
		if err := conn.SetReadDeadline(deadline); err != nil {
			t.Fatal(err)
		}
		var message wsMessage
		if err := conn.ReadJSON(&message); err != nil {
			t.Fatalf("waiting for message: %v", err)
		}
		if predicate(message) {
			return message
		}
	}
}

func upsertTitle(upserts []map[string]any, id string) string {
	for _, upsert := range upserts {
		if upsert["id"] == id {
			title, _ := upsert["title"].(string)
			return title
		}
	}
	return ""
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}

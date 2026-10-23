package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

type wsMessage struct {
	Type          string           `json:"type"`
	Seq           int64            `json:"seq"`
	Entities      []map[string]any `json:"entities"`
	Errors        []map[string]any `json:"errors"`
	Verifications map[string]any   `json:"verifications"`
	Upserts       []map[string]any `json:"upserts"`
	Removed       []string         `json:"removed"`
	ID            string           `json:"id"`
	Message       string           `json:"message"`
	OK            bool             `json:"ok"`
	Result        map[string]any   `json:"result"`
}

func writeConfigFile(t *testing.T, mutate func(map[string]any)) string {
	t.Helper()
	root := t.TempDir()
	value := map[string]any{
		"repo_root":       ".",
		"entities_root":   "entities",
		"listen":          "127.0.0.1:0",
		"allowed_origins": []string{"http://localhost:5173"},
		"verify": map[string]any{
			"timeout_seconds":      120,
			"http_timeout_seconds": 10,
			"max_output_bytes":     65536,
			"allowed_commands":     []string{"node"},
		},
		"editor": map[string]any{
			"nvim_server":   filepath.Join(root, "nvim.sock"),
			"focus_command": []string{},
		},
		"reports_dir": "reports",
	}
	if mutate != nil {
		mutate(value)
	}
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, "factory.config.json")
	if err := os.WriteFile(path, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func writeTestConfig(t *testing.T, mutate func(map[string]any)) *Config {
	t.Helper()
	path := writeConfigFile(t, mutate)
	cfg, err := LoadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	return cfg
}

func newTestApp(t *testing.T) (*App, *httptest.Server, string) {
	t.Helper()
	cfg := writeTestConfig(t, nil)
	app, err := NewApp(cfg)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	app.Start(ctx)
	server := httptest.NewServer(app.Handler())
	t.Cleanup(func() {
		cancel()
		server.Close()
		app.Close()
	})
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	return app, server, wsURL
}

func dialWS(t *testing.T, url string, header http.Header) *websocket.Conn {
	t.Helper()
	conn, _, err := websocket.DefaultDialer.Dial(url, header)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn
}

func readWS(t *testing.T, conn *websocket.Conn) wsMessage {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	var message wsMessage
	if err := conn.ReadJSON(&message); err != nil {
		t.Fatal(err)
	}
	return message
}

func emptyDiff() map[string]any {
	return map[string]any{
		"upserts": []any{},
		"removed": []string{},
		"errors":  []any{},
	}
}

func writeEntityFile(t *testing.T, root, rel, id, status, title string) string {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	raw := fmt.Sprintf(`---
id: %s
type: feature
title: %s
status: %s
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---
Body for %s
`, id, title, status, id)
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

package main

import (
	"context"
	"fmt"
	"net"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func TestE2EVerifyLifecycle(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node not found")
	}
	cfg := writeTestConfig(t, nil)
	writeRepoFile(t, cfg, "testdata/trace-target.ts", "// @implements FEAT-900\nexport interface SelftestEntity { id: string; title: string }\n")
	writeRepoFile(t, cfg, "testdata/ok.js", "process.exit(0)\n")

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
	conn := dialWS(t, wsURL, nil)
	readWS(t, conn)

	erd := "```eraser\nselftest_entities {\n  id string pk\n  title string\n}\n```\n"
	path := writeE2EEntity(t, cfg, "features/FEAT-900.md", "FEAT-900", "todo", "testdata/trace-target.ts", "node testdata/ok.js", server.URL+"/healthz", erd)
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertStatus(message.Upserts, "FEAT-900") == "todo"
	})

	rewriteEntityStatus(t, path, "todo", "verify")
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertStatus(message.Upserts, "FEAT-900") == "verify"
	})
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification_started" && message.ID == "FEAT-900"
	})
	verification := waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification" && resultID(message.Result) == "FEAT-900"
	})
	if passed, _ := verification.Result["passed"].(bool); !passed {
		t.Fatalf("positive verification failed: %+v", verification.Result)
	}
	statuses := checkStatuses(verification.Result)
	for _, name := range []string{"static", "model", "test", "prod"} {
		if statuses[name] != "pass" {
			t.Fatalf("check %s = %q; all=%v", name, statuses[name], statuses)
		}
	}
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertStatus(message.Upserts, "FEAT-900") == "done"
	})
	assertEntityStatus(t, path, "FEAT-900", "done")

	writeRepoFile(t, cfg, "testdata/bad-target.ts", "// no marker\n")
	badPath := writeE2EEntity(t, cfg, "features/FEAT-901.md", "FEAT-901", "verify", "testdata/bad-target.ts", "", "", "")
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertStatus(message.Upserts, "FEAT-901") == "verify"
	})
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification_started" && message.ID == "FEAT-901"
	})
	badVerification := waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification" && resultID(message.Result) == "FEAT-901"
	})
	if passed, _ := badVerification.Result["passed"].(bool); passed {
		t.Fatalf("negative verification passed: %+v", badVerification.Result)
	}
	if status := checkStatuses(badVerification.Result)["static"]; status != "fail" {
		t.Fatalf("negative static = %q", status)
	}
	assertEntityStatus(t, badPath, "FEAT-901", "verify")
	expectNoVerification(t, conn, "FEAT-901", 2*time.Second)
	// A read timeout corrupts the gorilla connection, so reconnect before the
	// manual verify step.
	conn.Close()
	conn = dialWS(t, wsURL, nil)
	readWS(t, conn)

	writeRepoFile(t, cfg, "testdata/bad-target.ts", "// @implements FEAT-901\n")
	if err := conn.WriteJSON(map[string]string{"type": "verify", "id": "FEAT-901"}); err != nil {
		t.Fatal(err)
	}
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification_started" && message.ID == "FEAT-901"
	})
	fixed := waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "verification" && resultID(message.Result) == "FEAT-901"
	})
	if passed, _ := fixed.Result["passed"].(bool); !passed {
		t.Fatalf("fixed verification failed: %+v", fixed.Result)
	}
	waitForWS(t, conn, 10*time.Second, func(message wsMessage) bool {
		return message.Type == "diff" && upsertStatus(message.Upserts, "FEAT-901") == "done"
	})
	assertEntityStatus(t, badPath, "FEAT-901", "done")
}

func writeE2EEntity(t *testing.T, cfg *Config, rel, id, status, target, testCommand, prodEndpoint, body string) string {
	t.Helper()
	verification := fmt.Sprintf("  target_files: [%q]\n  test_command: %q\n  prod_endpoint: %q", target, testCommand, prodEndpoint)
	return writeRawEntityFile(t, cfg, rel, id, status, verification, body)
}

func rewriteEntityStatus(t *testing.T, path, from, to string) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	next, err := replaceStatus(raw, to)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, next, 0o644); err != nil {
		t.Fatal(err)
	}
}

func assertEntityStatus(t *testing.T, path, id, want string) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	entity, err := ParseEntity("", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.ID != id || entity.Status != want {
		t.Fatalf("entity = %s %s, want %s %s", entity.ID, entity.Status, id, want)
	}
}

func upsertStatus(upserts []map[string]any, id string) string {
	for _, upsert := range upserts {
		if upsert["id"] == id {
			status, _ := upsert["status"].(string)
			return status
		}
	}
	return ""
}

func resultID(result map[string]any) string {
	id, _ := result["id"].(string)
	return id
}

func checkStatuses(result map[string]any) map[string]string {
	statuses := map[string]string{}
	checks, _ := result["checks"].([]any)
	for _, item := range checks {
		check, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name, _ := check["name"].(string)
		status, _ := check["status"].(string)
		statuses[name] = status
	}
	return statuses
}

func expectNoVerification(t *testing.T, conn interface {
	SetReadDeadline(time.Time) error
	ReadJSON(any) error
}, id string, window time.Duration) {
	t.Helper()
	deadline := time.Now().Add(window)
	for {
		if err := conn.SetReadDeadline(deadline); err != nil {
			t.Fatal(err)
		}
		var message wsMessage
		if err := conn.ReadJSON(&message); err != nil {
			if netError, ok := err.(net.Error); ok && netError.Timeout() {
				return
			}
			t.Fatalf("read while waiting for silence: %v", err)
		}
		if message.Type == "verification_started" && message.ID == id {
			t.Fatalf("unexpected retrigger for %s", id)
		}
		if message.Type == "verification" && resultID(message.Result) == id {
			t.Fatalf("unexpected verification retrigger for %s", id)
		}
	}
}

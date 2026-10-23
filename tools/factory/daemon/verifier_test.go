package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestVerifier(t *testing.T, mutate func(map[string]any)) (*Verifier, *Config, *Store, *[]string) {
	t.Helper()
	cfg := writeTestConfig(t, mutate)
	store := NewStore(cfg)
	events := []string{}
	verifier := NewVerifier(cfg, store, func(typ string, fields map[string]any) {
		events = append(events, typ)
	})
	t.Cleanup(verifier.Close)
	return verifier, cfg, store, &events
}

func testVerifyEntity(id string, files []string, testCommand, prodEndpoint, body string) *Entity {
	if files == nil {
		files = []string{}
	}
	return &Entity{
		ID:           id,
		Type:         "feature",
		Title:        "Test",
		Status:       "verify",
		Relations:    Relations{Blocks: []string{}, Implements: []string{}, DependsOn: []string{}},
		Verification: Verification{TargetFiles: files, TestCommand: testCommand, ProdEndpoint: prodEndpoint},
		Body:         body,
	}
}

func checkByName(result Result, name string) CheckResult {
	for _, check := range result.Checks {
		if check.Name == name {
			return check
		}
	}
	return CheckResult{}
}

func TestVerifierStaticMarker(t *testing.T) {
	verifier, cfg, _, _ := newTestVerifier(t, nil)
	cases := []struct {
		name    string
		content string
		id      string
		want    string
	}{
		{"present", "// @implements FEAT-1\n", "FEAT-1", "pass"},
		{"missing", "// nothing\n", "FEAT-1", "fail"},
		{"other id", "// @implements FEAT-2\n", "FEAT-1", "fail"},
		{"prefix", "// @implements FEAT-12\n", "FEAT-1", "fail"},
		{"comma list", "// @implements BUG-1, FEAT-1\n", "FEAT-1", "pass"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			writeRepoFile(t, cfg, "src/a.ts", tc.content)
			result := verifier.VerifyNow(context.Background(), testVerifyEntity(tc.id, []string{"src/a.ts"}, "", "", ""))
			if got := checkByName(result, "static").Status; got != tc.want {
				t.Fatalf("static = %q, want %q; detail=%q", got, tc.want, checkByName(result, "static").Detail)
			}
			if result.Passed != (tc.want == "pass") {
				t.Fatalf("overall passed = %v", result.Passed)
			}
		})
	}
}

func TestVerifierStaticFailureSkipsLaterChecks(t *testing.T) {
	verifier, cfg, _, _ := newTestVerifier(t, nil)
	writeRepoFile(t, cfg, "src/a.ts", "// nothing\n")
	result := verifier.VerifyNow(context.Background(), testVerifyEntity(
		"FEAT-1",
		[]string{"src/a.ts"},
		`node -e "process.exit(0)"`,
		"http://127.0.0.1:1/x",
		"",
	))
	if checkByName(result, "static").Status != "fail" {
		t.Fatalf("static = %+v", checkByName(result, "static"))
	}
	if checkByName(result, "test").Status != "skip" || checkByName(result, "prod").Status != "skip" {
		t.Fatalf("later checks were not skipped: %+v", result.Checks)
	}
	if result.Passed {
		t.Fatal("overall should fail")
	}
}

func TestVerifierPathSafety(t *testing.T) {
	verifier, _, _, _ := newTestVerifier(t, nil)
	cases := []struct {
		target string
		detail string
	}{
		{"../../etc/passwd", "path escapes repo"},
		{"/etc/passwd", "absolute target path"},
		{"src/missing.ts", "missing target file"},
	}
	for _, tc := range cases {
		result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", []string{tc.target}, "", "", ""))
		check := checkByName(result, "static")
		if check.Status != "fail" || !strings.Contains(check.Detail, tc.detail) {
			t.Fatalf("target %q: %+v", tc.target, check)
		}
	}
}

func TestVerifierModel(t *testing.T) {
	verifier, cfg, _, _ := newTestVerifier(t, nil)
	writeRepoFile(t, cfg, "src/a.ts", "// @implements FEAT-1\ninterface LineItem { id: string; amount: number }\n")
	erd := "```eraser\nline_items {\n  id uuid pk\n  amount number\n}\n```\n"

	result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", []string{"src/a.ts"}, "", "", erd))
	if checkByName(result, "model").Status != "pass" || !result.Passed {
		t.Fatalf("model = %+v, passed = %v", checkByName(result, "model"), result.Passed)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", []string{"src/a.ts"}, "", "", "```eraser\norders {\n  id uuid\n}\n```\n"))
	if checkByName(result, "model").Status != "fail" || result.Passed {
		t.Fatalf("missing entity: %+v", result)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", []string{"src/a.ts"}, "", "", "```eraser\nline_items {\n  missing_field\n}\n```\n"))
	if checkByName(result, "model").Status != "fail" {
		t.Fatalf("missing field: %+v", result)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "", "", erd))
	check := checkByName(result, "model")
	if check.Status != "fail" || !strings.Contains(check.Detail, "ERD defined but no target_files") {
		t.Fatalf("no target files: %+v", check)
	}
}

func TestVerifierModelLanguages(t *testing.T) {
	verifier, cfg, _, _ := newTestVerifier(t, nil)
	cases := []struct {
		name string
		code string
	}{
		{"typescript", "// @implements FEAT-1\ninterface LineItem { id: string }\n"},
		{"kotlin", "// @implements FEAT-1\ndata class LineItem(val id: String)\n"},
		{"go", "// @implements FEAT-1\ntype LineItem struct { ID string }\n"},
		{"prisma", "// @implements FEAT-1\nmodel LineItem {\n  id String\n}\n"},
	}
	erd := "```eraser\nline_items {\n  id uuid\n}\n```\n"
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			writeRepoFile(t, cfg, "src/line."+tc.name, tc.code)
			result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", []string{"src/line." + tc.name}, "", "", erd))
			if checkByName(result, "model").Status != "pass" || !result.Passed {
				t.Fatalf("model = %+v, passed = %v", checkByName(result, "model"), result.Passed)
			}
		})
	}
}

func TestVerifierTestCommand(t *testing.T) {
	verifier, _, _, _ := newTestVerifier(t, nil)

	result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, `node -e "process.exit(0)"`, "", ""))
	if checkByName(result, "test").Status != "pass" || !result.Passed {
		t.Fatalf("pass case: %+v", result)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, `node -e "console.error('boom'), process.exit(3)"`, "", ""))
	check := checkByName(result, "test")
	if check.Status != "fail" || !strings.Contains(check.Output, "boom") {
		t.Fatalf("exit case: %+v", check)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "rm -rf x", "", ""))
	if check := checkByName(result, "test"); check.Status != "fail" || !strings.Contains(check.Detail, "command not allowed") {
		t.Fatalf("allowlist case: %+v", check)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "echo hi; rm x", "", ""))
	if check := checkByName(result, "test"); check.Status != "fail" || !strings.Contains(check.Detail, "shell operators") {
		t.Fatalf("shell case: %+v", check)
	}
}

func TestVerifierTestTimeout(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node not found")
	}
	verifier, _, _, _ := newTestVerifier(t, func(value map[string]any) {
		value["verify"].(map[string]any)["timeout_seconds"] = 1
	})
	result := verifier.VerifyNow(context.Background(), testVerifyEntity(
		"FEAT-1",
		nil,
		`node -e "setTimeout(function(){},5000)"`,
		"",
		"",
	))
	check := checkByName(result, "test")
	if check.Status != "fail" || !strings.Contains(check.Detail, "timed out") {
		t.Fatalf("timeout case: %+v", check)
	}
}

func TestVerifierProd(t *testing.T) {
	verifier, _, _, _ := newTestVerifier(t, nil)
	cases := []struct {
		name   string
		status int
		body   string
		want   string
	}{
		{"ok true", 200, `{"ok":true}`, "pass"},
		{"plain text", 200, "hello", "pass"},
		{"ok false", 200, `{"ok":false}`, "fail"},
		{"server error", 500, `{"ok":true}`, "fail"},
		{"not found", 404, "", "fail"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "", server.URL, ""))
			if got := checkByName(result, "prod").Status; got != tc.want {
				t.Fatalf("prod = %q, want %q", got, tc.want)
			}
			if result.Passed != (tc.want == "pass") {
				t.Fatalf("overall passed = %v", result.Passed)
			}
		})
	}

	result := verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "", "file:///etc/passwd", ""))
	if checkByName(result, "prod").Status != "fail" {
		t.Fatalf("file scheme should fail: %+v", result)
	}

	result = verifier.VerifyNow(context.Background(), testVerifyEntity("FEAT-1", nil, "", "", ""))
	if result.Passed || result.Message != "nothing to verify" {
		t.Fatalf("empty verification: %+v", result)
	}
}

func TestVerifierProcessPass(t *testing.T) {
	verifier, cfg, store, events := newTestVerifier(t, nil)
	writeRepoFile(t, cfg, "src/a.ts", "// @implements FEAT-1\ninterface LineItem { id: string }\n")
	erd := "```eraser\nline_items {\n  id uuid\n}\n```\n"
	path := writeRawEntityFile(t, cfg, "features/FEAT-1.md", "FEAT-1", "verify", `  target_files: ["src/a.ts"]
  test_command: ""
  prod_endpoint: ""`, erd)
	store.Rescan()
	original, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	verifier.process(context.Background(), "FEAT-1")

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
	want, err := replaceStatus(original, "done")
	if err != nil {
		t.Fatal(err)
	}
	if string(raw) != string(want) {
		t.Fatal("bytes other than the status line changed")
	}

	reportRaw, err := os.ReadFile(filepath.Join(cfg.ReportsDir, "FEAT-1.json"))
	if err != nil {
		t.Fatal(err)
	}
	var report Result
	if err := json.Unmarshal(reportRaw, &report); err != nil {
		t.Fatal(err)
	}
	if !report.Passed || !report.WroteStatus {
		t.Fatalf("report = %+v", report)
	}
	if len(*events) < 2 || (*events)[0] != "verification_started" || (*events)[1] != "verification" {
		t.Fatalf("events = %v", *events)
	}
}

func TestVerifierProcessFail(t *testing.T) {
	verifier, cfg, store, _ := newTestVerifier(t, nil)
	writeRepoFile(t, cfg, "src/a.ts", "// no marker\n")
	path := writeRawEntityFile(t, cfg, "features/FEAT-1.md", "FEAT-1", "verify", `  target_files: ["src/a.ts"]
  test_command: ""
  prod_endpoint: ""`, "")
	store.Rescan()

	verifier.process(context.Background(), "FEAT-1")

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	entity, err := ParseEntity("features/FEAT-1.md", raw)
	if err != nil {
		t.Fatal(err)
	}
	if entity.Status != "verify" {
		t.Fatalf("status = %q", entity.Status)
	}
	reportRaw, err := os.ReadFile(filepath.Join(cfg.ReportsDir, "FEAT-1.json"))
	if err != nil {
		t.Fatal(err)
	}
	var report Result
	if err := json.Unmarshal(reportRaw, &report); err != nil {
		t.Fatal(err)
	}
	if report.Passed || report.WroteStatus {
		t.Fatalf("report = %+v", report)
	}
}

func TestVerifierProcessDoesNotOverwriteHumanStatus(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node not found")
	}
	verifier, cfg, store, _ := newTestVerifier(t, nil)
	writeRepoFile(t, cfg, "src/a.ts", "// @implements FEAT-1\n")
	writeRepoFile(t, cfg, "slow.js", "const fs=require('fs'); fs.writeFileSync('started.txt','1'); setTimeout(function(){}, 2000);")
	path := writeRawEntityFile(t, cfg, "features/FEAT-1.md", "FEAT-1", "verify", `  target_files: ["src/a.ts"]
  test_command: "node slow.js"
  prod_endpoint: ""`, "")
	store.Rescan()

	done := make(chan struct{})
	go func() {
		verifier.process(context.Background(), "FEAT-1")
		close(done)
	}()

	deadline := time.Now().Add(5 * time.Second)
	for {
		if _, err := os.Stat(filepath.Join(cfg.RepoRoot, "started.txt")); err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("slow command did not start")
		}
		time.Sleep(20 * time.Millisecond)
	}
	if err := SetStatus(path, "FEAT-1", "verify", "todo"); err != nil {
		t.Fatal(err)
	}

	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("process did not finish")
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
		t.Fatalf("human status was overwritten: %q", entity.Status)
	}
	result := store.Results()["FEAT-1"]
	if result.WroteStatus {
		t.Fatalf("wrote_status should be false: %+v", result)
	}
}

func TestVerifierEnqueue(t *testing.T) {
	verifier, cfg, store, _ := newTestVerifier(t, nil)
	writeRawEntityFile(t, cfg, "features/FEAT-1.md", "FEAT-1", "todo", `  target_files: []
  test_command: ""
  prod_endpoint: ""`, "")
	store.Rescan()
	if err := verifier.Enqueue("FEAT-1"); err == nil {
		t.Fatal("todo entity should not enqueue")
	}
	if err := verifier.Enqueue("NOPE-1"); err == nil {
		t.Fatal("unknown entity should not enqueue")
	}

	writeRawEntityFile(t, cfg, "features/FEAT-1.md", "FEAT-1", "verify", `  target_files: []
  test_command: ""
  prod_endpoint: ""`, "")
	store.Rescan()
	if err := verifier.Enqueue("FEAT-1"); err != nil {
		t.Fatal(err)
	}
	if err := verifier.Enqueue("FEAT-1"); err != nil {
		t.Fatal(err)
	}
}

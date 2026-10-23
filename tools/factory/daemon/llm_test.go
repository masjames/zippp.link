package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestLLMChat(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		var body struct {
			Model    string        `json:"model"`
			Messages []chatMessage `json:"messages"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode: %v", err)
		}
		if body.Model != "test-model" || len(body.Messages) != 2 {
			t.Errorf("body = %+v", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"hello"}}]}`))
	}))
	defer server.Close()

	cfg := writeTestConfig(t, nil)
	cfg.LLM.BaseURL = server.URL
	cfg.LLM.Model = "test-model"
	cfg.LLM.APIKeyFile = filepath.Join(cfg.RepoRoot, "test-key")
	if err := os.WriteFile(cfg.LLM.APIKeyFile, []byte("test-key\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	reply, err := NewLLM(cfg).Chat(context.Background(), "system", "user")
	if err != nil {
		t.Fatal(err)
	}
	if reply != "hello" {
		t.Fatalf("reply = %q", reply)
	}
}

func TestLLMMissingKey(t *testing.T) {
	t.Setenv("ZIPPP_FACTORY_LLM_API_KEY", "")
	cfg := writeTestConfig(t, nil)
	cfg.LLM.APIKeyFile = filepath.Join(cfg.RepoRoot, "missing-key")
	if _, err := NewLLM(cfg).Chat(context.Background(), "system", "user"); err == nil {
		t.Fatal("expected missing key error")
	}
}

func TestLLMErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusBadGateway)
	}))
	defer server.Close()

	cfg := writeTestConfig(t, nil)
	cfg.LLM.BaseURL = server.URL
	cfg.LLM.Model = "test-model"
	cfg.LLM.APIKeyFile = filepath.Join(cfg.RepoRoot, "test-key")
	if err := os.WriteFile(cfg.LLM.APIKeyFile, []byte("test-key\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := NewLLM(cfg).Chat(context.Background(), "system", "user"); err == nil {
		t.Fatal("expected status error")
	}
}

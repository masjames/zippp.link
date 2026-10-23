package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type LLM struct {
	cfg    *Config
	client *http.Client
}

func NewLLM(cfg *Config) *LLM {
	return &LLM{
		cfg:    cfg,
		client: &http.Client{Timeout: time.Duration(cfg.LLM.TimeoutSeconds) * time.Second},
	}
}

func (l *LLM) apiKey() (string, error) {
	if key := strings.TrimSpace(os.Getenv("ZIPPP_FACTORY_LLM_API_KEY")); key != "" {
		return key, nil
	}
	raw, err := os.ReadFile(l.cfg.LLM.APIKeyFile)
	if err != nil {
		return "", fmt.Errorf("LLM key not configured at %s", l.cfg.LLM.APIKeyFile)
	}
	key := strings.TrimSpace(string(raw))
	if key == "" {
		return "", fmt.Errorf("LLM key is empty at %s", l.cfg.LLM.APIKeyFile)
	}
	return key, nil
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (l *LLM) Chat(ctx context.Context, system, user string) (string, error) {
	key, err := l.apiKey()
	if err != nil {
		return "", err
	}
	payload, err := json.Marshal(map[string]any{
		"model": l.cfg.LLM.Model,
		"messages": []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		"temperature": 0.2,
		"max_tokens":  1200,
		"stream":      false,
	})
	if err != nil {
		return "", err
	}
	endpoint := strings.TrimRight(l.cfg.LLM.BaseURL, "/") + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := l.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		if len(raw) > 500 {
			raw = raw[:500]
		}
		return "", fmt.Errorf("LLM request failed: %s: %s", resp.Status, strings.TrimSpace(string(raw)))
	}
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("LLM response parse: %w", err)
	}
	if parsed.Error != nil {
		return "", errors.New("LLM error: " + parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("LLM returned no choices")
	}
	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if content == "" {
		return "", errors.New("LLM returned an empty reply")
	}
	return content, nil
}

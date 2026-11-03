package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
)

// Config is the resolved factory configuration. Paths are absolute after load.
type Config struct {
	RepoRoot       string       `json:"repo_root"`
	EntitiesRoot   string       `json:"entities_root"`
	Listen         string       `json:"listen"`
	AllowedOrigins []string     `json:"allowed_origins"`
	Verify         VerifyConfig `json:"verify"`
	LLM            LLMConfig    `json:"llm"`
	Build          BuildConfig  `json:"build"`
	ReportsDir     string       `json:"reports_dir"`
}

type VerifyConfig struct {
	TimeoutSeconds     int      `json:"timeout_seconds"`
	HTTPTimeoutSeconds int      `json:"http_timeout_seconds"`
	MaxOutputBytes     int      `json:"max_output_bytes"`
	AllowedCommands    []string `json:"allowed_commands"`
}

type LLMConfig struct {
	BaseURL        string `json:"base_url"`
	Model          string `json:"model"`
	APIKeyFile     string `json:"api_key_file"`
	TimeoutSeconds int    `json:"timeout_seconds"`
}

func LoadConfig(path string) (*Config, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(absPath)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	base := filepath.Dir(absPath)
	cfg.RepoRoot, err = resolvePath(base, cfg.RepoRoot)
	if err != nil {
		return nil, err
	}
	cfg.EntitiesRoot, err = resolvePath(cfg.RepoRoot, cfg.EntitiesRoot)
	if err != nil {
		return nil, err
	}
	cfg.ReportsDir, err = resolvePath(cfg.RepoRoot, cfg.ReportsDir)
	if err != nil {
		return nil, err
	}
	if err := validateListen(cfg.Listen); err != nil {
		return nil, err
	}
	if cfg.Verify.TimeoutSeconds <= 0 {
		cfg.Verify.TimeoutSeconds = 120
	}
	if cfg.Verify.HTTPTimeoutSeconds <= 0 {
		cfg.Verify.HTTPTimeoutSeconds = 10
	}
	if cfg.Verify.MaxOutputBytes <= 0 {
		cfg.Verify.MaxOutputBytes = 65536
	}
	if cfg.LLM.BaseURL == "" {
		cfg.LLM.BaseURL = "https://api.deepseek.com"
	}
	if cfg.LLM.Model == "" {
		cfg.LLM.Model = "deepseek-chat"
	}
	if cfg.LLM.APIKeyFile == "" {
		cfg.LLM.APIKeyFile = ".factory-key"
	}
	cfg.LLM.APIKeyFile, err = resolvePath(base, cfg.LLM.APIKeyFile)
	if err != nil {
		return nil, err
	}
	if cfg.LLM.TimeoutSeconds <= 0 {
		cfg.LLM.TimeoutSeconds = 120
	}
	if cfg.AllowedOrigins == nil {
		cfg.AllowedOrigins = []string{}
	}
	if cfg.Verify.AllowedCommands == nil {
		cfg.Verify.AllowedCommands = []string{}
	}
	cfg.buildDefaults()
	// Default: spawn enabled. Opt out with "build": { "enabled": false }.
	if !jsonHasBuildEnabled(raw) {
		cfg.Build.Enabled = true
	}
	for _, dir := range []string{"features", "bugs", "stories", "diagrams", "direction", "decisions", "roadmap", "threads"} {
		if err := os.MkdirAll(filepath.Join(cfg.EntitiesRoot, dir), 0o755); err != nil {
			return nil, fmt.Errorf("create entity dir %s: %w", dir, err)
		}
	}
	return &cfg, nil
}

func resolvePath(base, value string) (string, error) {
	if value == "" {
		return "", errors.New("empty path in config")
	}
	if !filepath.IsAbs(value) {
		value = filepath.Join(base, value)
	}
	return filepath.Abs(value)
}

func jsonHasBuildEnabled(raw []byte) bool {
	var probe struct {
		Build *struct {
			Enabled *bool `json:"enabled"`
		} `json:"build"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return false
	}
	return probe.Build != nil && probe.Build.Enabled != nil
}

func validateListen(listen string) error {
	host, _, err := net.SplitHostPort(listen)
	if err != nil {
		return fmt.Errorf("invalid listen address %q: %w", listen, err)
	}
	host = strings.Trim(host, "[]")
	if host != "127.0.0.1" && host != "localhost" && host != "::1" {
		return fmt.Errorf("listen host must be loopback, got %q", host)
	}
	return nil
}

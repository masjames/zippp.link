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
	ReportsDir     string       `json:"reports_dir"`
}

type VerifyConfig struct {
	TimeoutSeconds     int      `json:"timeout_seconds"`
	HTTPTimeoutSeconds int      `json:"http_timeout_seconds"`
	MaxOutputBytes     int      `json:"max_output_bytes"`
	AllowedCommands    []string `json:"allowed_commands"`
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
	if cfg.AllowedOrigins == nil {
		cfg.AllowedOrigins = []string{}
	}
	if cfg.Verify.AllowedCommands == nil {
		cfg.Verify.AllowedCommands = []string{}
	}
	for _, dir := range []string{"features", "bugs", "stories", "diagrams"} {
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

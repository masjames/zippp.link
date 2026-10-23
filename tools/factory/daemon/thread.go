package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func threadPath(cfg *Config, id string) (string, error) {
	if !idRe.MatchString(id) {
		return "", errors.New("invalid entity id")
	}
	return filepath.Join(cfg.EntitiesRoot, "threads", id+".md"), nil
}

func ReadThread(cfg *Config, id string) (string, error) {
	path, err := threadPath(cfg, id)
	if err != nil {
		return "", err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "# Grooming thread: " + id + "\n\n", nil
		}
		return "", err
	}
	return string(raw), nil
}

func AppendThread(cfg *Config, id, role, text string) (string, error) {
	path, err := threadPath(cfg, id)
	if err != nil {
		return "", err
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return "", errors.New("empty message")
	}
	raw, err := os.ReadFile(path)
	var builder strings.Builder
	if err != nil {
		if !os.IsNotExist(err) {
			return "", err
		}
		builder.WriteString("# Grooming thread: " + id + "\n\n")
	} else {
		builder.Write(raw)
		existing := builder.String()
		if !strings.HasSuffix(existing, "\n\n") {
			if strings.HasSuffix(existing, "\n") {
				builder.WriteString("\n")
			} else {
				builder.WriteString("\n\n")
			}
		}
	}

	timestamp := time.Now().UTC().Format(time.RFC3339)
	builder.WriteString("## " + role + " " + timestamp + "\n\n")
	builder.WriteString(text + "\n\n")

	if role == "assistant" {
		for _, line := range strings.Split(text, "\n") {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "DECISION:") {
				decision := strings.TrimSpace(strings.TrimPrefix(trimmed, "DECISION:"))
				lower := strings.ToLower(decision)
				if decision != "" && !strings.HasPrefix(lower, "(pending") && !strings.HasPrefix(lower, "pending") {
					builder.WriteString("## decision " + timestamp + "\n\n")
					builder.WriteString(decision + "\n\n")
				}
			}
		}
	}

	out := []byte(builder.String())
	if err := writeFileAtomic(path, out, 0o644); err != nil {
		return "", err
	}
	return string(out), nil
}

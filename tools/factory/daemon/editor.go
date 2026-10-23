package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

func execRunner(ctx context.Context, name string, args ...string) ([]byte, error) {
	return exec.CommandContext(ctx, name, args...).CombinedOutput()
}

func OpenInEditor(ctx context.Context, cfg *Config, run Runner, absPath string) (string, error) {
	if _, err := os.Stat(cfg.Editor.NvimServer); err != nil {
		return "", fmt.Errorf(
			"nvim socket missing at %s; start nvim with: nvim --listen %s",
			cfg.Editor.NvimServer,
			cfg.Editor.NvimServer,
		)
	}
	runCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if _, err := run(runCtx, "nvim", "--server", cfg.Editor.NvimServer, "--remote", absPath); err != nil {
		return "", fmt.Errorf("open in nvim: %w", err)
	}
	message := "opened " + absPath
	if len(cfg.Editor.FocusCommand) > 0 {
		focusCtx, focusCancel := context.WithTimeout(ctx, 5*time.Second)
		defer focusCancel()
		if _, err := run(focusCtx, cfg.Editor.FocusCommand[0], cfg.Editor.FocusCommand[1:]...); err != nil {
			message += "; focus command failed: " + err.Error()
		}
	}
	return message, nil
}

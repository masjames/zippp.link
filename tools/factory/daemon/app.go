package main

import (
	"context"
	"sync"
	"time"
)

// App wires the config, hub, and watcher. Milestone 2 adds the store.
type App struct {
	cfg           *Config
	hub           *Hub
	watcher       *Watcher
	entityCountFn func() int
	startOnce     sync.Once
	closeOnce     sync.Once
}

func NewApp(cfg *Config) (*App, error) {
	a := &App{cfg: cfg}
	a.entityCountFn = func() int { return 1 }

	snapshotFn := func() map[string]any {
		return map[string]any{
			"entities": []map[string]any{
				{
					"id":       "FEAT-000",
					"type":     "feature",
					"title":    "Hello factory",
					"status":   "todo",
					"assignee": "",
					"relations": map[string]any{
						"blocks":     []string{},
						"implements": []string{},
						"depends_on": []string{},
					},
					"verification": map[string]any{
						"target_files":  []string{},
						"test_command":  "",
						"prod_endpoint": "",
					},
					"path": "",
					"body": "",
					"hash": "",
				},
			},
			"errors":        []any{},
			"verifications": map[string]any{},
		}
	}

	a.hub = NewHub(snapshotFn, cfg.AllowedOrigins)
	onChange := func() {
		a.hub.Broadcast("diff", map[string]any{
			"upserts": []any{},
			"removed": []string{},
			"errors":  []any{},
		})
	}
	watcher, err := NewWatcher(cfg.EntitiesRoot, 150*time.Millisecond, onChange)
	if err != nil {
		a.hub.Close()
		return nil, err
	}
	a.watcher = watcher
	return a, nil
}

func (a *App) Start(ctx context.Context) {
	a.startOnce.Do(func() {
		go func() {
			<-ctx.Done()
			a.Close()
		}()
	})
}

func (a *App) Close() {
	a.closeOnce.Do(func() {
		if a.watcher != nil {
			a.watcher.Close()
		}
		if a.hub != nil {
			a.hub.Close()
		}
	})
}

func (a *App) EntityCount() int {
	if a.entityCountFn == nil {
		return 0
	}
	return a.entityCountFn()
}

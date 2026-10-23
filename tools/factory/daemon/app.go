package main

import (
	"context"
	"sync"
	"time"
)

// App wires the config, store, hub, and watcher.
type App struct {
	cfg       *Config
	store     *Store
	hub       *Hub
	watcher   *Watcher
	rescanCh  chan struct{}
	done      chan struct{}
	startOnce sync.Once
	closeOnce sync.Once
}

func NewApp(cfg *Config) (*App, error) {
	a := &App{
		cfg:      cfg,
		store:    NewStore(cfg),
		rescanCh: make(chan struct{}, 1),
		done:     make(chan struct{}),
	}
	_, _ = a.store.Rescan()

	a.hub = NewHub(a.store.Snapshot, cfg.AllowedOrigins)
	onChange := func() {
		select {
		case a.rescanCh <- struct{}{}:
		default:
		}
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
			for {
				select {
				case <-ctx.Done():
					a.Close()
					return
				case <-a.done:
					return
				case <-a.rescanCh:
					diff, _ := a.store.Rescan()
					if diff.Changed {
						a.hub.Broadcast("diff", map[string]any{
							"upserts": diff.Upserts,
							"removed": diff.Removed,
							"errors":  diff.Errors,
						})
					}
				}
			}
		}()
	})
}

func (a *App) Close() {
	a.closeOnce.Do(func() {
		close(a.done)
		if a.watcher != nil {
			a.watcher.Close()
		}
		if a.hub != nil {
			a.hub.Close()
		}
	})
}

func (a *App) EntityCount() int {
	if a.store == nil {
		return 0
	}
	return a.store.Count()
}

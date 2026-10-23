package main

import (
	"context"
	"log"
	"sync"
	"time"
)

// App wires the config, store, hub, and watcher.
type App struct {
	cfg       *Config
	store     *Store
	verifier  *Verifier
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
	a.verifier = NewVerifier(cfg, a.store, a.hub.Broadcast)
	a.hub.OnVerify = a.verifier.Enqueue
	onChange := func() {
		select {
		case a.rescanCh <- struct{}{}:
		default:
		}
	}
	watcher, err := NewWatcher(cfg.EntitiesRoot, 150*time.Millisecond, onChange)
	if err != nil {
		a.verifier.Close()
		a.hub.Close()
		return nil, err
	}
	a.watcher = watcher
	return a, nil
}

func (a *App) Start(ctx context.Context) {
	a.startOnce.Do(func() {
		go a.verifier.Run(ctx)
		go func() {
			for {
				select {
				case <-ctx.Done():
					a.Close()
					return
				case <-a.done:
					return
				case <-a.rescanCh:
					diff, became := a.store.Rescan()
					if diff.Changed {
						a.hub.Broadcast("diff", map[string]any{
							"upserts": diff.Upserts,
							"removed": diff.Removed,
							"errors":  diff.Errors,
						})
					}
					for _, id := range became {
						if err := a.verifier.Enqueue(id); err != nil {
							log.Printf("verify enqueue %s: %v", id, err)
						}
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
		if a.verifier != nil {
			a.verifier.Close()
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

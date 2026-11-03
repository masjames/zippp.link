package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// App wires the config, store, hub, and watcher.
type App struct {
	cfg       *Config
	store     *Store
	verifier  *Verifier
	builder   *BuildRunner
	llm       *LLM
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

	a.hub = NewHub(a.snapshot, cfg.AllowedOrigins)
	a.verifier = NewVerifier(cfg, a.store, a.hub.Broadcast)
	a.builder = NewBuildRunner(cfg, a.hub.BroadcastNoSeq)
	a.hub.OnVerify = a.verifier.Enqueue
	a.llm = NewLLM(cfg)
	a.hub.OnThread = a.groomThread
	a.hub.OnGroomChat = a.groomChat
	a.hub.OnBuild = a.startBuild
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
						// Agent handed off: stop build spinner even if Ghostty/omp still open.
						if a.builder != nil {
							for _, entity := range diff.Upserts {
								switch entity.Status {
								case "verify":
									a.builder.CompleteHandoff(entity.ID, "card → verify — Factory verifier takes over")
								case "done":
									a.builder.CompleteHandoff(entity.ID, "card → done")
								case "blocked":
									a.builder.CompleteHandoff(entity.ID, "card → blocked — agent stopped")
								}
							}
						}
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

func (a *App) snapshot() map[string]any {
	snap := a.store.Snapshot()
	if a.builder != nil {
		snap["builds"] = a.builder.Snapshot()
	} else {
		snap["builds"] = map[string]BuildJob{}
	}
	return snap
}

func (a *App) startBuild(id string) error {
	entity := a.store.Get(id)
	if entity == nil {
		return fmt.Errorf("unknown entity %s", id)
	}
	switch entity.Type {
	case "feature", "bug", "story":
	default:
		return fmt.Errorf("build only supported for feature/bug/story, got %s", entity.Type)
	}
	if entity.Status == "blocked" || entity.Status == "done" {
		return fmt.Errorf("cannot build card in status %s", entity.Status)
	}
	if a.builder != nil && a.builder.Active(id) {
		return fmt.Errorf("build already running for %s", id)
	}

	path, err := WriteBuildBrief(a.cfg, entity)
	if err != nil {
		return err
	}

	// Flip todo/verify → in-progress when (re)starting a build.
	// entity.Path is repo-root relative (same as verifier).
	abs := filepath.Join(a.cfg.RepoRoot, filepath.FromSlash(entity.Path))
	switch entity.Status {
	case "todo", "verify":
		from := entity.Status
		if err := SetStatus(abs, entity.ID, from, "in-progress"); err != nil {
			log.Printf("build: status flip %s: %v", entity.ID, err)
		} else {
			diff, _ := a.store.Rescan()
			if diff.Changed {
				a.hub.Broadcast("diff", map[string]any{
					"upserts": diff.Upserts,
					"removed": diff.Removed,
					"errors":  diff.Errors,
				})
			}
			if refreshed := a.store.Get(id); refreshed != nil {
				entity = refreshed
			}
		}
	}

	if a.builder == nil {
		return fmt.Errorf("build runner not configured")
	}
	return a.builder.Launch(entity, path)
}

func (a *App) groomThread(id string) (string, error) {
	if a.store.Get(id) == nil {
		return "", fmt.Errorf("unknown entity %s", id)
	}
	return ReadThread(a.cfg, id)
}

func (a *App) groomChat(id, message string) error {
	entity := a.store.Get(id)
	if entity == nil {
		return fmt.Errorf("unknown entity %s", id)
	}
	message = strings.TrimSpace(message)
	if message == "" {
		return errors.New("message is empty")
	}
	if len(message) > 4000 {
		return errors.New("message is too long")
	}
	a.hub.BroadcastNoSeq("groom_chat_started", map[string]any{"id": id})
	go a.runGroomChat(entity, message)
	return nil
}

func (a *App) runGroomChat(entity *Entity, message string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	thread, err := ReadThread(a.cfg, entity.ID)
	if err != nil {
		a.hub.BroadcastNoSeq("groom_chat_result", map[string]any{"id": entity.ID, "ok": false, "error": err.Error()})
		return
	}
	thread, err = AppendThread(a.cfg, entity.ID, "user", message)
	if err != nil {
		a.hub.BroadcastNoSeq("groom_chat_result", map[string]any{"id": entity.ID, "ok": false, "error": err.Error()})
		return
	}

	system := "You are the Zippp Factory spec grooming assistant. You help the user turn a card into a buildable spec. Ask one clear question at a time. Do not invent facts. Do not implement code. Keep replies short and concrete. When the user makes a decision, write it on its own line as: DECISION: <decision>. Do not write a decision line until the user has answered. Never write a placeholder decision."
	prompt := fmt.Sprintf(
		"Entity: %s %s\nStatus: %s\n\nSpec:\n%s\n\nThread:\n%s\n\nReply to the latest user message. Ask one question at a time. Record a decision only when the user has made one.",
		entity.ID,
		entity.Title,
		entity.Status,
		entity.Body,
		thread,
	)
	reply, err := a.llm.Chat(ctx, system, prompt)
	if err != nil {
		a.hub.BroadcastNoSeq("groom_chat_result", map[string]any{
			"id":     entity.ID,
			"ok":     false,
			"thread": thread,
			"error":  err.Error(),
		})
		return
	}
	thread, err = AppendThread(a.cfg, entity.ID, "assistant", reply)
	if err != nil {
		a.hub.BroadcastNoSeq("groom_chat_result", map[string]any{
			"id":     entity.ID,
			"ok":     false,
			"thread": thread,
			"error":  err.Error(),
		})
		return
	}
	a.hub.BroadcastNoSeq("groom_chat_result", map[string]any{
		"id":     entity.ID,
		"ok":     true,
		"thread": thread,
	})
}

package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

// App wires the config, store, hub, and watcher.
type App struct {
	cfg       *Config
	store     *Store
	verifier  *Verifier
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

	a.hub = NewHub(a.store.Snapshot, cfg.AllowedOrigins)
	a.verifier = NewVerifier(cfg, a.store, a.hub.Broadcast)
	a.hub.OnVerify = a.verifier.Enqueue
	a.llm = NewLLM(cfg)
	a.hub.OnThread = a.groomThread
	a.hub.OnGroomChat = a.groomChat
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

	system := "You are the Zippp Factory spec grooming assistant. You help the user turn a card into a buildable spec. Ask one clear question at a time. Do not invent facts. Do not implement code. Keep replies short and concrete. When the user makes a decision, write it on its own line as: DECISION: <decision>"
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

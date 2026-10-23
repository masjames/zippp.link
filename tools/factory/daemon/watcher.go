package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Watcher adds every directory explicitly because kqueue is not recursive.
type Watcher struct {
	fsw       *fsnotify.Watcher
	root      string
	debounce  time.Duration
	onChange  func()
	mu        sync.Mutex
	timer     *time.Timer
	done      chan struct{}
	closeOnce sync.Once
}

func NewWatcher(root string, debounce time.Duration, onChange func()) (*Watcher, error) {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	if debounce <= 0 {
		debounce = 150 * time.Millisecond
	}
	w := &Watcher{
		fsw:      fsw,
		root:     root,
		debounce: debounce,
		onChange: onChange,
		done:     make(chan struct{}),
	}
	if err := w.addTree(root); err != nil {
		fsw.Close()
		return nil, err
	}
	go w.run()
	return w, nil
}

func (w *Watcher) addTree(root string) error {
	return filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			return nil
		}
		if path != root && strings.HasPrefix(filepath.Base(path), ".") {
			return filepath.SkipDir
		}
		return w.fsw.Add(path)
	})
}

func (w *Watcher) run() {
	for {
		select {
		case <-w.done:
			return
		case event, ok := <-w.fsw.Events:
			if !ok {
				return
			}
			w.handle(event)
		case _, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
		}
	}
}

func (w *Watcher) handle(event fsnotify.Event) {
	if event.Op == fsnotify.Chmod {
		return
	}
	base := filepath.Base(event.Name)
	if strings.HasPrefix(base, ".") || strings.HasSuffix(base, "~") {
		return
	}
	if event.Op&fsnotify.Create != 0 {
		if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
			_ = w.addTree(event.Name)
		}
	}
	w.schedule()
}

func (w *Watcher) schedule() {
	w.mu.Lock()
	if w.timer != nil {
		w.timer.Stop()
	}
	w.timer = time.AfterFunc(w.debounce, func() {
		select {
		case <-w.done:
			return
		default:
		}
		if w.onChange != nil {
			go w.onChange()
		}
	})
	w.mu.Unlock()
}

func (w *Watcher) Close() {
	w.closeOnce.Do(func() {
		close(w.done)
		w.mu.Lock()
		if w.timer != nil {
			w.timer.Stop()
		}
		w.mu.Unlock()
		w.fsw.Close()
	})
}

package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

type Diff struct {
	Upserts []*Entity    `json:"upserts"`
	Removed []string     `json:"removed"`
	Errors  []ParseError `json:"errors"`
	Changed bool         `json:"-"`
}

type Store struct {
	cfg         *Config
	mu          sync.RWMutex
	entities    map[string]*Entity
	errors      []ParseError
	results     map[string]Result
	initialized bool
}

func NewStore(cfg *Config) *Store {
	return &Store{
		cfg:      cfg,
		entities: map[string]*Entity{},
		errors:   []ParseError{},
		results:  map[string]Result{},
	}
}

func (s *Store) Rescan() (Diff, []string) {
	diff := Diff{
		Upserts: []*Entity{},
		Removed: []string{},
		Errors:  []ParseError{},
	}
	var files []string
	walkErr := filepath.WalkDir(s.cfg.EntitiesRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if path != s.cfg.EntitiesRoot && strings.HasPrefix(d.Name(), ".") {
				return fs.SkipDir
			}
			return nil
		}
		rel, relErr := filepath.Rel(s.cfg.EntitiesRoot, path)
		if relErr != nil || !isEntityPath(rel) {
			return nil
		}
		if strings.HasSuffix(d.Name(), ".md") {
			files = append(files, path)
		}
		return nil
	})
	sort.Strings(files)
	parseErrors := []ParseError{}
	if walkErr != nil {
		parseErrors = append(parseErrors, ParseError{Path: s.cfg.EntitiesRoot, Message: walkErr.Error()})
	}

	next := map[string]*Entity{}
	seen := map[string]string{}
	for _, path := range files {
		rel, err := filepath.Rel(s.cfg.RepoRoot, path)
		if err != nil {
			rel = path
		}
		rel = filepath.ToSlash(rel)
		raw, err := os.ReadFile(path)
		if err != nil {
			parseErrors = append(parseErrors, ParseError{Path: rel, Message: err.Error()})
			continue
		}
		entity, err := ParseEntity(rel, raw)
		if err != nil {
			parseErrors = append(parseErrors, ParseError{Path: rel, Message: err.Error()})
			continue
		}
		if first, ok := seen[entity.ID]; ok {
			parseErrors = append(parseErrors, ParseError{
				Path:    rel,
				Message: fmt.Sprintf("duplicate id %s (also in %s)", entity.ID, first),
			})
			continue
		}
		seen[entity.ID] = rel
		next[entity.ID] = entity
	}

	s.mu.RLock()
	prev := s.entities
	prevErrors := append([]ParseError{}, s.errors...)
	initialized := s.initialized
	s.mu.RUnlock()

	for id, entity := range next {
		old, ok := prev[id]
		if !ok || old.Hash != entity.Hash || old.Path != entity.Path {
			diff.Upserts = append(diff.Upserts, entity)
		}
	}
	for id := range prev {
		if _, ok := next[id]; !ok {
			diff.Removed = append(diff.Removed, id)
		}
	}
	sort.Slice(diff.Upserts, func(i, j int) bool { return diff.Upserts[i].ID < diff.Upserts[j].ID })
	sort.Strings(diff.Removed)
	diff.Errors = parseErrors
	diff.Changed = len(diff.Upserts) > 0 || len(diff.Removed) > 0 || !equalErrors(prevErrors, parseErrors)

	var became []string
	if initialized {
		for id, entity := range next {
			if entity.Status != "verify" {
				continue
			}
			old, ok := prev[id]
			if !ok || old.Status != "verify" {
				became = append(became, id)
			}
		}
		sort.Strings(became)
	}

	s.mu.Lock()
	s.entities = next
	s.errors = parseErrors
	s.initialized = true
	s.mu.Unlock()

	return diff, became
}

func equalErrors(a, b []ParseError) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func (s *Store) Snapshot() map[string]any {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entities := make([]*Entity, 0, len(s.entities))
	for _, entity := range s.entities {
		entities = append(entities, entity)
	}
	sort.Slice(entities, func(i, j int) bool { return entities[i].ID < entities[j].ID })
	errors := append([]ParseError{}, s.errors...)
	results := make(map[string]Result, len(s.results))
	for id, result := range s.results {
		results[id] = result
	}
	return map[string]any{
		"entities":      entities,
		"errors":        errors,
		"verifications": results,
	}
}

func (s *Store) Get(id string) *Entity {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.entities[id]
}

func (s *Store) SetResult(result Result) {
	if result.Checks == nil {
		result.Checks = []CheckResult{}
	}
	s.mu.Lock()
	s.results[result.ID] = result
	s.mu.Unlock()
}

func (s *Store) Results() map[string]Result {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]Result, len(s.results))
	for id, result := range s.results {
		out[id] = result
	}
	return out
}

func (s *Store) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.entities)
}

func isEntityPath(rel string) bool {
	parts := strings.Split(filepath.ToSlash(rel), "/")
	if len(parts) < 2 {
		return false
	}
	switch parts[0] {
	case "features", "bugs", "stories", "diagrams":
		return true
	}
	return false
}

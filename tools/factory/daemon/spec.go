package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

var (
	fmRe     = regexp.MustCompile(`(?s)\A---\r?\n(.*?)\r?\n---[ \t]*\r?(?:\n|\z)`)
	statusRe = regexp.MustCompile(`(?m)^status:[ \t]*[^\r\n]*`)
	idRe     = regexp.MustCompile(`^[A-Z][A-Z0-9]*-[0-9]+$`)
)

type Entity struct {
	ID           string       `json:"id" yaml:"id"`
	Type         string       `json:"type" yaml:"type"`
	Title        string       `json:"title" yaml:"title"`
	Status       string       `json:"status" yaml:"status"`
	Assignee     string       `json:"assignee" yaml:"assignee"`
	Relations    Relations    `json:"relations" yaml:"relations"`
	Verification Verification `json:"verification" yaml:"verification"`
	Path         string       `json:"path" yaml:"-"`
	Body         string       `json:"body" yaml:"-"`
	Hash         string       `json:"hash" yaml:"-"`
}

type Relations struct {
	Blocks     []string `json:"blocks" yaml:"blocks"`
	Implements []string `json:"implements" yaml:"implements"`
	DependsOn  []string `json:"depends_on" yaml:"depends_on"`
}

type Verification struct {
	TargetFiles  []string `json:"target_files" yaml:"target_files"`
	TestCommand  string   `json:"test_command" yaml:"test_command"`
	ProdEndpoint string   `json:"prod_endpoint" yaml:"prod_endpoint"`
}

type ParseError struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

type CheckResult struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	Detail     string `json:"detail"`
	Output     string `json:"output"`
	DurationMS int64  `json:"duration_ms"`
}

type Result struct {
	ID          string        `json:"id"`
	StartedAt   string        `json:"started_at"`
	FinishedAt  string        `json:"finished_at"`
	Passed      bool          `json:"passed"`
	WroteStatus bool          `json:"wrote_status"`
	Message     string        `json:"message"`
	Checks      []CheckResult `json:"checks"`
}

func ParseEntity(relPath string, raw []byte) (*Entity, error) {
	loc := fmRe.FindSubmatchIndex(raw)
	if loc == nil {
		return nil, errors.New("missing frontmatter")
	}
	var entity Entity
	if err := yaml.Unmarshal(raw[loc[2]:loc[3]], &entity); err != nil {
		return nil, fmt.Errorf("yaml: %w", err)
	}
	normalizeEntity(&entity)
	if entity.ID == "" {
		return nil, errors.New("id is required")
	}
	if !idRe.MatchString(entity.ID) {
		return nil, fmt.Errorf("invalid id %q", entity.ID)
	}
	switch entity.Type {
	case "feature", "bug", "story", "spec", "diagram", "direction", "decision", "roadmap":
	default:
		return nil, fmt.Errorf("invalid type %q", entity.Type)
	}
	switch entity.Status {
	case "todo", "in-progress", "blocked", "verify", "done":
	default:
		return nil, fmt.Errorf("invalid status %q", entity.Status)
	}
	if strings.TrimSpace(entity.Title) == "" {
		return nil, errors.New("title is required")
	}
	sum := sha256.Sum256(raw)
	entity.Path = relPath
	entity.Body = string(raw[loc[1]:])
	entity.Hash = hex.EncodeToString(sum[:])[:12]
	return &entity, nil
}

func normalizeEntity(entity *Entity) {
	if entity.Relations.Blocks == nil {
		entity.Relations.Blocks = []string{}
	}
	if entity.Relations.Implements == nil {
		entity.Relations.Implements = []string{}
	}
	if entity.Relations.DependsOn == nil {
		entity.Relations.DependsOn = []string{}
	}
	if entity.Verification.TargetFiles == nil {
		entity.Verification.TargetFiles = []string{}
	}
}

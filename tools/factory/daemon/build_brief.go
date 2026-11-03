package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// BuildBriefMarkdown renders a spawnable agent brief for one entity.
func BuildBriefMarkdown(entity *Entity, repoRoot string) string {
	var b strings.Builder
	b.WriteString("# Factory build brief\n\n")
	b.WriteString(fmt.Sprintf("Generated: %s\n\n", time.Now().Format(time.RFC3339)))
	b.WriteString("Skill: `zippp-factory-build` (Cursor). One card. Gates before claim.\n\n")
	b.WriteString("## Card\n\n")
	b.WriteString(fmt.Sprintf("- **ID:** `%s`\n", entity.ID))
	b.WriteString(fmt.Sprintf("- **Title:** %s\n", entity.Title))
	b.WriteString(fmt.Sprintf("- **Type:** %s\n", entity.Type))
	b.WriteString(fmt.Sprintf("- **Status:** %s\n", entity.Status))
	b.WriteString(fmt.Sprintf("- **Assignee:** %s\n", entity.Assignee))
	b.WriteString(fmt.Sprintf("- **Path:** `%s`\n", entity.Path))
	if repoRoot != "" {
		b.WriteString(fmt.Sprintf("- **Repo:** `%s`\n", repoRoot))
	}
	b.WriteString("\n## Relations\n\n")
	b.WriteString(fmt.Sprintf("- blocks: %s\n", joinIDs(entity.Relations.Blocks)))
	b.WriteString(fmt.Sprintf("- implements: %s\n", joinIDs(entity.Relations.Implements)))
	b.WriteString(fmt.Sprintf("- depends_on: %s\n", joinIDs(entity.Relations.DependsOn)))
	b.WriteString("\n## Verification\n\n")
	if len(entity.Verification.TargetFiles) == 0 {
		b.WriteString("- target_files: _(none)_\n")
	} else {
		b.WriteString("- target_files:\n")
		for _, f := range entity.Verification.TargetFiles {
			b.WriteString(fmt.Sprintf("  - `%s`\n", f))
		}
	}
	cmd := strings.TrimSpace(entity.Verification.TestCommand)
	if cmd == "" {
		cmd = "_(none — use skill default gates)_"
	}
	b.WriteString(fmt.Sprintf("- test_command: `%s`\n", cmd))
	if ep := strings.TrimSpace(entity.Verification.ProdEndpoint); ep != "" {
		b.WriteString(fmt.Sprintf("- prod_endpoint: `%s`\n", ep))
	}
	b.WriteString("\n## Spec body\n\n")
	b.WriteString(strings.TrimSpace(entity.Body))
	b.WriteString("\n\n## Agent instructions\n\n")
	b.WriteString("1. Activate skill `zippp-factory-build`.\n")
	b.WriteString("2. Implement only this card. Do not expand scope.\n")
	b.WriteString("3. DIR-001 / DEC-* override stale companion or credit north-star copy.\n")
	b.WriteString("4. Run verification / compile gates before claiming done.\n")
	b.WriteString("5. When code matches acceptance, set entity status to `verify` so Factory verifier can promote to `done`.\n")
	return b.String()
}

func joinIDs(ids []string) string {
	if len(ids) == 0 {
		return "_(none)_"
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, "`"+id+"`")
	}
	return strings.Join(out, ", ")
}

func BriefsDir(cfg *Config) string {
	return filepath.Join(cfg.RepoRoot, "tools", "factory", ".briefs")
}

// WriteBuildBrief writes tools/factory/.briefs/<ID>.md and LATEST.md.
func WriteBuildBrief(cfg *Config, entity *Entity) (string, error) {
	dir := BriefsDir(cfg)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	body := BuildBriefMarkdown(entity, cfg.RepoRoot)
	path := filepath.Join(dir, entity.ID+".md")
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		return "", err
	}
	latest := filepath.Join(dir, "LATEST.md")
	if err := os.WriteFile(latest, []byte(body), 0o644); err != nil {
		return path, err
	}
	return path, nil
}

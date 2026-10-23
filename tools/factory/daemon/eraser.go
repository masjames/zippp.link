package main

import (
	"regexp"
	"strings"
)

type ERDEntity struct {
	Name   string
	Fields []string
}

var (
	eraserOpen  = regexp.MustCompile(`^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]*\])?\s*\{\s*$`)
	eraserClose = regexp.MustCompile(`^\s*\}\s*$`)
	declaredRe  = regexp.MustCompile(`\b(?:interface|type|class|enum|struct|model|object)\s+([A-Za-z_]\w*)`)
	identifier  = regexp.MustCompile(`[A-Za-z_]\w*`)
	traceRe     = regexp.MustCompile(`@implements\s+([A-Za-z][A-Za-z0-9]*-[0-9]+(?:\s*,\s*[A-Za-z][A-Za-z0-9]*-[0-9]+)*)`)
)

func ExtractEraserBlocks(body string) []string {
	lines := strings.Split(strings.ReplaceAll(body, "\r\n", "\n"), "\n")
	var blocks []string
	var current []string
	inBlock := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if !inBlock && strings.HasPrefix(trimmed, "```eraser") {
			inBlock = true
			current = nil
			continue
		}
		if inBlock && strings.HasPrefix(trimmed, "```") {
			blocks = append(blocks, strings.Join(current, "\n"))
			inBlock = false
			current = nil
			continue
		}
		if inBlock {
			current = append(current, line)
		}
	}
	return blocks
}

func ParseERDEntities(block string) []ERDEntity {
	entities := []ERDEntity{}
	current := -1
	for _, rawLine := range strings.Split(strings.ReplaceAll(block, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		if match := eraserOpen.FindStringSubmatch(line); match != nil {
			entities = append(entities, ERDEntity{Name: match[1], Fields: []string{}})
			current = len(entities) - 1
			continue
		}
		if eraserClose.MatchString(line) {
			current = -1
			continue
		}
		if current < 0 {
			continue
		}
		if strings.HasPrefix(line, "//") || strings.HasPrefix(line, "direction ") || strings.HasPrefix(line, "group ") {
			continue
		}
		tokens := strings.Fields(line)
		if len(tokens) == 0 || !identifier.MatchString(tokens[0]) {
			continue
		}
		entities[current].Fields = append(entities[current].Fields, tokens[0])
	}
	return entities
}

func ERDEntitiesFromBody(body string) []ERDEntity {
	entities := []ERDEntity{}
	for _, block := range ExtractEraserBlocks(body) {
		entities = append(entities, ParseERDEntities(block)...)
	}
	return entities
}

func hasTraceMarker(content, id string) bool {
	for _, match := range traceRe.FindAllStringSubmatch(content, -1) {
		for _, item := range strings.Split(match[1], ",") {
			if strings.TrimSpace(item) == id {
				return true
			}
		}
	}
	return false
}

func declaredNames(content string) []string {
	matches := declaredRe.FindAllStringSubmatch(content, -1)
	names := make([]string, 0, len(matches))
	for _, match := range matches {
		names = append(names, match[1])
	}
	return names
}

func identifierSet(content string) map[string]bool {
	set := map[string]bool{}
	for _, token := range identifier.FindAllString(content, -1) {
		set[norm(token)] = true
	}
	return set
}

func norm(s string) string {
	s = strings.ToLower(strings.NewReplacer("_", "", "-", "", " ", "").Replace(s))
	switch {
	case strings.HasSuffix(s, "ies") && len(s) > 4:
		return s[:len(s)-3] + "y"
	case strings.HasSuffix(s, "ss"):
		return s
	case strings.HasSuffix(s, "s") && len(s) > 3:
		return s[:len(s)-1]
	}
	return s
}

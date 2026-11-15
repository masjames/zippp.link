#!/usr/bin/env bash
# Read-only status report. Never displays env/token values or remote URLs.
set -euo pipefail
root=$(git rev-parse --show-toplevel 2>/dev/null || true)
[[ -n "$root" ]] || { echo 'ERROR: not inside a Git repository' >&2; exit 2; }
printf 'Repository root: %s\n' "$root"
printf 'Branch: %s\n' "$(git symbolic-ref --short HEAD 2>/dev/null || echo DETACHED)"
printf 'Commit: %s\n' "$(git rev-parse --short HEAD 2>/dev/null || echo UNKNOWN)"
printf 'Git status (file paths only):\n'
git status --short | head -60 || true
printf 'Remotes (names only):\n'
git remote | head -20 || true
for x in package.json AGENTS.md src android spec .omp .zippp-pivot; do
  [[ -e "$root/$x" ]] && echo "present: $x" || echo "absent: $x"
done
printf 'Tools: '
for x in git node npm omp; do command -v "$x" >/dev/null 2>&1 && printf '%s=available ' "$x" || printf '%s=missing ' "$x"; done
printf '\n'

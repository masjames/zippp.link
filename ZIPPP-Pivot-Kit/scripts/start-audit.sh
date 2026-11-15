#!/usr/bin/env bash
# Launch only the first audit task with exact model selector.
set -euo pipefail
root=$(git rev-parse --show-toplevel 2>/dev/null || true)
[[ -n "$root" ]] || { echo 'ERROR: run this from inside the ZIPPP Git repository.' >&2; exit 2; }
prompt="$root/.zippp-pivot/omp/START-PROMPT.md"
[[ -f "$prompt" && -f "$root/.zippp-pivot/omp/TASK-001-AUDIT.md" ]] || { echo 'ERROR: install ZIPPP Pivot Kit first.' >&2; exit 2; }
command -v omp >/dev/null 2>&1 || { echo 'ERROR: omp is not installed or not on PATH.' >&2; exit 2; }
echo 'Model: openai-codex/gpt-6-luna (Codex OAuth must be configured and verified).'
echo 'Scope: first audit ONLY. No application code/Git/cloud writes authorized.'
cd "$root"
exec omp --model 'openai-codex/gpt-6-luna' --thinking medium -p "$(cat "$prompt")"

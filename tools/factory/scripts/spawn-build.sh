#!/usr/bin/env bash
# Manual spawn: same Ghostty + omp path the Factory Build button uses.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BRIEFS="$ROOT/tools/factory/.briefs"
ID="${1:-}"

if [[ -n "$ID" ]]; then
  BRIEF="$BRIEFS/$ID.md"
else
  BRIEF="$BRIEFS/LATEST.md"
  if [[ -f "$BRIEF" ]]; then
    # Prefer ID from LATEST card line
    ID="$(rg -o '`FEAT-[0-9]+`|`STORY-[0-9]+`|`BUG-[0-9]+`' "$BRIEF" | head -1 | tr -d '`')"
  fi
fi

if [[ -z "${ID:-}" || ! -f "$BRIEFS/$ID.md" ]]; then
  echo "No brief. In Factory UI: Build this, or pass an id."
  echo "usage: spawn-build.sh [FEAT-113]"
  exit 1
fi

echo "Spawning Ghostty + omp for $ID"
exec open -na Ghostty.app --args \
  --working-directory="$ROOT" \
  -e "$ROOT/tools/factory/scripts/run-omp-build.sh" "$ID"

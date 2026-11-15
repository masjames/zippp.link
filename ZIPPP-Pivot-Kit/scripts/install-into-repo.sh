#!/usr/bin/env bash
# Install the kit non-destructively into an existing git repo.
set -euo pipefail
usage() { echo 'Usage: bash scripts/install-into-repo.sh [--dry-run] /absolute/path/to/existing/zippp' >&2; exit 2; }
dry=0
if [[ ${1:-} == '--dry-run' ]]; then dry=1; shift; fi
[[ $# -eq 1 ]] || usage
repo_arg=$1
[[ -d "$repo_arg" ]] || { echo 'ERROR: repository directory does not exist' >&2; exit 2; }
repo=$(cd "$repo_arg" && pwd -P)
root=$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null || true)
[[ -n "$root" && "$repo" == "$(cd "$root" && pwd -P)" ]] || { echo 'ERROR: give the existing Git repository ROOT, not a subdirectory' >&2; exit 2; }
kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
[[ -f "$kit/omp/START-PROMPT.md" && -f "$kit/docs/13-CONTRACTS.md" ]] || { echo 'ERROR: incomplete kit; required files missing' >&2; exit 2; }
dest="$repo/.zippp-pivot"
[[ ! -e "$dest" && ! -L "$dest" ]] || { echo 'ERROR: .zippp-pivot already exists. Refusing to overwrite; inspect and merge manually.' >&2; exit 3; }
if [[ $dry -eq 1 ]]; then
  printf 'DRY RUN: would copy %s to %s\n' "$kit" "$dest"
  echo 'No app files, Git refs, AGENTS.md, .omp/config.yml or credentials would be modified.'
  exit 0
fi
mkdir "$dest"
# Copy contents explicitly; this is deliberately scoped and leaves root app files alone.
cp -R "$kit/docs" "$kit/omp" "$kit/scripts" "$kit/reference" "$dest/"
cp "$kit/README.md" "$dest/README.md"
mkdir -p "$dest/outputs"
printf 'Installed ZIPPP Pivot Kit in %s\n' "$dest"
echo 'Next: read .zippp-pivot/docs/11-OMP-SETUP.md, verify Codex OAuth/model, and run:'
echo '  bash .zippp-pivot/scripts/start-audit.sh'
echo 'Audit is read-only for app code/Git/cloud data. It writes only into .zippp-pivot/.'

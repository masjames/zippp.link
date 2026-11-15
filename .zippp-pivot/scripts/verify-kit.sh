#!/usr/bin/env bash
# Static structure check; no API/network/model calls.
set -euo pipefail
kit=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
for p in README.md docs/00-START-HERE.md docs/01-PRODUCT.md docs/02-EXISTING-SYSTEM.md docs/03-ARCHITECTURE.md docs/04-LEDGER-SYNC.md docs/05-UX-IA.md docs/06-RECEIPTS.md docs/07-SECURITY.md docs/08-VALIDATION.md docs/09-ROADMAP.md docs/10-LEAN-GSD.md docs/11-OMP-SETUP.md docs/12-DECISIONS.md docs/13-CONTRACTS.md omp/AGENT-RULES.md omp/STATE.md omp/TASK-001-AUDIT.md omp/START-PROMPT.md omp/omp-config.example.yml scripts/install-into-repo.sh scripts/start-audit.sh reference/ZIPPP-Prototype-v0.8.html; do
  [[ -s "$kit/$p" ]] || { echo "MISSING OR EMPTY: $p" >&2; exit 1; }
done
for p in scripts/*.sh; do :; done
[[ -d "$kit/reference/legacy" ]] || { echo 'MISSING reference/legacy' >&2; exit 1; }
echo 'PASS: required ZIPPP Pivot Kit assets exist and are nonempty.'

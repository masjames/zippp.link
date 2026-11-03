#!/usr/bin/env bash
# Ghostty entrypoint: omp on a Factory brief. Self-exits when card → verify/done
# or when daemon drops .briefs/<ID>.stop (handoff). Status mirrored to Factory UI.
set -euo pipefail

ID="${1:-}"
if [[ -z "$ID" ]]; then
  echo "usage: run-omp-build.sh <ENTITY_ID>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BRIEFS="$ROOT/tools/factory/.briefs"
BRIEF="$BRIEFS/$ID.md"
STATUS="$BRIEFS/$ID.status.json"
STOP="$BRIEFS/$ID.stop"
SKILL="$ROOT/tools/factory/skills/zippp-factory-build/SKILL.md"
KEY_FILE="${ZIPPP_FACTORY_LLM_API_KEY_FILE:-$ROOT/tools/factory/.factory-key}"
MODEL="${ZIPPP_FACTORY_BUILD_MODEL:-deepseek/deepseek-v4-flash}"
OMP_BIN="${ZIPPP_FACTORY_OMP_BIN:-$(command -v omp || true)}"
MAX_TIME="${ZIPPP_FACTORY_BUILD_MAX_TIME:-45m}"
ENTITY_PATH="${ZIPPP_ENTITY_PATH:-}"

write_status() {
  local phase="$1"
  local ok="$2"
  local message="$3"
  local exit_code="${4:-}"
  local finished=""
  if [[ "$phase" == "exited" || "$phase" == "error" ]]; then
    finished="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  fi
  python3 - "$STATUS" "$ID" "$phase" "$ok" "$message" "$MODEL" "$BRIEF" "$exit_code" "$finished" <<'PY'
import json, os, sys, time
path, id_, phase, ok, message, model, brief, exit_code, finished = sys.argv[1:10]
started = os.environ.get("ZIPPP_BUILD_STARTED_AT") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
payload = {
  "id": id_,
  "phase": phase,
  "ok": ok == "true",
  "message": message,
  "model": model,
  "agent": "omp",
  "brief_path": os.path.relpath(brief, os.environ.get("ZIPPP_REPO_ROOT", os.getcwd())),
  "started_at": started,
  "pid": int(os.environ.get("ZIPPP_BUILD_WRAPPER_PID") or os.getpid()),
}
omp = os.environ.get("ZIPPP_BUILD_OMP_PID")
if omp:
  payload["omp_pid"] = int(omp)
if exit_code != "":
  payload["exit_code"] = int(exit_code)
if finished:
  payload["finished_at"] = finished
os.makedirs(os.path.dirname(path), exist_ok=True)
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
  json.dump(payload, f, indent=2)
  f.write("\n")
os.replace(tmp, path)
PY
}

entity_status() {
  local path="$1"
  [[ -n "$path" && -f "$path" ]] || return 1
  python3 - "$path" <<'PY'
import re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"(?m)^status:\s*(\S+)", raw)
print(m.group(1) if m else "")
PY
}

resolve_entity_path() {
  if [[ -n "$ENTITY_PATH" && -f "$ENTITY_PATH" ]]; then
    echo "$ENTITY_PATH"
    return
  fi
  if [[ -f "$BRIEF" ]]; then
    local rel
    rel="$(python3 - "$BRIEF" <<'PY'
import re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"\*\*Path:\*\*\s*`([^`]+)`", raw)
print(m.group(1) if m else "")
PY
)"
    if [[ -n "$rel" && -f "$ROOT/$rel" ]]; then
      echo "$ROOT/$rel"
      return
    fi
  fi
  # last resort: scan entities tree
  python3 - "$ROOT" "$ID" <<'PY'
import sys
from pathlib import Path
root, id_ = sys.argv[1], sys.argv[2]
base = Path(root) / "spec/themes/03-zippp-software-factory/entities"
for p in base.rglob("*.md"):
    if p.name.startswith(id_) or f"id: {id_}" in p.read_text(encoding="utf-8", errors="ignore")[:200]:
        print(p)
        break
PY
}

stop_children() {
  local omp_pid="${1:-}"
  if [[ -n "$omp_pid" ]] && kill -0 "$omp_pid" 2>/dev/null; then
    kill -TERM "$omp_pid" 2>/dev/null || true
    sleep 0.4
    kill -KILL "$omp_pid" 2>/dev/null || true
  fi
}

export ZIPPP_REPO_ROOT="$ROOT"
export ZIPPP_BUILD_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
export ZIPPP_BUILD_WRAPPER_PID="$$"
cd "$ROOT"
rm -f "$STOP"

if [[ ! -f "$BRIEF" ]]; then
  write_status error false "Brief missing: $BRIEF" 2
  exit 2
fi
if [[ -z "$OMP_BIN" || ! -x "$OMP_BIN" ]]; then
  write_status error false "omp not found on PATH" 127
  exit 127
fi
if [[ ! -f "$KEY_FILE" ]]; then
  write_status error false "API key file missing (tools/factory/.factory-key)" 2
  exit 2
fi

MODELS_YML="${HOME}/.omp/agent/models.yml"
if [[ ! -f "$MODELS_YML" ]]; then
  mkdir -p "${HOME}/.omp/agent"
  cat > "$MODELS_YML" <<'YAML'
providers:
  deepseek:
    baseUrl: https://api.deepseek.com
    api: openai-completions
    apiKey: DEEPSEEK_API_KEY
    authHeader: true
    models:
      - id: deepseek-v4-pro
        name: DeepSeek V4 Pro
        reasoning: true
        thinking:
          minLevel: high
          maxLevel: xhigh
          mode: effort
        input: [text]
        contextWindow: 1000000
        maxTokens: 384000
        compat:
          supportsDeveloperRole: false
          supportsReasoningEffort: true
          maxTokensField: max_tokens
          reasoningEffortMap:
            high: high
            xhigh: max
          supportsToolChoice: false
          requiresReasoningContentForToolCalls: true
          requiresAssistantContentForToolCalls: true
          extraBody:
            thinking:
              type: enabled
      - id: deepseek-v4-flash
        name: DeepSeek V4 Flash
        reasoning: true
        thinking:
          minLevel: high
          maxLevel: xhigh
          mode: effort
        input: [text]
        contextWindow: 1000000
        maxTokens: 384000
        compat:
          supportsDeveloperRole: false
          supportsReasoningEffort: true
          maxTokensField: max_tokens
          reasoningEffortMap:
            high: high
            xhigh: max
          supportsToolChoice: false
          requiresReasoningContentForToolCalls: true
          requiresAssistantContentForToolCalls: true
          extraBody:
            thinking:
              type: enabled
YAML
fi

export DEEPSEEK_API_KEY="$(tr -d '[:space:]' < "$KEY_FILE")"
ENTITY_FILE="$(resolve_entity_path || true)"

write_status starting true "Launching omp ($MODEL) in Ghostty"

set +e
"$OMP_BIN" \
  --cwd "$ROOT" \
  --model "$MODEL" \
  --max-time "$MAX_TIME" \
  --append-system-prompt @"$SKILL" \
  @"$BRIEF" \
  "Build this Factory card. Follow zippp-factory-build. One card only. HARD STOP: when acceptance is met, set entity status to verify and EXIT immediately (do not chat, do not wait). If blocked, set status blocked with evidence and EXIT. Factory auto-verifies next — humans are not watching this terminal." &
OMP_PID=$!
export ZIPPP_BUILD_OMP_PID="$OMP_PID"
write_status running true "omp running on $ID (pid $OMP_PID)"

handoff=""
while kill -0 "$OMP_PID" 2>/dev/null; do
  if [[ -f "$STOP" ]]; then
    handoff="daemon stop"
    break
  fi
  if [[ -n "$ENTITY_FILE" ]]; then
    st="$(entity_status "$ENTITY_FILE" || true)"
    if [[ "$st" == "verify" || "$st" == "done" || "$st" == "blocked" ]]; then
      handoff="card → $st"
      break
    fi
  fi
  sleep 1
done

if [[ -n "$handoff" ]]; then
  stop_children "$OMP_PID"
  wait "$OMP_PID" 2>/dev/null
  write_status exited true "handoff: $handoff — Factory verifier owns the card" 0
  rm -f "$STOP"
  exit 0
fi

wait "$OMP_PID"
code=$?
set -e
rm -f "$STOP"

# If agent flipped status but exited non-zero / odd code, still treat as handoff.
if [[ -n "$ENTITY_FILE" ]]; then
  st="$(entity_status "$ENTITY_FILE" || true)"
  if [[ "$st" == "verify" || "$st" == "done" ]]; then
    write_status exited true "omp ended; card already $st — Factory verifier owns the card" 0
    exit 0
  fi
fi

if [[ "$code" -eq 0 ]]; then
  write_status exited true "omp exited 0 — Factory verifier owns the card" 0
else
  write_status exited false "omp exited $code" "$code"
fi
exit "$code"

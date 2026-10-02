#!/usr/bin/env python3
"""Realtime zippp extraction log watcher.

Streams (polls) production runtime logs and pretty-prints one line per
extraction run — provider path, fallback, per-stage pass/fail, timings,
token usage, and any error.

Usage:
    python3 scripts/watch-logs.py
    VERCEL_TOKEN=... python3 scripts/watch-logs.py

The token is read from $VERCEL_TOKEN, else ~/.config/zippp/vercel-token.
`vercel logs --follow` is not available on the current plan, so this polls
every couple of seconds instead.
"""

import json
import os
import pathlib
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEEN_PATH = pathlib.Path("/tmp/zippp-logs-seen.txt")


def read_token() -> str:
    token = os.environ.get("VERCEL_TOKEN")
    if token:
        return token.strip()
    candidate = pathlib.Path.home() / ".config" / "zippp" / "vercel-token"
    if candidate.exists():
        return candidate.read_text().strip()
    sys.exit("Set VERCEL_TOKEN or write the token to ~/.config/zippp/vercel-token")


def poll(env: dict) -> str:
    try:
        proc = subprocess.run(
            ["vercel", "logs", "--json", "--limit", "40"],
            capture_output=True,
            text=True,
            timeout=45,
            env=env,
            cwd=str(ROOT),
        )
        return proc.stdout
    except Exception as exc:  # noqa: BLE001
        print(f"poll error: {exc}", flush=True)
        return ""


def main() -> None:
    env = {**os.environ, "VERCEL_TOKEN": read_token()}
    seen: set[str] = set()
    if SEEN_PATH.exists():
        seen = set(SEEN_PATH.read_text().split())

    print("zippp logs — watching production (Ctrl-C to stop)\n", flush=True)

    while True:
        out = poll(env)
        runs: list[tuple[dict, dict]] = []

        for line in out.splitlines():
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            rid = record.get("id")
            if not rid or rid in seen:
                continue
            seen.add(rid)
            try:
                message = json.loads(record.get("message") or "{}")
            except json.JSONDecodeError:
                continue
            if isinstance(message, dict) and message.get("event") == "extract.run":
                runs.append((record, message))

        if runs:
            with open(SEEN_PATH, "a") as handle:
                for record, _ in runs:
                    handle.write(record["id"] + "\n")

        for _, msg in sorted(runs, key=lambda item: item[0].get("timestamp", 0)):
            ok = "OK  " if msg.get("ok") else "FAIL"
            fallback = msg.get("fallback")
            path = str(msg.get("provider")) + (f" -> {fallback}" if fallback else "")
            stages = "  ".join(
                ("✓" if s.get("ok") else "✗") + f"{s.get('stage')}({s.get('ms')}ms)"
                for s in msg.get("stages", [])
            )
            usage = msg.get("usage") or {}
            print(
                f"[{ok}] {path}  {msg.get('total_ms')}ms  "
                f"chars={msg.get('ocrChars')}  tok={usage.get('total_tokens')}",
                flush=True,
            )
            print(f"        {stages}", flush=True)
            if msg.get("error"):
                print(f"        error: {msg['error']}", flush=True)
            print(flush=True)

        time.sleep(2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped")

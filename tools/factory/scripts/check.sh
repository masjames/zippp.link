#!/usr/bin/env bash
set -euo pipefail
d="$(dirname "$0")"
"$d/check-daemon.sh"
[ -f "$d/../web/package.json" ] && "$d/check-web.sh"
echo "FACTORY CHECK OK"

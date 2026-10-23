#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../web"
npm run build 2>&1 | tail -25
npm test 2>&1 | tail -25
echo "WEB OK"

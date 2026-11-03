#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../web"
npm run build
npm test
echo "WEB OK"
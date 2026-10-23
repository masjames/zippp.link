#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../daemon"
test -z "$(gofmt -l .)" || { echo "gofmt needed:"; gofmt -l .; exit 1; }
go vet ./...
go test -race -count=1 ./... 2>&1 | tail -40
echo "DAEMON OK"

---
id: FEAT-111
type: feature
title: Software Factory
status: in-progress
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["tools/factory/daemon/verifier.go"]
  test_command: "go -C tools/factory/daemon test ./..."
  prod_endpoint: ""
---

Local-first software factory: Go daemon, React command center, verifier.

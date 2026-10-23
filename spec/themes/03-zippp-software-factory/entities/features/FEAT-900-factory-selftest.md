---
id: FEAT-900
type: feature
title: Factory selftest
status: todo
assignee: pi-agent
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["tools/factory/testdata/selftest/trace-target.ts"]
  test_command: "node tools/factory/testdata/selftest/ok.js"
  prod_endpoint: "http://127.0.0.1:8080/healthz"
---

# Summary

End-to-end selftest for the factory verifier. It exercises static trace markers,
ERD model matching, a local test command, and a live health endpoint.

```eraser
selftest_entities {
  id string pk
  title string
}
```

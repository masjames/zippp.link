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

# What it is

An end-to-end selftest for the factory verifier. It exercises a static trace marker, an ERD model match, a local test command, and a live health endpoint.

# Goal

Prove that moving a task to `verify` runs every check and only writes `done` when the checks pass.

# Context

- `tools/factory/testdata/selftest/trace-target.ts`
- `tools/factory/testdata/selftest/ok.js`
- `spec/themes/03-zippp-software-factory/zippp-factory-pi-brief.md` section 6, M7.

# Acceptance criteria

- [ ] The static check finds `// @implements FEAT-900` in the target file.
- [ ] The model check matches `selftest_entities` and its fields in the target file.
- [ ] The test command exits 0.
- [ ] The health endpoint returns 200 with `ok: true`.
- [ ] A pass rewrites the status to `done`.
- [ ] A failure keeps the status at `verify` and writes a report.

# Verification

- Static trace ID: `// @implements FEAT-900`
- Target files: `tools/factory/testdata/selftest/trace-target.ts`
- Test: `node tools/factory/testdata/selftest/ok.js`
- Production: `http://127.0.0.1:8080/healthz`

# Out of scope

- Product code changes.
- Remote deployment checks.

# Definition of done

The selftest reaches `done` with four passing checks, and the failure path stays at `verify`.

# Notes

This is the only entity that exercises static, model, test, and prod together.

```eraser
selftest_entities {
  id string pk
  title string
}
```

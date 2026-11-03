---
name: zippp-factory-build
description: >
  Efficient, gated Zippp product builds from Factory FEAT/STORY cards. Activate
  when building from a Factory brief, FEAT-*, STORY-*, "Build this", or when
  Adit wants Flash-efficient Android/web implementation that stays correct.
  Enforces one-card scope, DIR/DEC authority, compile/test gates, and no thrash.
---

# Zippp Factory Build

You are the **hands**. Factory is the **control tower**. You edit product code; Factory does not.

## When this skill fires

- User pastes a Factory build brief (`tools/factory/.briefs/*.md`)
- User says build FEAT-xxx / STORY-xxx / "Build this"
- Continuing an in-progress Factory card

## Binding laws

1. **One card only.** Do not expand into adjacent FEATs.
2. **DIR-001 + DEC-*** win over old companion/credit prose in theme docs.
3. **Acceptance criteria = DoD.** Stop when checkboxes are honestly meetable or blocked with evidence.
4. **Out of scope is sacred.** Cut work that is not on the card.
5. **Verify before claim.** Run the card's `test_command` and/or compile gate. Paste first ~40 lines of failure; fix root cause. Same error 3 times → change approach. 6 cycles → stop and report `BLOCKED`.
6. **No product secrets.** Never print `.env*`, tokens, Preview bypass, `.factory-key`.
7. **Pathspecs.** Prefer explicit paths. Never `git add -A` unless user asked to commit (and then follow commit rules).
8. **Token thrift.** Do not re-read huge files you just wrote. Prefer targeted edits. Prefer Flash for implement loops; escalate model only for architecture forks.

## Android gates (when card touches `android/`)

```bash
cd android && ./gradlew :app:compileSideloadDebugKotlin
```

## Web/API gates (when card touches `src/`)

```bash
npm test
npx tsc --noEmit
```

Use the card's `verification.test_command` when set.

## Session shape (ADHD)

1. Read brief + entity body (once).
2. List the unchecked acceptance items.
3. Implement the **next one** item.
4. Run gate.
5. Mark progress in the reply (checkbox list).
6. When acceptance is met: set entity `status: verify`, then **exit the process** — Factory kills the session and auto-verifies. Do not wait for a human. Do not keep chatting.
7. If blocked: set `status: blocked` with evidence, then exit.
8. Always add `// @implements <ID>` (or language equivalent) in every `verification.target_files` entry before claiming verify.

## Build brief contract

Briefs live at `tools/factory/.briefs/<ID>.md` and `LATEST.md`. They include:

- Entity id/title/status
- Depends / implements
- Target files + test command
- Full acceptance + out of scope
- Skill reminder: this file

If brief and entity disagree, **entity markdown on disk wins** — re-read the entity path in the brief.

## Spawn / Pi

Factory may only **write the brief** and optionally flip status to `in-progress`. You (Cursor/Pi) perform the code edits. Do not wait for Factory to edit `src/` or `android/` — it must not.

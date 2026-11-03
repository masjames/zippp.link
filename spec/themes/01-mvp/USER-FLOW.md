# zippp user flows

**Direction override:** Factory `DIR-001`, `DEC-001`…`004`, `ROAD-001`.  
This file keeps operable detail for the **current** web app while naming the Space destination. Multi-persona mill flows are **legacy**.

Depends on: `SPEC.md`, `ARCHITECTURE.md`, `TEMPLATES.md`  
Owns: who does what, in order. Not stack. Not prices.

---

## Actors (destination)

| Actor | Job |
|---|---|
| **Member** | Tracks personal spend, assets, goals in a Zippp Space |
| **Space mate** | Invited collaborator (partner, housemate, etc.) — never default “family” |
| **zippp** | Captures, structures, confirms, lands records; does not silently invent |

## Actors (legacy — do not expand)

Sonny / Fais / Bagas / Operator-as-purchasing-manager — parked as ICP (DEC-005).

---

## Primary loop (destination)

```text
Signal (notification / open app / share)
  → Record prompt
  → Camera scan OR manual entry
  → Review / edit
  → Confirm
  → Land in Space (+ Sheet row when connected)
  → Usage % updates under fair-use plan
```

Auth: Google and/or magic link on web and Android. Device bind optional. Pay / manage plan on web only.

---

## Landing (transition)

- Lead with **personal finance / Zippp Space**, not four business personas.
- Park or soft-deprecate `/for-purchasing`, `/for-sales`, `/for-reimbursement` in marketing (ROAD Phase 2–3 copy work).
- Keep `/for-expenses` as bridge until Space landing ships.

---

## Legacy mill flows (still in product code)

Until Space chrome replaces them, the shipped web app still has:

1. Google sign-in → sheet connect → template → capture → review → Accept (1 credit) → Sheet.
2. Top-up credits (IDR / Paddle).
3. Settings / devices / Telegram link.

Treat those as **as-is implementation**, not the destination UX. Detailed historical steps remain in git history and `AUDIT-2026-10.md` if needed for sheet Rev 2 engineering.

---

## Android (destination)

Full client: auth, capture (incl. notification prompt), review, Space status, usage %, assets/goals (phased).  
No checkout. See DEC-003, DEC-004.

---

## Out of flow

- Auto-accept without confirm
- Android purchase CTAs
- Accessibility bank scrape

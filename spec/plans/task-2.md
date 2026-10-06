# Task 2 plan — Routes and guard

Plan-first. Do not code until reviewed.
Owns: `spec/USER-FLOW.md`. Depends on section 4 of `spec/zippp-ship-plan.md`.

## Goal

Split the single `/app` page into the routes in section 4, add the state guard,
and keep the snap queue alive across navigation.

**Done when:** each route opens only for the right state, back reaches Snap from
everywhere, and the queue survives navigation.

## Current state

`src/app/app/page.tsx` (server) renders one client component, `AppFlow`, which
owns everything: auth/workspace fetch, the queue + processor, `send`, and the
phase switch between Intro / SignIn / Sheets / Capture / Check / Sent / Bad.

Files today:

```
src/app/app/page.tsx          server wrapper -> <AppFlow>
src/components/app/AppFlow.tsx  all state + all screens (client)
src/components/app/screens/*    presentational screens
src/components/app/queue.ts     QueueItem/SentInfo types
src/components/app/QueueStrip.tsx, DebugPanel.tsx, PhoneShell.tsx, useReceiptDetector.ts
```

## Target structure

```
src/app/app/
  layout.tsx            server: load wording+locale, wrap children in <AppProvider>, then <AppShell>
  page.tsx              -> redirects to /app/snap (ready) or the guard target
  start/page.tsx        Intro -> Sign in (logged out only)
  snap/page.tsx         Capture + queue (home)
  check/[id]/page.tsx   Check one queued item (or BadPhoto if it failed)
  sent/page.tsx         Sent
  topup/page.tsx        placeholder (Task 6 builds it; Task 4 adds the gate)
  settings/page.tsx     placeholder (Task 3 builds it)
  settings/sheet/page.tsx  sheet status, reconnect, picker
```

Screen components and `queue.ts` stay where they are; only the orchestrator
changes.

## The provider (why the queue survives)

`AppProvider` (client, in `src/components/app/AppProvider.tsx`) is mounted in
`/app/layout.tsx`, so it is **not remounted** when the route changes.

It owns, moved out of `AppFlow`:

- `auth`, `authChecked`, `workspace`, `candidates`, `busy`, `authError`
- `wording`, `lang`, `region` (passed from the server layout as props)
- `queue`, the queue processor effect, `addFile`, `removeItem`, `retryItem`
- `send(receipt, staff, outlet)` for the item id from `/app/check/[id]`
- `sent` info
- actions: `signOut`, `ensureSheet`, `reloadWorkspace`, `pickSheet`

Exposed via `useApp()`.

`/app/check/[id]` gets its item from `queue.find(id)`. A hard refresh on that URL
loses the in-memory item (accepted for now — the plan keeps the queue in memory).

## The guard

`AppShell` (client, rendered by `layout.tsx` under the provider) runs the guard
in section 4 order, once per navigation, using `usePathname()`:

1. `!authChecked` -> loading screen (spinner). Never show Sign in yet.
2. no session:
   - `/app/start` -> render it.
   - anything else -> redirect `/app/start`.
3. session but no usable workspace:
   - `/app/settings/sheet` -> render it.
   - anything else -> redirect `/app/settings/sheet`.
4. no credits: **stubbed `true` in Task 2**; Task 4 replaces it and redirects to
   `/app/topup`.
5. all good: render the route. `/app` itself -> redirect `/app/snap`.

If a signed-in user opens `/app/start`, redirect to `/app/snap`.

Why client guard, not a server `redirect()`: the plan asks for a loading screen
and a first render that never shows Sign in; auth is read through `/api/auth/me`
(server-side store), and the queue is client state anyway.

## Routes to screens

| Route | Component | Notes |
|---|---|---|
| `/app/start` | `IntroScreen` -> `SignInScreen` | local state for intro vs signin; `onStart`/`login` from `useApp` |
| `/app/snap` | `CaptureScreen` | `onFile=addFile`, queue + handlers from `useApp` |
| `/app/check/[id]` | `CheckScreen` | item by param id; if `status==="failed"` show `BadPhotoScreen` |
| `/app/sent` | `SentScreen` | reads `sent` + `workspace` from `useApp` |
| `/app/settings/sheet` | `SheetsScreen` | reuse existing picker + retry |
| `/app/topup`, `/app/settings` | placeholder | minimal "coming in a later task" panel |

After a successful send, `/app/check/[id]` pushes to `/app/sent`. From `Sent`,
"Scan another" returns to `/app/snap`, and if another item is `ready` it opens
`/app/check/[readyId]`.

## Back to Snap

A small `BackToSnap` link (header, top-left) on every app screen except
`/app/snap` and `/app/start`. Text from `wording.md` (add `app.nav.back` =
"Back" / "Kembali" if missing).

## Out of scope (other tasks)

- `/id` and region cookie redirect, removing the toggle -> Task 5.
- Real credit gate + balance -> Task 4 (guard step 4 stays a stub here).
- `/app/topup` content -> Task 6; `/app/settings` content -> Task 3.
- `/admin` -> Task 6.

## Files touched

- new: `AppProvider.tsx`, `AppShell.tsx`, `BackToSnap.tsx`, the 8 route pages,
  `src/app/app/layout.tsx`
- edited: `src/app/app/page.tsx`, screens (accept handlers via props or
  `useApp`), `src/components/app/AppFlow.tsx` (removed or reduced to nothing)
- spec: `spec/USER-FLOW.md` (routes + guard)

## Risks / decisions to confirm

1. **Client guard with a loading flash** vs server `redirect()`. Plan says
   loading screen -> client. Confirm.
2. **Queue lost on hard refresh of `/app/check/[id]`** — accepted, memory-only.
3. **Placeholders** for `/app/topup` and `/app/settings` are fine for Task 2?
4. **`/app` target** is `/app/snap` when ready. Confirm (section 4 says "/app
   redirects through the guard").
5. Guard "no credits" is a stub until Task 4 — confirm that is acceptable for
   the Task 2 done-check.

## Verification (the done-when)

- Logged out: `/app/snap` -> `/app/start`; `/app/start` renders Intro/Sign in.
- Logged in, no sheet: `/app/snap` -> `/app/settings/sheet`.
- Logged in + sheet: `/app` -> `/app/snap`; snap a receipt, go to `/app/check/[id]`,
  navigate to `/app/settings` and back -> the queue is still there.
- Every non-snap screen has a working back-to-Snap.
- `npm run build` and `npx tsc --noEmit` pass.

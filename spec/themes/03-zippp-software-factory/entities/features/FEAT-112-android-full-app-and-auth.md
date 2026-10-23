---
id: FEAT-112
type: feature
title: Android full app and auth
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

A full native Android app with the same receipt functionality as the web app. Authentication stays web-first: the user signs in on the web or receives an email magic link, then the app is authenticated. The app is not a reduced companion.

# Goal

Make Android a first-class client for the receipt workflow without duplicating the account and billing portal.

# Context

- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md`
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`
- `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md` section 19.

# Decisions to groom

Use the Grooming assistant in the Groom tab. The thread is saved at `entities/threads/FEAT-112.md`.

1. Should Android include top-up and pricing, or stay web-only to protect the Play companion posture?
2. Which auth paths go live: web login plus pairing, email magic link, or both?
3. Should the magic link open the web and then pair, or deep-link into the Android app?
4. Which web-only functions must move to Android: sheet setup, top-up, devices, Telegram, admin, or none?
5. Keep QR pairing as an optional faster path?

# Acceptance criteria

- [ ] The Android app has the same receipt workflow as the web app.
- [ ] The user can authenticate with web login plus pairing or an email magic link.
- [ ] The app can capture, extract, review with all template ops, edit line items, accept, discard, and append.
- [ ] The app shows credits and account status without violating the chosen distribution policy.
- [ ] Every decision above is recorded in the grooming thread and reflected in this spec.

# Verification

- Manual: answer the grooming decisions, then define the Android end-to-end test.
- Static trace ID: not required until the implementation task is split out.
- Production: none while mobile is dark.

# Out of scope

- Admin.
- Android billing until decision 1 is made.
- Replacing the web account portal.

# Definition of done

The decisions are recorded, Android has the agreed parity, and the end-to-end test passes on a real device.

# Notes

This card is the umbrella for Android parity and auth. FEAT-102 owns the review contract. STORY-101 owns the end-to-end test. FEAT-110 owns Production enablement.

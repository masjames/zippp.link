---
id: FLOW-001
type: diagram
title: User flow diagram
status: done
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

The web, Android, Telegram, and factory user flows. The live side shows the paths that exist today. The planned side shows the paths described by the specs.

# Goal

Show where a person enters, what they do, and where the work lands in the Sheet.

# Live (as is)

```mermaid
flowchart TD
  WebLanding["Landing"] --> WebSignIn["Sign in"]
  WebSignIn --> WebSheetSetup["Sheet setup"]
  WebSheetSetup --> WebSnap["Snap"]
  WebSnap --> WebExtract["Extract"]
  WebExtract --> WebCheck["Check"]
  WebCheck --> WebAccept["Accept"]
  WebAccept --> SheetRows["Sheet rows"]
  WebAccept --> WebTopUp["Top up"]
  AndroidPair["Pair"] --> AndroidCapture["Capture"]
  AndroidCapture --> AndroidExtract["Extract"]
  AndroidExtract --> AndroidReview["Review"]
  AndroidReview --> AndroidAccept["Terima"]
  AndroidReview --> AndroidDiscard["Buang"]
  AndroidAccept --> SheetRows
  TelegramLink["Telegram link"] --> TelegramSaldo["Saldo"]
  TelegramLink --> TelegramHelp["Bantuan"]
  FactoryTask["Factory task"] --> FactoryVerify["Verify"]
  FactoryVerify --> FactoryDone["Done"]
```

# Planned (as per spec)

```mermaid
flowchart TD
  WebLanding["Landing"] --> WebSignIn["Sign in"]
  WebSignIn --> WebSheetSetup["Sheet setup"]
  WebSheetSetup --> WebTemplate["Template"]
  WebTemplate --> WebSnap["Snap"]
  WebSnap --> WebExtract["Extract"]
  WebExtract --> WebCheck["Check"]
  WebCheck --> WebOps["Ops"]
  WebOps --> WebAccept["Accept"]
  WebAccept --> SheetMonthTab["Month tab"]
  WebAccept --> DriveProof["Drive proof"]
  WebAccept --> WebTopUp["Top up"]
  AndroidPair["Pair"] --> AndroidQr["QR scan"]
  AndroidQr --> AndroidCamera["Capture"]
  AndroidCamera --> AndroidExtract["Extract"]
  AndroidExtract --> AndroidReview["Review"]
  AndroidReview --> AndroidAccept["Terima"]
  AndroidReview --> AndroidEdit["Ubah"]
  AndroidReview --> AndroidDiscard["Buang"]
  AndroidAccept --> SheetMonthTab
  AndroidAccept --> DriveProof
  TelegramLink["Telegram link"] --> TelegramSaldo["Saldo"]
  TelegramLink --> TelegramHelp["Bantuan"]
  FactoryTask["Factory task"] --> FactoryVerify["Verify"]
  FactoryVerify --> FactoryDone["Done"]
```

# Notes

The live flow has no template step, no ops step, no month tab, no Drive proof, no QR step, and no edit branch on Android. The planned flow adds those paths.

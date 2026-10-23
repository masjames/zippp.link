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

```flow
WebLanding -> WebSignIn
WebSignIn -> WebSheetSetup
WebSheetSetup -> WebSnap
WebSnap -> WebExtract
WebExtract -> WebCheck
WebCheck -> WebAccept
WebAccept -> SheetRows
WebAccept -> WebTopUp
AndroidPair -> AndroidCapture
AndroidCapture -> AndroidExtract
AndroidExtract -> AndroidReview
AndroidReview -> AndroidAccept
AndroidReview -> AndroidDiscard
AndroidAccept -> SheetRows
TelegramLink -> TelegramSaldo
TelegramLink -> TelegramHelp
FactoryTask -> FactoryVerify
FactoryVerify -> FactoryDone
```

# Planned (as per spec)

```flow
WebLanding -> WebSignIn
WebSignIn -> WebSheetSetup
WebSheetSetup -> WebTemplate
WebTemplate -> WebSnap
WebSnap -> WebExtract
WebExtract -> WebCheck
WebCheck -> WebOps
WebOps -> WebAccept
WebAccept -> SheetMonthTab
WebAccept -> DriveProof
WebAccept -> WebTopUp
AndroidPair -> AndroidQr
AndroidQr -> AndroidCamera
AndroidCamera -> AndroidExtract
AndroidExtract -> AndroidReview
AndroidReview -> AndroidAccept
AndroidReview -> AndroidEdit
AndroidReview -> AndroidDiscard
AndroidAccept -> SheetMonthTab
AndroidAccept -> DriveProof
TelegramLink -> TelegramSaldo
TelegramLink -> TelegramHelp
FactoryTask -> FactoryVerify
FactoryVerify -> FactoryDone
```

# Notes

The live flow has no template step, no ops step, no month tab, no Drive proof, no QR step, and no edit branch on Android. The planned flow adds those paths.

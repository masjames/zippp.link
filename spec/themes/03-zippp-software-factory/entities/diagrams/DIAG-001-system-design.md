---
id: DIAG-001
type: diagram
title: System design map
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

A system design map of zippp. The live side shows the code and deployment that exist today. The planned side shows the target described by the specs.

# Goal

Make the gap between the current system and the planned system visible in one place.

# Live (as is)

```eraser
web [client] {
  auth
  sheet_setup
  billing
  devices
  telegram_link
}
android [client] {
  pairing
  camera
  review_partial
  terima
  ubah
  buang
}
api [nextjs] {
  extract
  append
  auth
  billing
  telegram_webhook
  app_version
}
extract [pipeline] {
  paddleocr
  deepseek
  gemini_fallback
  verifier
}
sheets [google] {
  append_single_tab
}
redis [upstash] {
  sessions
  credits
  devices
  pairing
  telegram
}
telegram [channel] {
  link
  saldo
  bantuan
  alerts
}
web - api
android - api
api - extract
api - sheets
api - redis
api - telegram
```

# Planned (as per spec)

```eraser
web [client] {
  auth
  sheet_setup
  billing
  devices
  telegram_link
  month_view
}
android [client] {
  pairing
  qr_scan
  camera
  steady_detection
  review_full
  terima
  ubah
  buang
  offline_queue
  exif_strip
}
api [nextjs] {
  extract
  append
  auth
  billing
  telegram_webhook
  app_version
  corrections
}
extract [pipeline] {
  paddleocr
  deepseek
  gemini_fallback
  verifier
}
sheets [google] {
  month_tabs
  summary
  daily_block
  photo_link
}
drive [google] {
  receipt_folder
  photo_proof
}
redis [upstash] {
  sessions
  credits
  devices
  pairing
  telegram
  scans
}
telegram [channel] {
  link
  saldo
  bantuan
  alerts
}
factory [local] {
  entities
  watcher
  websocket
  verifier
}
web - api
android - api
api - extract
api - sheets
api - drive
api - redis
api - telegram
factory - api
```

# Notes

The live map has a single Sheet tab, no Drive photo proof, and a partial Android review. The planned map adds month tabs, the daily block, Drive photo proof, QR pairing, steady detection, offline queue, EXIF stripping, correction telemetry, and the local factory.

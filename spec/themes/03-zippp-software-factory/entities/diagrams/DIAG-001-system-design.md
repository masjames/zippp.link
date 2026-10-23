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

```mermaid
flowchart LR
  subgraph Clients
    Web["Web portal<br/>auth, sheet setup, billing, devices, Telegram link"]
    Android["Android companion<br/>pairing, camera, partial review, Terima, Ubah, Buang"]
  end
  subgraph Backend
    API["Next.js API<br/>extract, append, auth, billing, Telegram webhook, app version"]
    Extract["Extract pipeline<br/>PP-OCRv6, DeepSeek, Gemini fallback, verifier"]
  end
  subgraph Data
    Sheets["Google Sheets<br/>single tab append"]
    Redis["Upstash Redis<br/>sessions, credits, devices, pairing, Telegram"]
  end
  subgraph Channels
    Telegram["Telegram bot<br/>link, saldo, bantuan, alerts"]
  end
  Web --> API
  Android --> API
  API --> Extract
  API --> Sheets
  API --> Redis
  API --> Telegram
```

# Planned (as per spec)

```mermaid
flowchart LR
  subgraph Clients
    Web["Web portal<br/>auth, sheet setup, billing, devices, Telegram link, month view"]
    Android["Android companion<br/>QR pairing, steady capture, full review, offline queue, EXIF strip"]
  end
  subgraph Backend
    API["Next.js API<br/>extract, append, corrections, app version, Telegram webhook"]
    Extract["Extract pipeline<br/>PP-OCRv6, DeepSeek, Gemini fallback, verifier"]
  end
  subgraph Data
    Sheets["Google Sheets<br/>month tabs, summary, daily block, photo link"]
    Drive["Google Drive<br/>receipt folder, photo proof"]
    Redis["Upstash Redis<br/>sessions, credits, devices, pairing, scans, Telegram"]
  end
  subgraph Channels
    Telegram["Telegram bot<br/>link, saldo, bantuan, alerts"]
  end
  subgraph Local
    Factory["Software Factory<br/>entities, watcher, websocket, verifier"]
  end
  Web --> API
  Android --> API
  API --> Extract
  API --> Sheets
  API --> Drive
  API --> Redis
  API --> Telegram
  Factory -.->|verifies| API
```

# Notes

The live map has a single Sheet tab, no Drive photo proof, and a partial Android review. The planned map adds month tabs, the daily block, Drive photo proof, QR pairing, steady detection, offline queue, EXIF stripping, correction telemetry, and the local factory.

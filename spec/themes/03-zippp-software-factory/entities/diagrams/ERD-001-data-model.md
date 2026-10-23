---
id: ERD-001
type: diagram
title: Complete logical ERD
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

A logical entity relationship map for zippp. The live side lists the records that exist today. The planned side adds the rows, proof, and factory evidence described by the specs.

# Goal

Show the complete data model and the gap between the implemented records and the planned records.

# Live (as is)

```mermaid
erDiagram
  APP_USER ||--|| WORKSPACE : owns
  APP_USER ||--o{ DEVICE : pairs
  APP_USER ||--o{ PAIRING_CODE : generates
  APP_USER ||--o{ SCAN : scans
  SCAN ||--|| RECEIPT : has
  RECEIPT ||--o{ LINE_ITEM : contains
  APP_USER ||--o{ CREDIT_LOT : holds
  APP_USER ||--o{ CREDIT_ORDER : places
  APP_USER ||--|| TELEGRAM_LINK : links
  SCAN ||--o{ CORRECTION : records
  APP_USER {
    string id PK
    string email
  }
  WORKSPACE {
    string user_id FK
    string spreadsheet_id
    string spreadsheet_title
    string template_id
    string sheet_tab
  }
  DEVICE {
    string device_id PK
    string user_id FK
    string jti
    bool revoked
  }
  PAIRING_CODE {
    string code_hash PK
    string user_id FK
    string expires_at
  }
  SCAN {
    string scan_id PK
    string user_id FK
  }
  RECEIPT {
    string scan_id FK
    string merchant
    string date
    number total
  }
  LINE_ITEM {
    string scan_id FK
    string description
    number qty
    number amount
  }
  CREDIT_LOT {
    string user_id FK
    number amount
    string expires_at
  }
  CREDIT_ORDER {
    string order_id PK
    string user_id FK
    string provider
    number credits
  }
  TELEGRAM_LINK {
    string user_id FK
    string chat_id
  }
  CORRECTION {
    string scan_id FK
    string field
    string before_value
    string after_value
  }
```

# Planned (as per spec)

```mermaid
erDiagram
  APP_USER ||--|| WORKSPACE : owns
  APP_USER ||--o{ DEVICE : pairs
  APP_USER ||--o{ PAIRING_CODE : generates
  APP_USER ||--o{ SCAN : scans
  SCAN ||--|| RECEIPT : has
  RECEIPT ||--o{ LINE_ITEM : contains
  APP_USER ||--o{ CREDIT_LOT : holds
  APP_USER ||--o{ CREDIT_ORDER : places
  APP_USER ||--|| TELEGRAM_LINK : links
  SCAN ||--o{ CORRECTION : records
  SCAN ||--|| SHEET_ROW : writes
  SCAN ||--|| PHOTO_PROOF : proves
  FACTORY_ENTITY ||--|| VERIFICATION_RESULT : verifies
  APP_USER {
    string id PK
    string email
  }
  WORKSPACE {
    string user_id FK
    string spreadsheet_id
    string spreadsheet_title
    string template_id
    string sheet_tab
    bool photo_proof
    string default_outlet
    string staff_names
    string outlets
  }
  DEVICE {
    string device_id PK
    string user_id FK
    string jti
    bool revoked
    string app_version
    string platform
    string last_seen_at
  }
  PAIRING_CODE {
    string code_hash PK
    string user_id FK
    string expires_at
  }
  SCAN {
    string scan_id PK
    string user_id FK
  }
  RECEIPT {
    string scan_id FK
    string merchant
    string date
    number total
  }
  LINE_ITEM {
    string scan_id FK
    string description
    number qty
    number amount
  }
  CREDIT_LOT {
    string user_id FK
    number amount
    string expires_at
  }
  CREDIT_ORDER {
    string order_id PK
    string user_id FK
    string provider
    number credits
  }
  TELEGRAM_LINK {
    string user_id FK
    string chat_id
  }
  CORRECTION {
    string scan_id FK
    string field
    string before_value
    string after_value
    string flag_reason
    string source
  }
  SHEET_ROW {
    string scan_id FK
    string receipt_id
    string captured_at
    string month_tab
    string photo_url
    string staff
    string outlet
  }
  PHOTO_PROOF {
    string scan_id FK
    string drive_file_id
    string link
  }
  FACTORY_ENTITY {
    string id PK
    string type
    string status
    string path
  }
  VERIFICATION_RESULT {
    string entity_id FK
    bool passed
    bool wrote_status
    string finished_at
  }
```

# Notes

This is a logical model, not a physical database schema. The physical stores are Redis for sessions, credits, devices, pairing, scans, and Telegram; Google Sheets for receipt rows; Google Drive for optional photo proof; and local markdown for factory entities. zippp keeps no receipt ledger of its own.

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

```eraser
user {
  id string pk
  email string
}
workspace {
  user_id string fk
  spreadsheet_id string
  spreadsheet_title string
  template_id string
  sheet_tab string
}
device {
  device_id string pk
  user_id string fk
  jti string
  revoked bool
}
pairing_code {
  code_hash string pk
  user_id string fk
  expires_at string
}
scan {
  scan_id string pk
  user_id string fk
}
receipt {
  scan_id string fk
  merchant string
  date string
  total number
}
line_item {
  scan_id string fk
  description string
  qty number
  amount number
}
credit_lot {
  user_id string fk
  amount number
  expires_at string
}
order {
  order_id string pk
  user_id string fk
  provider string
  credits number
}
telegram_link {
  user_id string fk
  chat_id string
}
correction {
  scan_id string fk
  field string
  before string
  after string
}
user - workspace
user - device
user - pairing_code
user - scan
scan - receipt
receipt - line_item
user - credit_lot
user - order
user - telegram_link
scan - correction
```

# Planned (as per spec)

```eraser
user {
  id string pk
  email string
}
workspace {
  user_id string fk
  spreadsheet_id string
  spreadsheet_title string
  template_id string
  sheet_tab string
  photo_proof bool
  default_outlet string
  staff_names string
  outlets string
}
device {
  device_id string pk
  user_id string fk
  jti string
  revoked bool
  app_version string
  platform string
  last_seen_at string
}
pairing_code {
  code_hash string pk
  user_id string fk
  expires_at string
}
scan {
  scan_id string pk
  user_id string fk
}
receipt {
  scan_id string fk
  merchant string
  date string
  total number
}
line_item {
  scan_id string fk
  description string
  qty number
  amount number
}
credit_lot {
  user_id string fk
  amount number
  expires_at string
}
order {
  order_id string pk
  user_id string fk
  provider string
  credits number
}
telegram_link {
  user_id string fk
  chat_id string
}
correction {
  scan_id string fk
  field string
  before string
  after string
  flag_reason string
  source string
}
sheet_row {
  scan_id string fk
  receipt_id string
  captured_at string
  month_tab string
  photo_url string
  staff string
  outlet string
}
photo_proof {
  scan_id string fk
  drive_file_id string
  link string
}
factory_entity {
  id string pk
  type string
  status string
  path string
}
verification_result {
  entity_id string fk
  passed bool
  wrote_status bool
  finished_at string
}
user - workspace
user - device
user - pairing_code
user - scan
scan - receipt
receipt - line_item
user - credit_lot
user - order
user - telegram_link
scan - correction
scan - sheet_row
scan - photo_proof
factory_entity - verification_result
```

# Notes

This is a logical model, not a physical database schema. The physical stores are Redis for sessions, credits, devices, pairing, scans, and Telegram; Google Sheets for receipt rows; Google Drive for optional photo proof; and local markdown for factory entities. zippp keeps no receipt ledger of its own.

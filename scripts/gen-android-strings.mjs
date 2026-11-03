#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const wordingFile = path.join(root, "spec", "wording.txt");
const outFile = path.join(
  root,
  "android",
  "app",
  "src",
  "main",
  "res",
  "values",
  "strings.xml"
);

const map = {
  app_name: null,
  signin_title: "android.signin.title",
  signin_subtitle: "android.signin.subtitle",
  signin_email_hint: "android.signin.emailHint",
  signin_send_link: "android.signin.sendLink",
  signin_link_sent: "android.signin.linkSent",
  signin_token_hint: "android.signin.tokenHint",
  signin_consume: "android.signin.consume",
  signin_google: "android.signin.google",
  signin_google_missing_client: "android.signin.googleMissingClient",
  signin_use_pairing: "android.signin.usePairing",
  signin_back: "android.signin.back",
  pairing_title: "android.pairing.title",
  pairing_subtitle: "android.pairing.subtitle",
  pairing_hint: "android.pairing.codeHint",
  pairing_connect: "android.pairing.connect",
  error_pairing: "android.pairing.error",
  error_pairing_code: "android.pairing.invalid_code",
  error_rate_limited: "android.pairing.rate_limited",
  error_device_conflict: "android.pairing.device_conflict",
  error_server: "android.error.server",
  camera_permission: "android.camera.permission",
  camera_allow: "android.camera.allow",
  camera_snap: "android.camera.snap",
  error_camera: "android.camera.error",
  error_extract: "android.error.extract_failed",
  scan_balance_label: "android.camera.scanBalance",
  space_label: "android.camera.space",
  review_title: "android.review.title",
  review_merchant: "android.review.merchant",
  review_total: "android.review.total",
  review_date: "android.review.date",
  review_accept: "android.review.accept",
  review_edit: "android.review.edit",
  review_discard: "android.review.discard",
  review_hard_flags: "android.review.hardFlagWarning",
  review_acknowledge: "android.review.acknowledge",
  review_category: "android.review.category",
  review_payment: "android.review.payment",
  review_staff: "android.review.staff",
  review_outlet: "android.review.outlet",
  review_purpose: "android.review.purpose",
  review_customer: "android.review.customer",
  review_description: "android.review.description",
  review_qty: "android.review.qty",
  review_amount: "android.review.amount",
  review_date_assumed: "android.review.dateAssumed",
  camera_flash_on: "android.camera.flashOn",
  camera_flash_off: "android.camera.flashOff",
  camera_gallery: "android.camera.gallery",
  camera_manual: "android.camera.manual",
  settings_title: "android.settings.title",
  settings_capture_title: "android.settings.capture.title",
  settings_capture_body: "android.settings.capture.body",
  settings_capture_access_on: "android.settings.capture.accessOn",
  settings_capture_access_off: "android.settings.capture.accessOff",
  settings_capture_open_access: "android.settings.capture.openAccess",
  settings_capture_toggle: "android.settings.capture.toggle",
  settings_balance: "android.settings.balance",
  settings_sign_out: "android.settings.signOut",
  settings_back: "android.settings.back",
  manual_title: "android.manual.title",
  manual_body: "android.manual.body",
  manual_save: "android.manual.save",
  notify_channel: "android.notify.channel",
  notify_prompt_title: "android.notify.promptTitle",
  notify_prompt_body: "android.notify.promptBody",
  notify_open_camera: "android.notify.openCamera",
  error_capture_permission: "android.error.capture.permission",
  plan_limit: "android.plan.limit",
  queue_empty: "android.queue.empty",
  queue_capture_more: "android.queue.captureMore",
  queue_title: "android.queue.title",
  queue_pending: "android.queue.pending",
  queue_sent: "android.queue.sent",
  plan_label: "android.plan.label",
  plan_used: "android.plan.used",
  space_title: "android.space.title",
  space_items_title: "android.space.itemsTitle",
  space_items_empty: "android.space.itemsEmpty",
  space_asset: "android.space.asset",
  space_goal: "android.space.goal",
  space_name: "android.space.name",
  space_amount: "android.space.amount",
  space_target: "android.space.target",
  space_progress: "android.space.progress",
  space_note: "android.space.note",
  space_add: "android.space.add",
  space_save: "android.space.save",
  space_cancel: "android.space.cancel",
  space_edit: "android.space.edit",
  space_archive: "android.space.archive",
  space_error: "android.space.error",
  space_value: "android.space.value",
  space_goal_progress: "android.space.goalProgress",
  no_credits_message: "android.error.no_credits",
  no_credits_refresh: "android.error.no_credits.refresh",
  error_no_credits: "android.error.no_credits.short",
  error_append: "android.error.append",
  error_device_revoked: "android.error.device_revoked",
};

function parseWording(raw) {
  const map = new Map();
  for (const block of raw.split(/^## /m).slice(1)) {
    const newline = block.indexOf("\n");
    if (newline === -1) continue;
    const key = block.slice(0, newline).trim();
    if (!key) continue;
    map.set(key, block.slice(newline + 1).trim());
  }
  return map;
}

function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const wording = parseWording(readFileSync(wordingFile, "utf8"));
const lines = [
  '<?xml version="1.0" encoding="utf-8"?>',
  "<!-- Generated by scripts/gen-android-strings.mjs from spec/wording.txt. Do not edit. -->",
  "<resources>",
  '    <string name="app_name">Zippp</string>',
  "",
];

for (const [resource, key] of Object.entries(map)) {
  if (!key) continue;
  const value = wording.get(`${key}.id`) ?? wording.get(`${key}.en`);
  if (!value) {
    throw new Error(`Missing wording key: ${key}.id`);
  }
  lines.push(`    <string name="${resource}">${xml(value)}</string>`);
}

lines.push("</resources>", "");
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(root, outFile)} (${Object.keys(map).length} strings)`);

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/request-user";
import { balance, refundScan, spend } from "@/lib/billing/ledger";
import { LOW_CREDITS_WARN } from "@/lib/billing/config";
import { getPlanUsage, recordCapture } from "@/lib/billing/plan";
import { billingConfigured, command } from "@/lib/billing/redis";
import { appendRows, SheetsApiError, SheetsAuthError } from "@/lib/google/sheets";
import { buildAppendRows, PAYMENT_OPTIONS } from "@/lib/google/templates";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { hasScanOwner } from "@/lib/mobile/scan-store";
import { sanitizeRows } from "@/lib/google/sheet-safe";
import { sendLowCreditAlert } from "@/lib/telegram/alerts";
import type { LineItem, Receipt } from "@/types/receipt";

export const runtime = "nodejs";

const MAX_LINE_ITEMS = 200;
const MAX_TEXT = 500;
const RESULT_CACHE_TTL = 24 * 60 * 60;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AppendBody = {
  receipt?: Receipt;
  staff?: string;
  outlet?: string | null;
  payment?: string | null;
  purpose?: string | null;
  customer?: string | null;
  /** Server-issued scanId from POST /api/extract. Idempotency key. */
  scanId?: string;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (isFiniteNumber(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function parseNullableString(v: unknown, max = MAX_TEXT): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t.slice(0, max);
}

function parseLineItem(raw: unknown): LineItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    description: parseNullableString(o.description),
    qty: parseNullableNumber(o.qty),
    unit_price: parseNullableNumber(o.unit_price),
    amount: parseNullableNumber(o.amount),
  };
}

function parseReceipt(raw: unknown): Receipt | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.line_items)) return null;
  if (o.line_items.length > MAX_LINE_ITEMS) return null;
  const line_items = o.line_items
    .map(parseLineItem)
    .filter((x): x is LineItem => x != null);
  return {
    merchant: parseNullableString(o.merchant),
    date: parseNullableString(o.date, 40),
    currency: parseNullableString(o.currency, 8),
    category: parseNullableString(o.category, 80),
    line_items,
    subtotal: parseNullableNumber(o.subtotal),
    tax: parseNullableNumber(o.tax),
    total: parseNullableNumber(o.total),
  };
}

const resultCacheKey = (userId: string, scanId: string) =>
  `scan:result:${userId}:${scanId}`;

function fail(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, error: code, ...extra }, { status });
}

export async function POST(req: Request) {
  const { user, error: authError } = await resolveRequestUser(req);

  if (!user) {
    if (authError === "DEVICE_REVOKED") return fail("DEVICE_REVOKED", 401);
    if (authError === "SERVER_MISCONFIGURED") {
      return fail("SERVER_MISCONFIGURED", 503);
    }
    return fail("UNAUTHORIZED", 401);
  }

  const userId = user.userId;

  let body: AppendBody;
  try {
    body = (await req.json()) as AppendBody;
  } catch {
    return fail("INVALID_JSON", 400);
  }

  const receipt = parseReceipt(body.receipt);
  if (!receipt) return fail("RECEIPT_INVALID", 400);
  if (receipt.line_items.length === 0) return fail("RECEIPT_EMPTY", 400);

  const scanId =
    typeof body.scanId === "string" && body.scanId.trim()
      ? body.scanId.trim()
      : randomUUID();

  if (!UUID_RE.test(scanId)) return fail("SCAN_ID_INVALID", 400);

  // Mobile clients must use a scan id issued by /api/extract. Web clients keep
  // their existing client-generated ids for backwards compatibility.
  if (user.source === "mobile") {
    const issued = await hasScanOwner(userId, scanId);
    if (!issued) return fail("SCAN_NOT_ISSUED", 400);
  }

  if (billingConfigured()) {
    try {
      const cached = (await command([
        "GET",
        resultCacheKey(userId, scanId),
      ])) as string | null;
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        let creditsRemaining: number | null = null;
        try {
          creditsRemaining = (await balance(userId)).credits;
        } catch {
          creditsRemaining = null;
        }
        return NextResponse.json({
          ...parsed,
          credits_remaining: creditsRemaining,
          duplicate: true,
        });
      }
    } catch {
      /* cache miss or store error; continue to the normal path */
    }
  }

  const workspace = await loadWorkspaceForUser(userId);
  if (
    !workspace ||
    !workspace.spreadsheet_id ||
    !workspace.sheet_tab ||
    !workspace.column_map ||
    Object.keys(workspace.column_map).length === 0
  ) {
    return fail("NO_WORKSPACE", 400);
  }

  const staff = typeof body.staff === "string" ? body.staff.trim().slice(0, 120) : "";
  if (staff && workspace.staff_names.length > 0 && !workspace.staff_names.includes(staff)) {
    return fail("STAFF_INVALID", 400);
  }

  let outlet: string | null = null;
  if (typeof body.outlet === "string" && body.outlet.trim()) {
    outlet = body.outlet.trim().slice(0, 120);
  } else if (body.outlet === null || body.outlet === undefined) {
    outlet = workspace.default_outlet;
  }
  if (outlet && workspace.outlets.length > 0 && !workspace.outlets.includes(outlet)) {
    return fail("OUTLET_INVALID", 400);
  }
  if (workspace.outlets.length > 1 && !outlet) {
    return fail("OUTLET_REQUIRED", 400);
  }

  const payment = parseNullableString(body.payment, 40);
  const allowedPayments = PAYMENT_OPTIONS[workspace.template_id];
  if (payment && allowedPayments && !allowedPayments.includes(payment)) {
    return fail("PAYMENT_INVALID", 400);
  }
  const purpose = parseNullableString(body.purpose, 200);
  const customer = parseNullableString(body.customer, 200);

  const planUsage = billingConfigured()
    ? await getPlanUsage(userId)
    : null;
  if (planUsage && planUsage.used >= planUsage.included) {
    return fail("PLAN_LIMIT", 402, { used_pct: 100 });
  }

  const captured_at = new Date().toISOString();

  let rows;
  try {
    rows = buildAppendRows({
      receipt,
      column_map: workspace.column_map,
      constants: workspace.constants,
      headers: workspace.headers,
      staff,
      outlet,
      captured_at,
      receipt_id: scanId,
      payment: payment ?? undefined,
      purpose: purpose ?? undefined,
      customer: customer ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build rows.";
    return fail("ROWS_INVALID", 400, { message });
  }

  const safeRows = sanitizeRows(rows);

  let chargedUserId: string | null = null;
  let chargedScanId: string | null = null;

  try {
    if (billingConfigured() && !planUsage) {
      const spent = await spend({
        userId,
        credits: 1,
        idem: `scan:${userId}:${scanId}`,
      });
      if (spent === "insufficient") return fail("NO_CREDITS", 402, { credits: 0 });
      if (spent === "duplicate") {
        // The cache was already checked above. A duplicate with no cached
        // result means a prior attempt charged but never completed. Do not
        // claim success: the row may not exist.
        return fail("SCAN_ALREADY_SENT", 409);
      }
      chargedUserId = userId;
      chargedScanId = scanId;
    }

    const result = await appendRows(
      workspace.spreadsheet_id,
      workspace.sheet_tab,
      safeRows,
      userId
    );

    let planAfter = null;
    if (planUsage) {
      try {
        planAfter = await recordCapture(userId);
      } catch {
        /* the row is written; meter lag must not fail the request */
      }
    }

    let current: { credits: number } | null = null;
    if (billingConfigured()) {
      try {
        current = await balance(userId);
      } catch {
        // The row is already written. Never refund or fail because the
        // balance read failed after a successful append.
        current = null;
      }
    }
    const successBody = {
      ok: true,
      rows_written: result.updatedRows,
      spreadsheet_title: workspace.spreadsheet_title,
      sheet_tab: workspace.sheet_tab,
      scanId,
      credits_remaining: current?.credits ?? null,
      plan_used_pct: planAfter?.used_pct ?? null,
    };

    if (billingConfigured()) {
      try {
        await command([
          "SET",
          resultCacheKey(userId, scanId),
          JSON.stringify(successBody),
          "EX",
          RESULT_CACHE_TTL,
        ]);
      } catch {
        /* cache write is non-fatal; spend idempotency still protects retries */
      }
      if (current && current.credits < LOW_CREDITS_WARN) {
        void sendLowCreditAlert({ userId, remaining: current.credits });
      }
    }

    return NextResponse.json(successBody);
  } catch (err) {
    if (chargedUserId && chargedScanId) {
      try {
        await refundScan(chargedUserId, chargedScanId);
      } catch {
        /* refund failure is logged; the user can contact support */
        console.error(
          JSON.stringify({ event: "append.refund.failed", userId: chargedUserId, scanId: chargedScanId })
        );
      }
    }
    if (err instanceof SheetsAuthError) return fail("GOOGLE_RECONSENT", 401);
    if (err instanceof SheetsApiError) {
      return fail("APPEND_FAILED", err.status >= 400 && err.status < 600 ? err.status : 400, {
        message: err.message,
      });
    }
    console.error("POST /api/sheets/append", err);
    return fail("APPEND_FAILED", 500);
  }
}

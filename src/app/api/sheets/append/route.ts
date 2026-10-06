import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { refundScan, spend } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";
import {
  appendRows,
  SheetsApiError,
  SheetsAuthError,
} from "@/lib/google/sheets";
import { buildAppendRows } from "@/lib/google/templates";
import { hasTokens } from "@/lib/google/token-store";
import { loadWorkspace } from "@/lib/google/workspace-store";
import type { LineItem, Receipt } from "@/types/receipt";

export const runtime = "nodejs";

type AppendBody = {
  receipt?: Receipt;
  staff?: string;
  outlet?: string | null;
  /** Stable id for this scan; makes the credit charge idempotent. */
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

function parseNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
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
  const line_items = o.line_items
    .map(parseLineItem)
    .filter((x): x is LineItem => x != null);
  return {
    merchant: parseNullableString(o.merchant),
    date: parseNullableString(o.date),
    currency: parseNullableString(o.currency),
    line_items,
    subtotal: parseNullableNumber(o.subtotal),
    tax: parseNullableNumber(o.tax),
    total: parseNullableNumber(o.total),
  };
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedScanId: string | null = null;
  try {
    if (!(await hasTokens())) {
      return NextResponse.json(
        { ok: false, error: "Not signed in with Google." },
        { status: 401 }
      );
    }

    const workspace = await loadWorkspace();
    if (
      !workspace ||
      !workspace.spreadsheet_id ||
      !workspace.sheet_tab ||
      !workspace.column_map ||
      Object.keys(workspace.column_map).length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No spreadsheet connected or column map missing. Connect a [zippp] sheet and save the map first.",
        },
        { status: 400 }
      );
    }

    let body: AppendBody;
    try {
      body = (await req.json()) as AppendBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const receipt = parseReceipt(body.receipt);
    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: "Body must include a valid receipt." },
        { status: 400 }
      );
    }
    if (receipt.line_items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Receipt has no line items to append." },
        { status: 400 }
      );
    }

    const staff =
      typeof body.staff === "string" ? body.staff.trim() : "";
    const isResto = workspace.template_id === "resto-inventory";
    if (isResto && !staff) {
      return NextResponse.json(
        {
          ok: false,
          error: "Staff is required before sending to the sheet.",
        },
        { status: 400 }
      );
    }

    let outlet: string | null = null;
    if (typeof body.outlet === "string" && body.outlet.trim()) {
      outlet = body.outlet.trim();
    } else if (body.outlet === null || body.outlet === undefined) {
      outlet = workspace.default_outlet;
    }

    if (
      isResto &&
      workspace.outlets.length > 1 &&
      !outlet
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Outlet is required when multiple outlets are configured.",
        },
        { status: 400 }
      );
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
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to build rows.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    // Charge one credit on Send (idempotent on the scan id).
    if (billingConfigured()) {
      const user = await currentUser();
      if (!user.signedIn || !user.userId) {
        return NextResponse.json(
          { ok: false, error: "Not signed in with Google." },
          { status: 401 }
        );
      }
      const scanId =
        typeof body.scanId === "string" && body.scanId
          ? body.scanId
          : randomUUID();
      const spent = await spend({
        userId: user.userId,
        credits: 1,
        idem: `scan:${scanId}`,
      });
      if (spent === "insufficient") {
        return NextResponse.json(
          { ok: false, error: "No credits. Top up to send.", needsCredits: true },
          { status: 402 }
        );
      }
      if (spent === "duplicate") {
        return NextResponse.json(
          { ok: false, error: "This scan was already sent." },
          { status: 409 }
        );
      }
      chargedUserId = user.userId;
      chargedScanId = scanId;
    }

    const result = await appendRows(
      workspace.spreadsheet_id,
      workspace.sheet_tab,
      rows
    );

    return NextResponse.json({
      ok: true,
      rows_written: result.updatedRows,
      spreadsheet_title: workspace.spreadsheet_title,
      sheet_tab: workspace.sheet_tab,
    });
  } catch (err) {
    // Append failed after charging: give the credit back.
    if (chargedUserId && chargedScanId) {
      try {
        await refundScan(chargedUserId, chargedScanId);
      } catch {
        /* ignore */
      }
    }
    if (err instanceof SheetsAuthError) {
      return NextResponse.json(
        { ok: false, error: err.message, needsReconsent: true },
        { status: 401 }
      );
    }
    if (err instanceof SheetsApiError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 400 }
      );
    }
    console.error("POST /api/sheets/append", err);
    return NextResponse.json(
      { ok: false, error: "Failed to append rows to spreadsheet." },
      { status: 500 }
    );
  }
}

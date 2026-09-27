import { NextResponse } from "next/server";
import { loadWorkspace, saveWorkspace, workspacePublic } from "@/lib/google/workspace-store";
import type { ColumnMap, ConstantsMap } from "@/lib/google/workspace-store";

export const runtime = "nodejs";

type MapBody = {
  column_map?: ColumnMap;
  constants?: ConstantsMap;
  sheet_tab?: string;
  staff_names?: string[];
  outlets?: string[];
  default_outlet?: string | null;
};

export async function PUT(req: Request) {
  const existing = await loadWorkspace();
  if (!existing) {
    return NextResponse.json(
      {
        ok: false,
        error: "No spreadsheet connected. Connect a sheet first.",
      },
      { status: 400 }
    );
  }

  let body: MapBody;
  try {
    body = (await req.json()) as MapBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const column_map =
    body.column_map && typeof body.column_map === "object"
      ? sanitizeStringRecord(body.column_map)
      : existing.column_map;

  const constants =
    body.constants && typeof body.constants === "object"
      ? sanitizeStringRecord(body.constants)
      : existing.constants;

  const sheet_tab =
    typeof body.sheet_tab === "string" && body.sheet_tab.trim()
      ? body.sheet_tab.trim()
      : existing.sheet_tab;

  const staff_names = Array.isArray(body.staff_names)
    ? body.staff_names.filter((s): s is string => typeof s === "string")
    : existing.staff_names;

  const outlets = Array.isArray(body.outlets)
    ? body.outlets.filter((s): s is string => typeof s === "string")
    : existing.outlets;

  let default_outlet = existing.default_outlet;
  if (body.default_outlet !== undefined) {
    default_outlet =
      body.default_outlet === null || body.default_outlet === ""
        ? null
        : String(body.default_outlet);
  }

  const ws = await saveWorkspace({
    ...existing,
    column_map,
    constants,
    sheet_tab,
    staff_names,
    outlets,
    default_outlet,
  });

  return NextResponse.json({
    ok: true,
    workspace: workspacePublic(ws),
  });
}

function sanitizeStringRecord(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (v === null || v === undefined || v === "" || v === "—") continue;
    out[k] = String(v);
  }
  return out;
}

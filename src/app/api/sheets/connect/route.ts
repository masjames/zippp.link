import { NextResponse } from "next/server";
import {
  createRestoInventorySpreadsheet,
  createTemplateSpreadsheet,
  findZippSpreadsheets,
  getHeaderRow,
  getSpreadsheetMeta,
  pickBestZippSheet,
  SheetsApiError,
  SheetsAuthError,
  type DriveSpreadsheetHit,
} from "@/lib/google/sheets";
import { peekGoogleUserId, hasTokens } from "@/lib/google/token-store";
import { buildDefaultMap } from "@/lib/google/templates";
import {
  saveWorkspace,
  workspacePublic,
  type TemplateId,
  type WorkspaceConfig,
} from "@/lib/google/workspace-store";

export const runtime = "nodejs";

type ConnectBody = {
  /** When set, connect this spreadsheet (user picked from candidates). */
  spreadsheetId?: string;
  /** "create" force-creates a new sheet; "list" returns the choices. */
  mode?: "create" | "list";
  /** Template for a newly created sheet (mode "create"). */
  templateId?: TemplateId;
};

async function persistConnection(input: {
  googleUserId: string;
  spreadsheetId: string;
  title: string;
  sheetTab: string;
  headers: string[];
  created: boolean;
  templateId?: TemplateId;
}): Promise<{
  workspace: ReturnType<typeof workspacePublic>;
  created: boolean;
}> {
  const templateId = input.templateId ?? "resto-inventory";
  const { column_map, constants } = buildDefaultMap(templateId, input.headers);

  const ws = await saveWorkspace({
    google_user_id: input.googleUserId,
    spreadsheet_id: input.spreadsheetId,
    spreadsheet_title: input.title,
    sheet_tab: input.sheetTab,
    template_id: templateId,
    column_map,
    constants,
    staff_names: [],
    outlets: [],
    default_outlet: null,
    headers: input.headers,
  });

  return { workspace: workspacePublic(ws), created: input.created };
}

async function connectById(
  spreadsheetId: string,
  googleUserId: string,
  created: boolean
) {
  const meta = await getSpreadsheetMeta(spreadsheetId);
  const sheetTab = meta.sheetTabs[0] || "Sheet1";
  const headers = await getHeaderRow(spreadsheetId, sheetTab);
  return persistConnection({
    googleUserId,
    spreadsheetId: meta.spreadsheetId,
    title: meta.title,
    sheetTab,
    headers,
    created,
  });
}

export async function POST(req: Request) {
  try {
    if (!(await hasTokens())) {
      return NextResponse.json(
        { ok: false, error: "Not signed in with Google." },
        { status: 401 }
      );
    }

    let body: ConnectBody = {};
    try {
      const text = await req.text();
      if (text.trim()) body = JSON.parse(text) as ConnectBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const googleUserId = (await peekGoogleUserId()) || "google-user";

    // Explicit pick from candidate list (still no paste URL).
    if (typeof body.spreadsheetId === "string" && body.spreadsheetId.trim()) {
      const result = await connectById(
        body.spreadsheetId.trim(),
        googleUserId,
        false
      );
      return NextResponse.json({
        ok: true,
        created: result.created,
        workspace: result.workspace,
      });
    }

    // Force-create a new sheet for the chosen template.
    if (body.mode === "create") {
      const templateId: TemplateId =
        body.templateId === "personal-expense" || body.templateId === "custom"
          ? body.templateId
          : "resto-inventory";
      const { meta, sheetTab, headers } =
        await createTemplateSpreadsheet(templateId);
      const result = await persistConnection({
        googleUserId,
        spreadsheetId: meta.spreadsheetId,
        title: meta.title,
        sheetTab,
        headers,
        created: true,
        templateId,
      });
      return NextResponse.json({
        ok: true,
        created: true,
        workspace: result.workspace,
      });
    }

    // List the `[zippp]` sheets so the user can choose one.
    if (body.mode === "list") {
      const list = await findZippSpreadsheets();
      return NextResponse.json({
        ok: true,
        needsPick: true,
        candidates: list.map((h: DriveSpreadsheetHit) => ({
          id: h.id,
          name: h.name,
          modifiedTime: h.modifiedTime,
        })),
      });
    }

    // Find-or-create: search Drive for name containing [zippp].
    const hits = await findZippSpreadsheets();
    const pick = pickBestZippSheet(hits);

    if (pick === "need_pick") {
      return NextResponse.json({
        ok: false,
        needsPick: true,
        candidates: hits.map((h: DriveSpreadsheetHit) => ({
          id: h.id,
          name: h.name,
          modifiedTime: h.modifiedTime,
        })),
        error: "Multiple [zippp] sheets found. Pick one.",
      });
    }

    if (pick) {
      const result = await connectById(pick.id, googleUserId, false);
      return NextResponse.json({
        ok: true,
        created: false,
        workspace: result.workspace,
      });
    }

    // None found → create `[zippp] Resto inventory` with resto headers.
    const { meta, sheetTab, headers } =
      await createRestoInventorySpreadsheet();
    const result = await persistConnection({
      googleUserId,
      spreadsheetId: meta.spreadsheetId,
      title: meta.title,
      sheetTab,
      headers,
      created: true,
    });

    return NextResponse.json({
      ok: true,
      created: true,
      workspace: result.workspace,
    });
  } catch (err) {
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
    console.error("POST /api/sheets/connect", err);
    return NextResponse.json(
      { ok: false, error: "Failed to connect spreadsheet." },
      { status: 500 }
    );
  }
}

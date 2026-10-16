import { NextResponse } from "next/server";
import {
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
import {
  buildDefaultMap,
  buildZippSheetTitle,
} from "@/lib/google/templates";
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
  /**
   * "find" (default) only finds; "create" makes a new sheet; "list" returns
   * the choices. Find never creates.
   */
  mode?: "find" | "create" | "list";
  /** Template for a newly created sheet (mode "create"). */
  templateId?: TemplateId;
  /** Display name for a new sheet (required for mode "create"). */
  sheetName?: string;
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

    // Force-create a new sheet for the chosen template + unique name.
    if (body.mode === "create") {
      const allowed: TemplateId[] = [
        "resto-inventory",
        "personal-expense",
        "sales-recap",
        "reimbursement",
        "custom",
      ];
      const templateId: TemplateId = allowed.includes(
        body.templateId as TemplateId
      )
        ? (body.templateId as TemplateId)
        : "resto-inventory";
      const title = buildZippSheetTitle(
        typeof body.sheetName === "string" ? body.sheetName : ""
      );
      if (!title) {
        return NextResponse.json(
          { ok: false, error: "Sheet name is required." },
          { status: 400 }
        );
      }
      const existing = await findZippSpreadsheets();
      const taken = existing.some(
        (h) => h.name.trim().toLowerCase() === title.toLowerCase()
      );
      if (taken) {
        return NextResponse.json(
          {
            ok: false,
            error: "A sheet with that name already exists. Pick another name.",
            duplicateName: true,
          },
          { status: 409 }
        );
      }
      const { meta, sheetTab, headers } = await createTemplateSpreadsheet(
        templateId,
        title
      );
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

    // Find an existing `[zippp]` sheet. This branch never creates one; the
    // client asks the user to create a new sheet or connect an existing one.
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

    // Nothing found. The client shows the setup choice.
    return NextResponse.json({ ok: true, none: true, candidates: [] });
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

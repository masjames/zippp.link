import { NextResponse } from "next/server";
import {
  deleteWorkspace,
  loadWorkspace,
  workspacePublic,
} from "@/lib/google/workspace-store";

export const runtime = "nodejs";

/** Current saved connection + map (no tokens). 404 if none. */
export async function GET() {
  const ws = await loadWorkspace();
  if (!ws) {
    return NextResponse.json(
      { ok: false, workspace: null, error: "No spreadsheet connected." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    workspace: workspacePublic(ws),
  });
}

/** Clear sheet connection only (keep Google login). */
export async function DELETE() {
  await deleteWorkspace();
  return NextResponse.json({ ok: true, workspace: null });
}

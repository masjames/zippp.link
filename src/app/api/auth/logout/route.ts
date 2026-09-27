import { NextResponse } from "next/server";
import { deleteTokens } from "@/lib/google/token-store";
import { deleteWorkspace } from "@/lib/google/workspace-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await deleteTokens();
  await deleteWorkspace();
  const url = new URL("/", req.url);
  url.searchParams.set("auth", "logged_out");
  return NextResponse.redirect(url);
}

export async function POST(req: Request) {
  await deleteTokens();
  await deleteWorkspace();
  return NextResponse.json({ ok: true, signedIn: false });
}

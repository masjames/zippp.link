import { NextResponse } from "next/server";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

/**
 * Does not consume the token. Renders a deep link so the Android app can open
 * and POST /api/auth/magic-link/consume.
 */
export async function GET(req: Request) {
  if (!mobileApiEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  if (token.length < 16) {
    return new NextResponse("Invalid or missing token", { status: 400 });
  }

  const deep = `zippp://auth?token=${encodeURIComponent(token)}`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zippp sign-in</title>
  <meta http-equiv="refresh" content="0;url=${deep}" />
</head>
<body style="font-family:system-ui,sans-serif;padding:24px;max-width:32rem">
  <h1>Open Zippp</h1>
  <p>If the app did not open, tap below or paste this token in the app.</p>
  <p><a href="${deep}">Open Zippp app</a></p>
  <p style="word-break:break-all;font-family:monospace;font-size:12px">${token.replace(/</g, "")}</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

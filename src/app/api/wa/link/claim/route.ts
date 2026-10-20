import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import {
    waChannelEnabled,
    waConfigured,
    waDisplayNumber,
} from "@/lib/wa/config";

export const runtime = "nodejs";

/**
 * Browser fallback when display number unset: shows the code the user must
 * paste into WhatsApp. Binding happens when they message that code (see handler).
 */
export async function GET(req: Request) {
    if (!waChannelEnabled() || !waConfigured()) {
        return NextResponse.redirect(absoluteUrl("/app/settings"));
    }
    const token = new URL(req.url).searchParams.get("token") ?? "";
    if (!/^[a-f0-9]{32}$/.test(token)) {
        return NextResponse.redirect(absoluteUrl("/app/settings"));
    }
    const display = waDisplayNumber();
    const text = encodeURIComponent(`zippp link ${token}`);
    if (display) {
        return NextResponse.redirect(`https://wa.me/${display}?text=${text}`);
    }
    const html = `<!doctype html><html><body style="font-family:system-ui;padding:24px">
<p>Send this message to the zippp WhatsApp number:</p>
<pre style="font-size:18px;padding:12px;background:#f3ede9;border-radius:12px">zippp link ${token}</pre>
<p><a href="/app/settings">Back to Settings</a></p>
</body></html>`;
    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

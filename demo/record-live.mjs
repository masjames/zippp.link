/**
 * Live recording for the Google OAuth verification video.
 *
 * Playwright records the page content, not the browser chrome, so the consent
 * screen and every app screen are captured without toolbars. The session is
 * interactive: you sign in with the Google account that owns a test sheet and
 * walk the shot list in `spec/discussions/google-verification-reply.md`.
 *
 *   npm run demo:live
 *
 * What it does:
 * - opens real Chrome with a dedicated profile (`.demo-profile`, gitignored),
 *   so the sign-in survives between runs;
 * - sets the region cookie to intl, so the demo is in English;
 * - keeps links that use target="_blank" in the same tab, because Playwright
 *   records one video per tab and the sheet step needs to stay in frame;
 * - records to `demo/out/raw-live/` and converts to
 *   `demo/out/zippp-google-verification-demo.mp4` when you close the window.
 *
 * Close the browser window when the flow is done. Ctrl+C works too.
 */
import { chromium } from "playwright";
import { mkdir, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

function arg(name, fallback) {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
}

const BASE = arg("base", "https://www.zippp.link");
const MINUTES = Number(arg("minutes", "25"));
const WIDTH = Number(arg("width", "1440"));
const HEIGHT = Number(arg("height", "900"));

const OUT = path.resolve("demo/out");
const RAW = path.join(OUT, "raw-live");
const PROFILE = path.resolve(".demo-profile");

await mkdir(RAW, { recursive: true });
await mkdir(PROFILE, { recursive: true });

const options = {
    headless: false,
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: { dir: RAW, size: { width: WIDTH, height: HEIGHT } },
    locale: "en-US",
    timezoneId: "Asia/Jakarta",
    acceptDownloads: true,
    // Chrome refuses Google sign-in when it detects an automated session. This
    // is the user's own account and the flow is the real flow.
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
    channel: "chrome",
};

let context;
const startedAt = Date.now();
try {
    context = await chromium.launchPersistentContext(PROFILE, options);
} catch (err) {
    console.warn("[demo] Chrome channel failed, falling back to Chromium:", err.message);
    delete options.channel;
    context = await chromium.launchPersistentContext(PROFILE, options);
}

const origin = new URL(BASE).origin;
const host = new URL(BASE).hostname;

await context.addCookies([
    { name: "zippp_region", value: "intl", domain: host, path: "/" },
]);
// Start signed out of zippp every time, so the consent screen is recorded, but
// keep the Google session from the profile so no password appears.
await context.clearCookies({ name: "zippp_sid" }).catch(() => {});
await context.grantPermissions(["camera", "microphone"], { origin }).catch(() => {});

// One tab, one video. Links that would open a new tab stay here.
await context.addInitScript(() => {
    document.addEventListener(
        "click",
        (event) => {
            const target = event.target;
            const link =
                target && target.closest
                    ? target.closest('a[target="_blank"]')
                    : null;
            if (link) link.target = "_self";
        },
        true
    );
});

const page = context.pages()[0] ?? (await context.newPage());
// Progress log, so the operator can follow along from the terminal.
page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
        console.log(`[demo] page: ${frame.url().slice(0, 120)}`);
    }
});
await page.goto(BASE, { waitUntil: "load" });
// Wait for the hero so the recording does not open on a blank page.
await page
    .getByText(/Sign in with Google/i)
    .first()
    .waitFor({ timeout: 30_000 })
    .catch(() => {});
await page.waitForTimeout(700);
const leadSeconds = Math.max(0, (Date.now() - startedAt) / 1000 - 0.3);
console.log(`[demo] Landing is up. Trimming ${leadSeconds.toFixed(1)}s of load time at export.`);

console.log(`
[demo] Recording. The window stays open until you close it.

  1. Sign in with Google. On the consent screen click "Show all services"
     so all three scopes are readable.
  2. Settings, Sheet: pick or create the [zippp] sheet (Drive permission).
  3. Snap: upload or photograph one receipt, check the card, press Accept.
  4. Open the Google Sheet link (same tab) and show the new rows.
  5. Settings: show the account email. Snap: show the debug panel.
  6. Settings: show Sign out. Do not press it.
  7. Close the window. The MP4 is written to demo/out/.

  Time limit: ${MINUTES} minutes. Ctrl+C stops and keeps the video.
`);

const closed = new Promise((resolve) => context.on("close", resolve));
const timer = setTimeout(() => {
    console.log("[demo] Time limit reached, closing.");
    context.close().catch(() => {});
}, MINUTES * 60_000);
process.on("SIGINT", () => {
    context.close().catch(() => {});
});

await closed;
clearTimeout(timer);
await new Promise((r) => setTimeout(r, 1500));

const files = (await readdir(RAW)).filter((f) => f.endsWith(".webm"));
if (files.length === 0) {
    console.error("[demo] No recording found in", RAW);
    process.exit(1);
}

const withTime = await Promise.all(
    files.map(async (f) => ({ f, t: (await stat(path.join(RAW, f))).mtimeMs }))
);
withTime.sort((a, b) => b.t - a.t);
const webm = path.join(RAW, withTime[0].f);
const mp4 = path.join(OUT, "zippp-google-verification-demo.mp4");

const ff = spawnSync(
    "ffmpeg",
    [
        "-y",
        "-ss", String(leadSeconds.toFixed(2)),
        "-i", webm,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        mp4,
    ],
    { encoding: "utf8" }
);

if (ff.status !== 0) {
    console.error(ff.stderr);
    console.error("[demo] ffmpeg failed. The WebM is still at", webm);
    process.exit(1);
}

console.log("[demo] OK", mp4);
console.log("[demo] Upload that file to YouTube as unlisted and put the link in the reply.");

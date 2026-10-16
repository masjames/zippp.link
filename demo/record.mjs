/**
 * Record demo/storyboard.html → demo/out/zippp-demo.webm then ffmpeg → mp4.
 */
import { chromium } from "playwright";
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = join(__dirname, "storyboard.html");
const outDir = join(__dirname, "out");
const videoDir = join(outDir, "raw");

await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: {
        dir: videoDir,
        size: { width: 1080, height: 1920 },
    },
});
const page = await context.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });

const demoMs = await page.evaluate(() => window.__DEMO_MS__ ?? 56000);
await page.waitForTimeout(demoMs + 800);

await context.close();
await browser.close();

const { readdirSync } = await import("node:fs");
const webm = readdirSync(videoDir).find((f) => f.endsWith(".webm"));
if (!webm) throw new Error("No webm recorded");

const webmPath = join(videoDir, webm);
const mp4Path = join(outDir, "zippp-end-to-end-demo.mp4");

const ff = spawnSync(
    "ffmpeg",
    [
        "-y",
        "-i",
        webmPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        mp4Path,
    ],
    { encoding: "utf8" }
);
if (ff.status !== 0) {
    console.error(ff.stderr);
    throw new Error("ffmpeg failed");
}

await copyFile(mp4Path, join(__dirname, "..", "public", "zippp-demo.mp4"));
console.log("OK", mp4Path);
console.log("Also copied to public/zippp-demo.mp4");

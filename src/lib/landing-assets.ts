import fs from "node:fs";
import path from "node:path";
import type { Lang } from "./region";

/**
 * Landing media that may not exist yet. Drop a file into `public/landing/` and
 * it is picked up with no code change:
 *   app-<lang>.png    hero screenshot (app-en.png / app-id.png)
 *   sheet-<lang>.png  month tab screenshot
 *   demo-<lang>.mp4   short product video
 * Anything missing renders as a placeholder box. Server-only.
 */
export type LandingAssets = {
    heroImage: string | null;
    sheetImage: string | null;
    demoVideo: string | null;
};

export function landingAssets(lang: Lang): LandingAssets {
    const dir = path.join(process.cwd(), "public", "landing");
    const file = (name: string) =>
        fs.existsSync(path.join(dir, name)) ? `/landing/${name}` : null;

    return {
        heroImage: file(`app-${lang}.png`),
        sheetImage: file(`sheet-${lang}.png`),
        demoVideo: file(`demo-${lang}.mp4`),
    };
}

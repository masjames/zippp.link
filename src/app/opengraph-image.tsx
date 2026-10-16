import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "zippp — You still do manual recap?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
    return renderOgImage("en");
}

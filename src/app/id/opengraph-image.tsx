import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "zippp — Untuk yang masih merekap manual";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
    return renderOgImage("id");
}

import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "zippp — For people who still type receipts";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
    return renderOgImage("en");
}

import { OG_SIZE, renderOgImage } from "@/lib/og-image";

export const alt = "zippp — Hari gini nyatet struk masih manual?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
    return renderOgImage("id");
}

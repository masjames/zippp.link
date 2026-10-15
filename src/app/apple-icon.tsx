import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ee5329",
                    borderRadius: 36,
                    color: "#1c0b09",
                    fontSize: 118,
                    fontWeight: 900,
                    fontFamily: "Arial Black, Arial, sans-serif",
                    letterSpacing: "-0.06em",
                }}
            >
                z
            </div>
        ),
        { ...size }
    );
}

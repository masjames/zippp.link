import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Brand mark: orange tile + bold z. */
export default function Icon() {
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
                    borderRadius: 7,
                    color: "#1c0b09",
                    fontSize: 22,
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

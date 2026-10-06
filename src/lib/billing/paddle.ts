import { createHmac, timingSafeEqual } from "node:crypto";

export type PaddleConfig = {
    clientToken: string;
    priceId: string;
    env: string;
    credits: number;
    usd: number;
};

export function paddleConfig(): PaddleConfig {
    return {
        clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
        priceId: process.env.PADDLE_PACK_PRICE_ID || "",
        env: process.env.PADDLE_ENV || "sandbox",
        credits: Number(process.env.PADDLE_PACK_CREDITS || 100),
        usd: Number(process.env.PADDLE_PACK_USD || 9),
    };
}

export function paddleConfigured(): boolean {
    const c = paddleConfig();
    return Boolean(c.clientToken && c.priceId);
}

/**
 * Verify a Paddle webhook signature.
 * Header: `Paddle-Signature: ts=<unix>;h1=<hex>`.
 * Signed payload: `<ts>:<rawBody>` with HMAC-SHA256 and the webhook secret.
 */
export function verifyPaddleSignature(
    rawBody: string,
    header: string | null,
    secret: string
): boolean {
    if (!header || !secret) return false;
    const parts = Object.fromEntries(
        header.split(";").map((kv) => kv.split("=") as [string, string])
    );
    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) return false;

    const expected = createHmac("sha256", secret)
        .update(`${ts}:${rawBody}`)
        .digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(h1, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

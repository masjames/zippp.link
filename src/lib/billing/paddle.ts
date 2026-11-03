import { createHmac, timingSafeEqual } from "node:crypto";

export type PaddleConfig = {
    clientToken: string;
    priceId: string;
    planPriceId: string;
    apiKey: string;
    env: string;
    credits: number;
    usd: number;
};

export function paddleConfig(): PaddleConfig {
    return {
        clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
        priceId: process.env.PADDLE_PACK_PRICE_ID || "",
        planPriceId: process.env.PADDLE_PLAN_PRICE_ID || "",
        apiKey: process.env.PADDLE_API_KEY || "",
        env: process.env.PADDLE_ENV || "sandbox",
        credits: Number(process.env.PADDLE_PACK_CREDITS || 100),
        usd: Number(process.env.PADDLE_PACK_USD || 9),
    };
}

export function paddleConfigured(): boolean {
    const c = paddleConfig();
    return Boolean(c.clientToken && c.priceId);
}

export function paddleApiBase(): string {
    return paddleConfig().env === "live"
        ? "https://api.paddle.com"
        : "https://sandbox-api.paddle.com";
}

/** Monthly subscription checkout. Price id lives in Paddle, not in this repo. */
export async function createSubscriptionCheckout(params: {
    userId: string;
    email: string | null;
}): Promise<string | null> {
    const c = paddleConfig();
    if (!c.apiKey || !c.planPriceId) return null;
    const res = await fetch(`${paddleApiBase()}/transactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${c.apiKey}`,
        },
        body: JSON.stringify({
            items: [{ price_id: c.planPriceId, quantity: 1 }],
            custom_data: { google_user_id: params.userId, plan: "pro" },
            ...(params.email ? { customer: { email: params.email } } : {}),
        }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
        data?: { checkout?: { url?: string } };
    };
    return data.data?.checkout?.url ?? null;
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

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { creditsForIdr, DOKU_ORDER_TTL_MIN, MIN_TOPUP_IDR } from "./config";
import { grant } from "./ledger";
import { billingConfigured, command } from "./redis";
import { onTopupApproved } from "./referral";
import { sendTelegram } from "../telegram";

/**
 * DOKU Checkout (hosted payment page) for the Indonesian region.
 *
 * Flow: `createDokuCheckout` signs a request to DOKU and stores an order keyed
 * by invoice number; the customer pays on DOKU's page; DOKU POSTs a signed
 * HTTP notification to `/api/doku/notify`, which grants credits once.
 *
 * Signature scheme (non-SNAP): HMAC-SHA256 over
 * `Client-Id:..\nRequest-Id:..\nRequest-Timestamp:..\nRequest-Target:..\nDigest:..`
 * where Digest is base64(SHA-256(body)). Header value is `HMACSHA256=<b64>`.
 */

export type DokuConfig = {
    env: "sandbox" | "production";
    clientId: string;
    secretKey: string;
    apiBase: string;
};

export function dokuConfig(): DokuConfig {
    const env = process.env.DOKU_ENV === "production" ? "production" : "sandbox";
    return {
        env,
        clientId: process.env.DOKU_CLIENT_ID || "",
        secretKey: process.env.DOKU_SECRET_KEY || "",
        apiBase:
            env === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com",
    };
}

export function dokuConfigured(): boolean {
    const c = dokuConfig();
    return Boolean(c.clientId && c.secretKey) && billingConfigured();
}

export function dokuDigest(rawBody: string): string {
    return createHash("sha256").update(rawBody, "utf8").digest("base64");
}

export function dokuSignature(input: {
    clientId: string;
    requestId: string;
    timestamp: string;
    target: string;
    digest: string;
    secretKey: string;
}): string {
    const raw = [
        `Client-Id:${input.clientId}`,
        `Request-Id:${input.requestId}`,
        `Request-Timestamp:${input.timestamp}`,
        `Request-Target:${input.target}`,
        `Digest:${input.digest}`,
    ].join("\n");
    const mac = createHmac("sha256", input.secretKey).update(raw, "utf8").digest("base64");
    return `HMACSHA256=${mac}`;
}

/** Verify the signature on a notification DOKU sent to `target` (our path). */
export function verifyDokuNotification(input: {
    rawBody: string;
    headers: Headers;
    target: string;
}): boolean {
    const { clientId, secretKey } = dokuConfig();
    if (!clientId || !secretKey) return false;
    const requestId = input.headers.get("request-id");
    const timestamp = input.headers.get("request-timestamp");
    const signature = input.headers.get("signature");
    const gotClient = input.headers.get("client-id");
    if (!requestId || !timestamp || !signature || gotClient !== clientId) return false;

    const expected = dokuSignature({
        clientId,
        requestId,
        timestamp,
        target: input.target,
        digest: dokuDigest(input.rawBody),
        secretKey,
    });
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

/* -------------------------------- orders -------------------------------- */

export type DokuOrderState = "pending" | "paid" | "failed" | "expired";

export type DokuOrder = {
    invoice: string;
    userId: string;
    email: string | null;
    amount: number;
    url: string;
    state: DokuOrderState;
    channel?: string;
    createdAt: number;
    expiresAt: number;
    updatedAt: number;
};

const orderKey = (invoice: string) => `bill:doku:${invoice}`;
const RECENT = "bill:doku:recent";

/**
 * Invoice numbers must be alphanumeric (card acquirers reject symbols) and at
 * most 30 chars. `ZP` + base36 time + 6 random chars is ~20 chars and unique
 * enough per merchant.
 */
function newInvoice(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `ZP${time}${rand}`;
}

async function save(order: DokuOrder): Promise<void> {
    await command(["SET", orderKey(order.invoice), JSON.stringify(order)]);
}

export async function getDokuOrder(invoice: string): Promise<DokuOrder | null> {
    const raw = (await command(["GET", orderKey(invoice)])) as string | null;
    if (!raw) return null;
    const order = JSON.parse(raw) as DokuOrder;
    if (order.state === "pending" && Date.now() > order.expiresAt) {
        const next = { ...order, state: "expired" as DokuOrderState, updatedAt: Date.now() };
        await save(next);
        return next;
    }
    return order;
}

export async function recentDokuOrders(limit = 30): Promise<DokuOrder[]> {
    const ids = ((await command(["LRANGE", RECENT, 0, limit - 1])) as string[] | null) ?? [];
    const out: DokuOrder[] = [];
    for (const id of ids) {
        const order = await getDokuOrder(id);
        if (order) out.push(order);
    }
    return out;
}

type CheckoutResponse = {
    message?: string[];
    response?: { payment?: { url?: string; expired_date?: string } };
};

/** Create a hosted checkout and return the order (with DOKU's payment URL). */
export async function createDokuCheckout(input: {
    userId: string;
    email: string | null;
    name: string | null;
    amountIdr: number;
    lang: "id" | "en";
    /** Absolute origin of this deployment, e.g. https://zippp.link */
    origin: string;
}): Promise<DokuOrder> {
    if (!dokuConfigured()) throw new Error("DOKU is not configured.");
    const amount = Math.floor(input.amountIdr);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP_IDR || amount % 1000 !== 0) {
        throw new Error(`Amount must be at least ${MIN_TOPUP_IDR} in steps of 1000.`);
    }

    const cfg = dokuConfig();
    const invoice = newInvoice();
    const target = "/checkout/v1/payment";
    const body = JSON.stringify({
        order: {
            amount,
            invoice_number: invoice,
            currency: "IDR",
            language: input.lang.toUpperCase(),
            auto_redirect: true,
            callback_url: `${input.origin}/app/topup?doku=${invoice}`,
            callback_url_cancel: `${input.origin}/app/topup`,
            line_items: [
                {
                    name: `zippp ${creditsForIdr(amount)} kredit`,
                    price: amount,
                    quantity: 1,
                },
            ],
        },
        payment: { payment_due_date: DOKU_ORDER_TTL_MIN },
        customer: {
            id: input.userId.slice(0, 50),
            name: (input.name || "zippp user").replace(/[^A-Za-z ]/g, "").trim() || "zippp user",
            email: input.email || undefined,
            country: "ID",
        },
        additional_info: {
            override_notification_url: `${input.origin}/api/doku/notify`,
        },
    });

    const requestId = randomUUID();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const signature = dokuSignature({
        clientId: cfg.clientId,
        requestId,
        timestamp,
        target,
        digest: dokuDigest(body),
        secretKey: cfg.secretKey,
    });

    const res = await fetch(`${cfg.apiBase}${target}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Client-Id": cfg.clientId,
            "Request-Id": requestId,
            "Request-Timestamp": timestamp,
            Signature: signature,
        },
        body,
        cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as CheckoutResponse;
    const url = json.response?.payment?.url;
    if (!res.ok || !url) {
        const msg = json.message?.join(", ") || `DOKU ${res.status}`;
        throw new Error(`Checkout failed: ${msg}`);
    }

    const now = Date.now();
    const order: DokuOrder = {
        invoice,
        userId: input.userId,
        email: input.email,
        amount,
        url,
        state: "pending",
        createdAt: now,
        expiresAt: now + DOKU_ORDER_TTL_MIN * 60 * 1000,
        updatedAt: now,
    };
    await save(order);
    await command(["LPUSH", RECENT, invoice]);
    await command(["LTRIM", RECENT, 0, 99]);
    return order;
}

export type DokuNotification = {
    transaction?: { status?: string; date?: string };
    order?: { invoice_number?: string; amount?: number | string };
    channel?: { id?: string };
};

/**
 * Apply a verified notification. Grants once per invoice; a replayed or
 * out-of-order notification is a no-op. Returns the resulting order or null
 * when the invoice is unknown.
 */
export async function applyDokuNotification(
    note: DokuNotification
): Promise<{ order: DokuOrder | null; granted: boolean }> {
    const invoice = note.order?.invoice_number;
    if (!invoice) return { order: null, granted: false };
    const order = await getDokuOrder(invoice);
    if (!order) return { order: null, granted: false };

    const status = (note.transaction?.status || "").toUpperCase();
    const amount = Number(note.order?.amount);
    const channel = note.channel?.id;

    if (status === "SUCCESS") {
        if (amount !== order.amount) {
            void sendTelegram(
                `⚠️ <b>DOKU amount mismatch</b>\ninvoice: <code>${invoice}</code>\nexpected ${order.amount}, got ${amount}`
            );
            return { order, granted: false };
        }
        const credits = creditsForIdr(order.amount);
        const granted = await grant({
            userId: order.userId,
            credits,
            source: "topup_doku",
            idem: `doku:${invoice}`,
            note: `invoice ${invoice}${channel ? ` via ${channel}` : ""}`,
        });
        const next: DokuOrder = { ...order, state: "paid", channel, updatedAt: Date.now() };
        await save(next);
        if (granted) {
            await onTopupApproved(order.userId, credits, `doku:${invoice}`);
            void sendTelegram(
                `💰 <b>DOKU paid</b> ${credits} credits\ninvoice: <code>${invoice}</code>\nemail: ${order.email ?? "?"}\nchannel: ${channel ?? "?"}`
            );
        }
        return { order: next, granted };
    }

    if (status === "FAILED" || status === "EXPIRED") {
        if (order.state === "paid") return { order, granted: false };
        const next: DokuOrder = {
            ...order,
            state: status === "FAILED" ? "failed" : "expired",
            channel,
            updatedAt: Date.now(),
        };
        await save(next);
        return { order: next, granted: false };
    }

    return { order, granted: false };
}

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { sendTelegram } from "../telegram";
import { creditsForIdr, ORDER_TTL_MIN } from "./config";
import { grant } from "./ledger";
import { command } from "./redis";
import { onTopupApproved } from "./referral";

/**
 * Kasera Pay QRIS. One create call returns a hosted checkout URL and the QR
 * string; a signed `payment.paid` webhook (or a status refresh on the return
 * page) grants credits once, idempotent on the Kasera request id.
 */

const BASE = (
    process.env.KASERA_BASE_URL || "https://pay.kasera.id"
).replace(/\/+$/, "");
const API_KEY = process.env.KASERA_API_KEY || "";
const WEBHOOK_SECRET = process.env.KASERA_WEBHOOK_SECRET || "";

export function kaseraConfigured(): boolean {
    return Boolean(API_KEY);
}

export function kaseraWebhookConfigured(): boolean {
    return Boolean(WEBHOOK_SECRET);
}

export type KaseraStatus =
    | "pending"
    | "succeeded"
    | "failed"
    | "expired"
    | "canceled";

export type KaseraOrder = {
    orderId: string;
    userId: string;
    email: string | null;
    amount: number;
    fee: number;
    net: number;
    txId: string;
    checkoutUrl: string;
    qrString: string | null;
    status: KaseraStatus;
    createdAt: number;
    expiresAt: number;
    paidAt: number | null;
};

const orderKey = (id: string) => `bill:kasera:${id}`;
const txKey = (tx: string) => `bill:kasera:tx:${tx}`;
const userKey = (userId: string) => `bill:kasera:user:${userId}`;

type KaseraTx = {
    id: string;
    status: string;
    amount: number;
    fee: number;
    net: number;
    checkout_url: string;
    expires_at: string;
    paid_at?: string | null;
    payment?: { qr_string?: string };
};

async function getJson<T>(key: string): Promise<T | null> {
    const raw = (await command(["GET", key])) as string | null;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function getKaseraOrder(
    orderId: string
): Promise<KaseraOrder | null> {
    return getJson<KaseraOrder>(orderKey(orderId));
}

async function saveOrder(order: KaseraOrder): Promise<void> {
    await command(["SET", orderKey(order.orderId), JSON.stringify(order)]);
    if (order.status !== "pending") {
        await command(["DEL", userKey(order.userId)]);
    }
}

/** Reuse a still-open order, or create a new Kasera payment request. */
export async function createKaseraOrder(input: {
    userId: string;
    email: string | null;
    name: string | null;
    amountIdr: number;
    origin: string;
}): Promise<KaseraOrder> {
    if (!kaseraConfigured()) throw new Error("QRIS is not configured.");
    const amount = Math.floor(input.amountIdr);

    const openId = (await command(["GET", userKey(input.userId)])) as
        | string
        | null;
    if (openId) {
        const open = await getKaseraOrder(openId);
        if (open && open.status === "pending" && open.expiresAt > Date.now()) {
            return open;
        }
        await command(["DEL", userKey(input.userId)]);
    }

    const orderId = randomUUID();
    const res = await fetch(`${BASE}/v1/transactions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": orderId,
        },
        body: JSON.stringify({
            amount,
            payment_methods: ["qris"],
            external_id: orderId,
            customer: {
                email: input.email || undefined,
                name: input.name || undefined,
            },
            return_url: `${input.origin}/app/topup/qris/${orderId}`,
            expires_in_minutes: ORDER_TTL_MIN,
            send_receipt: false,
        }),
    });
    const tx = (await res.json().catch(() => ({}))) as KaseraTx & {
        error?: { message?: string };
    };
    if (!res.ok || !tx.id || !tx.checkout_url) {
        throw new Error(tx.error?.message || `Kasera ${res.status}`);
    }

    const now = Date.now();
    const order: KaseraOrder = {
        orderId,
        userId: input.userId,
        email: input.email,
        amount,
        fee: Number(tx.fee) || 0,
        net: Number(tx.net) || 0,
        txId: tx.id,
        checkoutUrl: tx.checkout_url,
        qrString: tx.payment?.qr_string ?? null,
        status: "pending",
        createdAt: now,
        expiresAt: Date.parse(tx.expires_at) || now + ORDER_TTL_MIN * 60_000,
        paidAt: null,
    };
    await command(["SET", orderKey(orderId), JSON.stringify(order)]);
    await command(["SET", txKey(order.txId), orderId]);
    await command([
        "SET",
        userKey(input.userId),
        orderId,
        "EX",
        ORDER_TTL_MIN * 60,
    ]);
    return order;
}

async function setStatus(
    order: KaseraOrder,
    status: KaseraStatus,
    paidAt: number | null = null
): Promise<KaseraOrder> {
    const next: KaseraOrder = { ...order, status, paidAt };
    await saveOrder(next);
    return next;
}

/** Apply one webhook event. Returns false when the order is unknown. */
export async function applyKaseraEvent(event: {
    type?: string;
    data?: {
        payment_request_id?: string;
        external_id?: string;
        amount?: number;
        status?: string;
    };
}): Promise<boolean> {
    let order: KaseraOrder | null = null;
    if (event.data?.external_id) {
        order = await getKaseraOrder(event.data.external_id);
    }
    if (!order && event.data?.payment_request_id) {
        const mapped = (await command([
            "GET",
            txKey(event.data.payment_request_id),
        ])) as string | null;
        if (mapped) order = await getKaseraOrder(mapped);
    }
    if (!order) return false;

    if (event.type === "payment.paid") {
        if (order.status === "succeeded") return true;
        if (
            event.data?.amount !== undefined &&
            Number(event.data.amount) !== order.amount
        ) {
            void sendTelegram(
                `⚠️ <b>Kasera amount mismatch</b>\norder: <code>${order.orderId}</code>\nexpected ${order.amount}, got ${event.data.amount}`
            );
            return false;
        }
        const credits = creditsForIdr(order.amount);
        const granted = await grant({
            userId: order.userId,
            credits,
            source: "topup_qris",
            idem: `kasera:${order.txId}`,
            note: `QRIS ${order.txId}`,
        });
        await setStatus(order, "succeeded", Date.now());
        if (granted) {
            await onTopupApproved(order.userId, credits, `kasera:${order.txId}`);
            void sendTelegram(
                `💸 <b>QRIS paid</b> ${credits} credits\norder: <code>${order.orderId}</code>\nemail: ${order.email ?? "?"}`
            );
        }
        return true;
    }

    if (event.type === "payment.expired") {
        await setStatus(order, "expired");
        return true;
    }
    if (event.type === "payment.failed") {
        await setStatus(order, "failed");
        return true;
    }
    return false;
}

/** Pull the latest status from Kasera. Used by the return page. */
export async function refreshKaseraOrder(
    orderId: string
): Promise<KaseraOrder | null> {
    const order = await getKaseraOrder(orderId);
    if (!order || order.status !== "pending") return order;
    try {
        const res = await fetch(
            `${BASE}/v1/transactions/${encodeURIComponent(order.txId)}`,
            { headers: { Authorization: `Bearer ${API_KEY}` } }
        );
        if (!res.ok) return order;
        const tx = (await res.json()) as KaseraTx;
        if (tx.status === "succeeded") {
            await applyKaseraEvent({
                type: "payment.paid",
                data: {
                    payment_request_id: tx.id,
                    external_id: order.orderId,
                    amount: tx.amount,
                    status: tx.status,
                },
            });
        } else if (tx.status === "expired" || tx.status === "failed") {
            await setStatus(order, tx.status);
        }
    } catch {
        /* keep the stored status */
    }
    return getKaseraOrder(orderId);
}

/**
 * Verify `Kasera-Signature-V1: t=<unix>,v1=<hex>[,v1=...]`.
 * HMAC-SHA256 over `t + "." + rawBody`, 5 minute tolerance.
 */
export function verifyKaseraSignature(
    rawBody: string,
    header: string | null
): boolean {
    if (!header || !WEBHOOK_SECRET) return false;
    const parts = header.split(",").map((p) => p.trim());
    const t = Number((parts.find((p) => p.startsWith("t=")) || "").slice(2));
    if (!Number.isFinite(t)) return false;
    if (Math.abs(Date.now() / 1000 - t) > 300) return false;
    const expected = createHmac("sha256", WEBHOOK_SECRET)
        .update(`${t}.${rawBody}`)
        .digest("hex");
    return parts
        .filter((p) => p.startsWith("v1="))
        .map((p) => p.slice(3))
        .some((sig) => {
            const a = Buffer.from(expected, "utf8");
            const b = Buffer.from(sig, "utf8");
            return a.length === b.length && timingSafeEqual(a, b);
        });
}

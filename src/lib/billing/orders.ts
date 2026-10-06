import { randomUUID } from "node:crypto";
import { sendTelegram } from "../telegram";
import { creditsForIdr, MIN_TOPUP_IDR, ORDER_TTL_MIN } from "./config";
import { grant } from "./ledger";
import { billingConfigured, command } from "./redis";
import { onTopupApproved } from "./referral";

export type OrderState =
    | "pending"
    | "claimed"
    | "approved"
    | "rejected"
    | "expired";

export type Order = {
    id: string;
    userId: string;
    email: string | null;
    baseIdr: number;
    code: number;
    payIdr: number;
    state: OrderState;
    createdAt: number;
    expiresAt: number;
    updatedAt: number;
};

const orderKey = (id: string) => `bill:order:${id}`;
const OPEN = "bill:orders:open";
const RECENT = "bill:orders:recent";
const CODES = "bill:codes";
const hourKey = (userId: string, hour: number) => `bill:orders:hour:${userId}:${hour}`;
const TTL_MS = ORDER_TTL_MIN * 60 * 1000;

function assertConfigured() {
    if (!billingConfigured()) throw new Error("Billing is not configured.");
}

async function save(order: Order): Promise<void> {
    await command(["SET", orderKey(order.id), JSON.stringify(order)]);
}

export async function getOrder(id: string): Promise<Order | null> {
    const raw = (await command(["GET", orderKey(id)])) as string | null;
    if (!raw) return null;
    const order = JSON.parse(raw) as Order;
    if (
        (order.state === "pending" || order.state === "claimed") &&
        Date.now() > order.expiresAt
    ) {
        return close(order, "expired");
    }
    return order;
}

async function close(order: Order, state: OrderState): Promise<Order> {
    const next = { ...order, state, updatedAt: Date.now() };
    await save(next);
    await command(["SREM", OPEN, order.id]);
    await command(["SREM", CODES, String(order.code)]);
    return next;
}

async function reserveCode(): Promise<number> {
    for (let i = 0; i < 60; i++) {
        const code = 1 + Math.floor(Math.random() * 999);
        const added = await command(["SADD", CODES, String(code)]);
        if (added === 1) return code;
    }
    throw new Error("No GoPay code available.");
}

export async function openOrders(): Promise<Order[]> {
    const ids = ((await command(["SMEMBERS", OPEN])) as string[] | null) ?? [];
    const out: Order[] = [];
    for (const id of ids) {
        const order = await getOrder(id);
        if (order) out.push(order);
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
}

export async function recentOrders(limit = 30): Promise<Order[]> {
    const ids = ((await command(["LRANGE", RECENT, 0, limit - 1])) as string[] | null) ?? [];
    const out: Order[] = [];
    for (const id of ids) {
        const order = await getOrder(id);
        if (order) out.push(order);
    }
    return out;
}

export async function createOrder(input: {
    userId: string;
    email: string | null;
    baseIdr: number;
}): Promise<Order> {
    assertConfigured();
    const amount = Math.floor(input.baseIdr);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP_IDR || amount % 1000 !== 0) {
        throw new Error(`Amount must be at least ${MIN_TOPUP_IDR} in steps of 1000.`);
    }

    const hour = Math.floor(Date.now() / (60 * 60 * 1000));
    const count = await command(["INCR", hourKey(input.userId, hour)]);
    await command(["EXPIRE", hourKey(input.userId, hour), 3600]);
    if (typeof count === "number" && count > 5) {
        throw new Error("Too many orders this hour. Try again later.");
    }

    const open = await openOrders();
    if (open.some((o) => o.userId === input.userId)) {
        throw new Error("You already have an open order.");
    }

    const code = await reserveCode();
    const now = Date.now();
    const order: Order = {
        id: randomUUID(),
        userId: input.userId,
        email: input.email,
        baseIdr: amount,
        code,
        payIdr: amount + code,
        state: "pending",
        createdAt: now,
        expiresAt: now + TTL_MS,
        updatedAt: now,
    };
    await save(order);
    await command(["SADD", OPEN, order.id]);
    await command(["LPUSH", RECENT, order.id]);
    await command(["LTRIM", RECENT, 0, 99]);

    void sendTelegram(
        `🧾 <b>New GoPay order</b>\nid: <code>${order.id}</code>\nemail: ${order.email ?? "?"}\npay: Rp ${order.payIdr.toLocaleString("id-ID")} (base ${order.baseIdr.toLocaleString("id-ID")} + ${code})\n/admin`
    );
    return order;
}

export async function claimOrder(id: string, userId: string): Promise<Order | null> {
    const order = await getOrder(id);
    if (!order || order.userId !== userId) return null;
    if (order.state !== "pending") return order;
    const next = { ...order, state: "claimed" as OrderState, updatedAt: Date.now() };
    await save(next);
    void sendTelegram(
        `✅ <b>I have paid</b>\nid: <code>${order.id}</code>\npay: Rp ${order.payIdr.toLocaleString("id-ID")}\n/admin`
    );
    return next;
}

/**
 * Approve an order: grant credits once and run referral rewards.
 * Idempotent on the order id.
 */
export async function approveOrder(id: string): Promise<Order | null> {
    const order = await getOrder(id);
    if (!order) return null;
    if (order.state === "approved") return order;

    const credits = creditsForIdr(order.baseIdr);
    const granted = await grant({
        userId: order.userId,
        credits,
        source: "topup_gopay",
        idem: `gopay:${order.id}`,
        note: `order ${order.id}`,
    });
    if (granted) {
        await onTopupApproved(order.userId, credits, `gopay:${order.id}`);
        void sendTelegram(
            `💰 <b>Approved</b> ${credits} credits\nid: <code>${order.id}</code>\nemail: ${order.email ?? "?"}`
        );
    }
    return close(order, "approved");
}

export async function rejectOrder(id: string): Promise<Order | null> {
    const order = await getOrder(id);
    if (!order) return null;
    if (order.state === "rejected") return order;
    return close(order, "rejected");
}

export async function grantByEmail(
    userId: string,
    credits: number,
    idem: string,
    note: string
): Promise<boolean> {
    return grant({ userId, credits, source: "admin_grant", idem, note });
}

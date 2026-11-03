// @implements FEAT-117
import { billingConfigured, command } from "@/lib/billing/redis";
import { PLAN_INCLUDED_CAPTURES, PLAN_PERIOD_DAYS } from "@/lib/billing/config";

/**
 * Fair-use monthly plan. Usage is a counter per period; the meter is the
 * percentage of the included captures already used. Legacy credits stay
 * untouched for accounts without a plan.
 */

export type PlanRecord = {
    status: "active" | "canceled";
    plan: "pro";
    included: number;
    period_start: number;
    period_end: number;
    subscription_id: string | null;
    updated_at: number;
};

export type PlanUsage = {
    status: "active" | "canceled";
    included: number;
    used: number;
    used_pct: number;
    period_end: number;
};

const planKey = (userId: string) => `plan:user:${userId}`;
const subKey = (subscriptionId: string) => `plan:sub:${subscriptionId}`;
const usedKey = (userId: string, periodStart: number) =>
    `plan:used:${userId}:${periodStart}`;

const memPlans = new Map<string, PlanRecord>();
const memSubs = new Map<string, string>();
const memUsed = new Map<string, number>();

function useRedis(): boolean {
    if (billingConfigured()) return true;
    if (process.env.NODE_ENV === "production") {
        throw new Error("PLAN_STORE_UNAVAILABLE");
    }
    return false;
}

async function writePlan(userId: string, plan: PlanRecord): Promise<void> {
    if (!useRedis()) {
        memPlans.set(userId, plan);
        if (plan.subscription_id) {
            memSubs.set(plan.subscription_id, userId);
        }
        return;
    }
    await command(["SET", planKey(userId), JSON.stringify(plan)]);
    if (plan.subscription_id) {
        await command(["SET", subKey(plan.subscription_id), userId]);
    }
}

async function readPlan(userId: string): Promise<PlanRecord | null> {
    if (!useRedis()) return memPlans.get(userId) ?? null;
    const raw = await command(["GET", planKey(userId)]);
    if (!raw || typeof raw !== "string") return null;
    try {
        return JSON.parse(raw) as PlanRecord;
    } catch {
        return null;
    }
}

async function readUsed(userId: string, periodStart: number): Promise<number> {
    if (!useRedis()) return memUsed.get(usedKey(userId, periodStart)) ?? 0;
    const raw = await command(["GET", usedKey(userId, periodStart)]);
    const value = Number(raw ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function getPlanUsage(userId: string): Promise<PlanUsage | null> {
    const plan = await readPlan(userId);
    if (!plan) return null;
    const now = Date.now();
    if (now > plan.period_end) return null;
    const used = await readUsed(userId, plan.period_start);
    return {
        status: plan.status,
        included: plan.included,
        used,
        used_pct: Math.min(100, Math.round((used / plan.included) * 100)),
        period_end: plan.period_end,
    };
}

export async function activatePlan(params: {
    userId: string;
    subscriptionId: string | null;
    included?: number;
}): Promise<PlanRecord> {
    const now = Date.now();
    const existing = await readPlan(params.userId);
    if (
        existing &&
        existing.status === "active" &&
        existing.subscription_id === params.subscriptionId &&
        now < existing.period_end
    ) {
        return existing;
    }
    const start = now;
    const plan: PlanRecord = {
        status: "active",
        plan: "pro",
        included: params.included ?? PLAN_INCLUDED_CAPTURES,
        period_start: start,
        period_end: start + PLAN_PERIOD_DAYS * 24 * 60 * 60 * 1000,
        subscription_id: params.subscriptionId,
        updated_at: now,
    };
    await writePlan(params.userId, plan);
    if (existing && existing.period_start !== start) {
        if (!useRedis()) {
            memUsed.delete(usedKey(params.userId, existing.period_start));
        }
    }
    if (!useRedis()) {
        memUsed.delete(usedKey(params.userId, start));
    }
    return plan;
}

export async function cancelPlan(subscriptionId: string): Promise<boolean> {
    let userId: string | null = null;
    if (!useRedis()) {
        userId = memSubs.get(subscriptionId) ?? null;
    } else {
        const raw = await command(["GET", subKey(subscriptionId)]);
        userId = typeof raw === "string" ? raw : null;
    }
    if (!userId) return false;
    const plan = await readPlan(userId);
    if (!plan) return false;
    plan.status = "canceled";
    plan.updated_at = Date.now();
    await writePlan(userId, plan);
    return true;
}

export async function recordCapture(userId: string): Promise<PlanUsage | null> {
    const plan = await readPlan(userId);
    if (!plan) return null;
    if (Date.now() > plan.period_end) return null;
    const key = usedKey(userId, plan.period_start);
    if (!useRedis()) {
        memUsed.set(key, (memUsed.get(key) ?? 0) + 1);
    } else {
        await command(["INCR", key]);
        await command(["EXPIRE", key, PLAN_PERIOD_DAYS * 24 * 60 * 60]);
    }
    return getPlanUsage(userId);
}

/** Test helper */
export function __resetPlanStoreForTests(): void {
    memPlans.clear();
    memSubs.clear();
    memUsed.clear();
}

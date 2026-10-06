import { randomUUID } from "node:crypto";
import { CREDIT_TTL_DAYS } from "./config";
import { billingConfigured, command, evalScript } from "./redis";

export type LedgerSource =
    | "topup_gopay"
    | "topup_paddle"
    | "referral_reward"
    | "referral_bonus"
    | "admin_grant"
    | "refund"
    | "scan";

export type Lot = {
    id: string;
    credits: number;
    remaining: number;
    grantedAt: number;
    expiresAt: number;
    source: LedgerSource;
};

export type Account = { lots: Lot[] };
export type LedgerEntry = {
    id: string;
    at: number;
    userId: string;
    source: LedgerSource;
    credits: number;
    idem: string;
    note?: string;
};
export type UserRecord = {
    id: string;
    email: string | null;
    refCode: string;
    referredBy: string | null;
    firstTopupDone: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
const acctKey = (id: string) => `bill:acct:${id}`;
const ledgerKey = (id: string) => `bill:ledger:${id}`;
const userKey = (id: string) => `bill:user:${id}`;
const idemKey = (key: string) => `bill:idem:${key}`;
const refKey = (code: string) => `bill:ref:${code}`;
const emailKey = (email: string) => `bill:email:${email.trim().toLowerCase()}`;

/* ------------------------------ backends ------------------------------- */

// In-process fallback used only when Upstash is not configured (unconfigured
// mode); the app does not enforce credits in that mode.
const mem = new Map<string, string>();
const memLedger = new Map<string, LedgerEntry[]>();
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
        () => undefined,
        () => undefined
    );
    return run;
}

async function getRaw(key: string): Promise<string | null> {
    if (!billingConfigured()) return mem.get(key) ?? null;
    return (await command(["GET", key])) as string | null;
}

async function setRaw(key: string, value: string): Promise<void> {
    if (!billingConfigured()) {
        mem.set(key, value);
        return;
    }
    await command(["SET", key, value]);
}

/* ---------------------------- account reads ---------------------------- */

export async function getAccount(userId: string): Promise<Account> {
    const raw = await getRaw(acctKey(userId));
    if (!raw) return { lots: [] };
    try {
        const parsed = JSON.parse(raw) as Account;
        return Array.isArray(parsed.lots) ? parsed : { lots: [] };
    } catch {
        return { lots: [] };
    }
}

export async function balance(
    userId: string
): Promise<{ credits: number; soonestExpiry: number | null }> {
    const account = await getAccount(userId);
    const now = Date.now();
    let credits = 0;
    let soonest: number | null = null;
    for (const lot of account.lots) {
        if (lot.remaining <= 0 || lot.expiresAt <= now) continue;
        credits += lot.remaining;
        if (soonest === null || lot.expiresAt < soonest) soonest = lot.expiresAt;
    }
    return { credits, soonestExpiry: soonest };
}

export async function listLedger(
    userId: string,
    limit = 20
): Promise<LedgerEntry[]> {
    if (!billingConfigured()) {
        return (memLedger.get(userId) ?? []).slice(0, limit);
    }
    const raw = (await command([
        "LRANGE",
        ledgerKey(userId),
        0,
        limit - 1,
    ])) as string[] | null;
    return (raw ?? [])
        .map((line) => {
            try {
                return JSON.parse(line) as LedgerEntry;
            } catch {
                return null;
            }
        })
        .filter((x): x is LedgerEntry => x !== null);
}

/* ------------------------------- grants -------------------------------- */

const GRANT_LUA = `
local acct = redis.call('GET', KEYS[1])
local a = acct and cjson.decode(acct) or {lots={}}
table.insert(a.lots, cjson.decode(ARGV[1]))
redis.call('SET', KEYS[1], cjson.encode(a))
redis.call('LPUSH', KEYS[2], ARGV[2])
return 1
`;

/**
 * Grant credits as a new lot. Idempotent on `idem`: the same key never grants
 * twice. Returns true if this call granted, false if it was a duplicate.
 */
export async function grant(input: {
    userId: string;
    credits: number;
    source: LedgerSource;
    idem: string;
    ttlDays?: number;
    note?: string;
}): Promise<boolean> {
    if (input.credits <= 0) return false;
    const now = Date.now();
    const lot: Lot = {
        id: randomUUID(),
        credits: input.credits,
        remaining: input.credits,
        grantedAt: now,
        expiresAt: now + (input.ttlDays ?? CREDIT_TTL_DAYS) * DAY,
        source: input.source,
    };
    const entry: LedgerEntry = {
        id: randomUUID(),
        at: now,
        userId: input.userId,
        source: input.source,
        credits: input.credits,
        idem: input.idem,
        note: input.note,
    };

    if (billingConfigured()) {
        const result = await evalScript(
            `if redis.call('SET', KEYS[3], '1', 'NX') then ${GRANT_LUA} else return 0 end`,
            [acctKey(input.userId), ledgerKey(input.userId), idemKey(input.idem)],
            [JSON.stringify(lot), JSON.stringify(entry)]
        );
        return result === 1;
    }

    return withLock(async () => {
        const idem = mem.get(idemKey(input.idem));
        if (idem) return false;
        mem.set(idemKey(input.idem), "1");
        const account = await getAccount(input.userId);
        account.lots.push(lot);
        mem.set(acctKey(input.userId), JSON.stringify(account));
        const list = memLedger.get(input.userId) ?? [];
        list.unshift(entry);
        memLedger.set(input.userId, list);
        return true;
    });
}

/* ------------------------------- spending ------------------------------ */

const SPEND_LUA = `
if redis.call('SET', KEYS[3], '1', 'NX') == false then return 2 end
local raw = redis.call('GET', KEYS[1])
if not raw then redis.call('DEL', KEYS[3]) return 0 end
local a = cjson.decode(raw)
local now = tonumber(ARGV[1])
local need = tonumber(ARGV[2])
table.sort(a.lots, function(x,y) return x.expiresAt < y.expiresAt end)
for _,lot in ipairs(a.lots) do
  if lot.remaining > 0 and lot.expiresAt > now then
    local take = math.min(lot.remaining, need)
    lot.remaining = lot.remaining - take
    need = need - take
    if need == 0 then break end
  end
end
if need > 0 then redis.call('DEL', KEYS[3]) return 0 end
redis.call('SET', KEYS[1], cjson.encode(a))
redis.call('LPUSH', KEYS[2], ARGV[3])
return 1
`;

export type SpendResult = "ok" | "insufficient" | "duplicate";

/** Spend credits, earliest-expiry lot first. Atomic and idempotent on `idem`. */
export async function spend(input: {
    userId: string;
    credits: number;
    idem: string;
}): Promise<SpendResult> {
    const now = Date.now();
    const entry: LedgerEntry = {
        id: randomUUID(),
        at: now,
        userId: input.userId,
        source: "scan",
        credits: -input.credits,
        idem: input.idem,
    };

    if (billingConfigured()) {
        const result = await evalScript(
            SPEND_LUA,
            [acctKey(input.userId), ledgerKey(input.userId), idemKey(input.idem)],
            [now, input.credits, JSON.stringify(entry)]
        );
        return result === 1 ? "ok" : result === 2 ? "duplicate" : "insufficient";
    }

    return withLock(async () => {
        if (mem.get(idemKey(input.idem))) return "duplicate";
        const account = await getAccount(input.userId);
        account.lots.sort((a, b) => a.expiresAt - b.expiresAt);
        let need = input.credits;
        for (const lot of account.lots) {
            if (lot.remaining > 0 && lot.expiresAt > now) {
                const take = Math.min(lot.remaining, need);
                lot.remaining -= take;
                need -= take;
                if (need === 0) break;
            }
        }
        if (need > 0) return "insufficient";
        mem.set(idemKey(input.idem), "1");
        mem.set(acctKey(input.userId), JSON.stringify(account));
        const list = memLedger.get(input.userId) ?? [];
        list.unshift(entry);
        memLedger.set(input.userId, list);
        return "ok";
    });
}

/** Refund a scan charge and free its idempotency key so a retry can re-spend. */
export async function refundScan(userId: string, scanId: string): Promise<boolean> {
    if (billingConfigured()) {
        try {
            await command(["DEL", idemKey(`scan:${scanId}`)]);
        } catch {
            /* ignore */
        }
    } else {
        mem.delete(idemKey(`scan:${scanId}`));
    }
    return grant({
        userId,
        credits: 1,
        source: "refund",
        idem: `refund:${scanId}`,
        note: `refund for scan ${scanId}`,
    });
}

/* ---------------------------- user records ----------------------------- */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRefCode(): string {
    let out = "";
    for (let i = 0; i < 6; i++) {
        out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
}

export async function loadUser(userId: string): Promise<UserRecord | null> {
    const raw = await getRaw(userKey(userId));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as UserRecord;
    } catch {
        return null;
    }
}

export async function saveUser(user: UserRecord): Promise<void> {
    await setRaw(userKey(user.id), JSON.stringify(user));
}

/** Create the user record once, with a unique ref code. Referrer lock at first sign-in. */
export async function ensureUser(input: {
    userId: string;
    email: string | null;
    refCode: string | null; // from cookie, captured at first sign-in
}): Promise<UserRecord> {
    const existing = await loadUser(input.userId);
    if (existing) return existing;

    let refCode = makeRefCode();
    if (billingConfigured()) {
        for (let i = 0; i < 5; i++) {
            const taken = await command([
                "SET",
                refKey(refCode),
                input.userId,
                "NX",
            ]);
            if (taken) break;
            refCode = makeRefCode();
        }
    } else {
        mem.set(refKey(refCode), input.userId);
    }

    let referredBy: string | null = null;
    if (input.refCode) {
        const owner =
            (await getRaw(refKey(input.refCode))) ??
            (billingConfigured()
                ? null
                : (mem.get(refKey(input.refCode)) ?? null));
        if (owner && owner !== input.userId) referredBy = input.refCode;
    }

    const record: UserRecord = {
        id: input.userId,
        email: input.email,
        refCode,
        referredBy,
        firstTopupDone: false,
    };
    await saveUser(record);
    if (input.email) await setRaw(emailKey(input.email), input.userId);
    return record;
}

export async function userIdForCode(code: string): Promise<string | null> {
    return (await getRaw(refKey(code))) ?? (billingConfigured() ? null : mem.get(refKey(code)) ?? null);
}

export async function userIdForEmail(email: string): Promise<string | null> {
    return (await getRaw(emailKey(email))) ?? (billingConfigured() ? null : mem.get(emailKey(email)) ?? null);
}

export async function updateUser(
    userId: string,
    patch: Partial<UserRecord>
): Promise<UserRecord | null> {
    const user = await loadUser(userId);
    if (!user) return null;
    const next = { ...user, ...patch };
    await saveUser(next);
    return next;
}

// npm run grant -- <email> <credits>
// Writes an admin_grant lot. The user must have signed in once (email index).
import { randomUUID } from "node:crypto";

const [, , emailArg, creditsArg] = process.argv;
const email = (emailArg || "").trim().toLowerCase();
const credits = Number(creditsArg);

if (!email || !Number.isFinite(credits) || credits <= 0) {
    console.error("usage: npm run grant -- <email> <credits>");
    process.exit(1);
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
    console.error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing");
    process.exit(1);
}

async function cmd(args) {
    const res = await fetch(url.replace(/\/+$/, ""), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.result;
}

const userId = await cmd(["GET", `bill:email:${email}`]);
if (!userId) {
    console.error(`No user for ${email}. They must sign in at least once.`);
    process.exit(1);
}

const now = Date.now();
const lot = {
    id: randomUUID(),
    credits,
    remaining: credits,
    grantedAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    source: "admin_grant",
};
const entry = {
    id: randomUUID(),
    at: now,
    userId,
    source: "admin_grant",
    credits,
    idem: `cli:${randomUUID()}`,
    note: "grant script",
};

const script = `
local acct = redis.call('GET', KEYS[1])
local a = acct and cjson.decode(acct) or {lots={}}
table.insert(a.lots, cjson.decode(ARGV[1]))
redis.call('SET', KEYS[1], cjson.encode(a))
redis.call('LPUSH', KEYS[2], ARGV[2])
return 1`;

const result = await cmd([
    "EVAL",
    script,
    2,
    `bill:acct:${userId}`,
    `bill:ledger:${userId}`,
    JSON.stringify(lot),
    JSON.stringify(entry),
]);

console.log(result === 1 ? `granted ${credits} credits to ${email}` : "grant failed");

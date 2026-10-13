import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { businessInfo } from "./business";

/**
 * Challenge for revealing the public contact email. The address never appears
 * in the initial HTML; the client must solve a+b against a signed token.
 */

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
    return (
        process.env.CONTACT_REVEAL_SECRET ||
        process.env.TOKEN_ENCRYPTION_KEY ||
        process.env.DOKU_SECRET_KEY ||
        ""
    );
}

export type ContactChallenge = {
    a: number;
    b: number;
    token: string;
};

function sign(payload: string): string {
    const key = secret();
    if (!key) return "";
    return createHmac("sha256", key).update(payload).digest("base64url");
}

export function contactRevealConfigured(): boolean {
    return Boolean(secret() && businessInfo().email);
}

export function createContactChallenge(): ContactChallenge | null {
    if (!contactRevealConfigured()) return null;
    const a = randomInt(2, 12);
    const b = randomInt(2, 12);
    const exp = Date.now() + TTL_MS;
    const payload = `${a}:${b}:${a + b}:${exp}`;
    return { a, b, token: `${exp}.${sign(payload)}` };
}

export function verifyContactChallenge(input: {
    a: number;
    b: number;
    sum: number;
    token: string;
}): boolean {
    if (!contactRevealConfigured()) return false;
    const [expRaw, sig] = input.token.split(".");
    const exp = Number(expRaw);
    if (!sig || !Number.isFinite(exp) || Date.now() > exp) return false;
    if (input.a + input.b !== input.sum) return false;
    const payload = `${input.a}:${input.b}:${input.sum}:${exp}`;
    const expected = sign(payload);
    const x = Buffer.from(expected, "utf8");
    const y = Buffer.from(sig, "utf8");
    return x.length === y.length && timingSafeEqual(x, y);
}

export function contactEmail(): string {
    return businessInfo().email;
}

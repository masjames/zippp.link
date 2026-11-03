import { billingConfigured, command } from "@/lib/billing/redis";

const scanOwnerKey = (userId: string, scanId: string) =>
    `scan:owner:${userId}:${scanId}`;

const TTL_SECONDS = 24 * 60 * 60;

const memOwners = new Map<string, number>();

/** Remember that a scan id was issued by the server for this user. */
export async function recordScanOwner(userId: string, scanId: string): Promise<void> {
    if (!billingConfigured()) {
        memOwners.set(`${userId}:${scanId}`, Date.now());
        return;
    }
    try {
        await command([
            "SET",
            scanOwnerKey(userId, scanId),
            "1",
            "EX",
            TTL_SECONDS,
        ]);
    } catch {
        /* best effort; the append path is still protected by the credit ledger */
    }
}

/**
 * True when the scan id was issued to this user. If the owner record is
 * missing (old web clients generate their own UUID), the caller may choose to
 * allow it. Mobile callers should require this.
 */
export async function hasScanOwner(userId: string, scanId: string): Promise<boolean> {
    if (!billingConfigured()) {
        return memOwners.has(`${userId}:${scanId}`);
    }
    try {
        const value = await command(["GET", scanOwnerKey(userId, scanId)]);
        return value === "1";
    } catch {
        // Do not turn a store outage into a false "not issued" rejection.
        return true;
    }
}

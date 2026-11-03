import { billingConfigured, command, evalScript } from "@/lib/billing/redis";

export type DeviceRecord = {
    device_id: string;
    user_id: string;
    device_name: string;
    app_version: string;
    platform: string;
    paired_at: number;
    last_seen_at: number;
    revoked: boolean;
    revoked_at?: number;
    jti: string;
};

const deviceKey = (deviceId: string) => `auth:device:${deviceId}`;
const userDevicesKey = (userId: string) => `auth:user_devices:${userId}`;

const memDevices = new Map<string, DeviceRecord>();
const memUserDevices = new Map<string, Set<string>>();

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function storeRequired(): boolean {
    if (billingConfigured()) return true;
    if (isProduction()) {
        throw new Error("AUTH_STORE_UNAVAILABLE");
    }
    return false;
}

function validDeviceId(deviceId: string): boolean {
    return /^[A-Za-z0-9._-]{8,128}$/.test(deviceId);
}

function normalizeText(value: string | undefined, fallback: string, max: number): string {
    const text = (value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
    return (text || fallback).slice(0, max);
}

export async function registerDevice(params: {
    deviceId: string;
    userId: string;
    deviceName?: string;
    appVersion?: string;
    platform?: string;
    jti: string;
}): Promise<DeviceRecord> {
    if (!validDeviceId(params.deviceId)) {
        throw new Error("INVALID_DEVICE_ID");
    }

    const now = Date.now();
    const existing = await getDevice(params.deviceId);
    if (existing && existing.user_id !== params.userId) {
        throw new Error("DEVICE_CONFLICT");
    }

    const record: DeviceRecord = {
        device_id: params.deviceId,
        user_id: params.userId,
        device_name: normalizeText(params.deviceName, "Android Device", 80),
        app_version: normalizeText(params.appVersion, "1.0.0", 32),
        platform: normalizeText(params.platform, "android", 32),
        paired_at: existing?.paired_at ?? now,
        last_seen_at: now,
        revoked: false,
        jti: params.jti,
    };

    if (!storeRequired()) {
        memDevices.set(record.device_id, record);
        let userSet = memUserDevices.get(record.user_id);
        if (!userSet) {
            userSet = new Set();
            memUserDevices.set(record.user_id, userSet);
        }
        userSet.add(record.device_id);
        return record;
    }

    await command(["SET", deviceKey(record.device_id), JSON.stringify(record)]);
    await command(["SADD", userDevicesKey(record.user_id), record.device_id]);
    return record;
}

export async function getDevice(deviceId: string): Promise<DeviceRecord | null> {
    if (!billingConfigured()) {
        if (isProduction()) return null;
        return memDevices.get(deviceId) ?? null;
    }

    try {
        const raw = await command(["GET", deviceKey(deviceId)]);
        if (!raw || typeof raw !== "string") return null;
        return JSON.parse(raw) as DeviceRecord;
    } catch {
        // Fail closed. A store outage must not turn into an unrevoked device.
        return null;
    }
}

/**
 * Update last_seen_at without racing a concurrent revoke.
 * The Lua script checks the stored record under the same key before writing.
 */
export async function touchDevice(deviceId: string): Promise<void> {
    if (!billingConfigured()) {
        if (isProduction()) return;
        const dev = memDevices.get(deviceId);
        if (dev && !dev.revoked) {
            dev.last_seen_at = Date.now();
            memDevices.set(deviceId, dev);
        }
        return;
    }

    try {
        await evalScript(
            `local raw = redis.call('GET', KEYS[1])
             if not raw then return 0 end
             local d = cjson.decode(raw)
             if d.revoked then return 0 end
             d.last_seen_at = tonumber(ARGV[1])
             redis.call('SET', KEYS[1], cjson.encode(d))
             return 1`,
            [deviceKey(deviceId)],
            [Date.now()]
        );
    } catch {
        /* last seen is best effort; never fail a request for it */
    }
}

export async function isDeviceRevoked(
    deviceId: string,
    jti?: string,
    userId?: string
): Promise<boolean> {
    const dev = await getDevice(deviceId);
    if (!dev) return true;
    if (dev.revoked) return true;
    if (jti && dev.jti !== jti) return true;
    if (userId && dev.user_id !== userId) return true;
    return false;
}

export async function revokeDevice(deviceId: string, userId?: string): Promise<boolean> {
    const dev = await getDevice(deviceId);
    if (!dev) return false;
    if (userId && dev.user_id !== userId) return false;
    if (dev.revoked) return true;

    dev.revoked = true;
    dev.revoked_at = Date.now();

    if (!billingConfigured()) {
        if (isProduction()) return false;
        memDevices.set(deviceId, dev);
        return true;
    }

    await command(["SET", deviceKey(deviceId), JSON.stringify(dev)]);
    return true;
}

export async function listUserDevices(userId: string): Promise<DeviceRecord[]> {
    if (!billingConfigured()) {
        if (isProduction()) return [];
        const devIds = memUserDevices.get(userId);
        if (!devIds) return [];
        const result: DeviceRecord[] = [];
        for (const id of devIds) {
            const dev = memDevices.get(id);
            if (dev) result.push(dev);
        }
        return result.sort((a, b) => b.paired_at - a.paired_at);
    }

    try {
        const rawIds = await command(["SMEMBERS", userDevicesKey(userId)]);
        if (!Array.isArray(rawIds) || rawIds.length === 0) return [];

        const devices: DeviceRecord[] = [];
        for (const id of rawIds) {
            if (typeof id === "string") {
                const dev = await getDevice(id);
                if (dev) devices.push(dev);
            }
        }
        return devices.sort((a, b) => b.paired_at - a.paired_at);
    } catch {
        return [];
    }
}

export async function revokeAllUserDevices(userId: string): Promise<number> {
    const devices = await listUserDevices(userId);
    let count = 0;
    for (const dev of devices) {
        if (!dev.revoked) {
            const ok = await revokeDevice(dev.device_id, userId);
            if (ok) count++;
        }
    }
    return count;
}

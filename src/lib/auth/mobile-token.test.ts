import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MOBILE_JWT_SECRET = "test-only-mobile-secret-that-is-at-least-32-bytes";

import { signMobileToken, verifyMobileToken } from "./mobile-token";
import { registerDevice, revokeDevice } from "./device-store";

test("a signed mobile token verifies for its own device", async () => {
    const deviceId = "device-test-0001";
    await registerDevice({
        deviceId,
        userId: "google-user-a",
        jti: "jti-a",
        deviceName: "Pixel Test",
    });
    const { token } = signMobileToken({
        userId: "google-user-a",
        email: "a@example.com",
        deviceId,
        jti: "jti-a",
    });
    const result = await verifyMobileToken(token);
    assert.equal(result.valid, true);
    if (result.valid) {
        assert.equal(result.claims.sub, "google-user-a");
        assert.equal(result.claims.aud, "zippp-mobile");
        assert.equal(result.claims.iss, "zippp.link");
    }
});

test("a token cannot claim another user on the same device", async () => {
    const deviceId = "device-test-0002";
    await registerDevice({
        deviceId,
        userId: "google-user-a",
        jti: "jti-b",
    });
    const { token } = signMobileToken({
        userId: "google-user-b",
        email: "b@example.com",
        deviceId,
        jti: "jti-b",
    });
    const result = await verifyMobileToken(token);
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.error, "DEVICE_REVOKED");
});

test("a revoked device is rejected", async () => {
    const deviceId = "device-test-0003";
    await registerDevice({
        deviceId,
        userId: "google-user-c",
        jti: "jti-c",
    });
    const { token } = signMobileToken({
        userId: "google-user-c",
        email: "c@example.com",
        deviceId,
        jti: "jti-c",
    });
    assert.equal((await verifyMobileToken(token)).valid, true);
    await revokeDevice(deviceId, "google-user-c");
    const result = await verifyMobileToken(token);
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.error, "DEVICE_REVOKED");
});

test("a token with a mismatched jti is rejected", async () => {
    const deviceId = "device-test-0004";
    await registerDevice({
        deviceId,
        userId: "google-user-d",
        jti: "jti-current",
    });
    const { token } = signMobileToken({
        userId: "google-user-d",
        email: "d@example.com",
        deviceId,
        jti: "jti-old",
    });
    const result = await verifyMobileToken(token);
    assert.equal(result.valid, false);
    if (!result.valid) assert.equal(result.error, "DEVICE_REVOKED");
});

import { test } from "node:test";
import assert from "node:assert/strict";


import {
    generatePairingCode,
    normalizePairingCode,
    formatPairingCode,
    createPairingSession,
    claimPairingCode,
} from "./pairing-store";

test("pairing codes are 8 Crockford characters", () => {
    for (let i = 0; i < 500; i++) {
        const code = generatePairingCode();
        assert.match(code, /^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
});

test("pairing input is normalized and formatted", () => {
    assert.equal(normalizePairingCode(" abcd-efgh "), "ABCDEFGH");
    assert.equal(normalizePairingCode("o0il"), "0011");
    assert.equal(formatPairingCode("ABCDEFGH"), "ABCD-EFGH");
});

test("a pairing code is single-use", async () => {
    const session = await createPairingSession({
        userId: "pair-user-a",
        email: "a@example.com",
    });
    const first = await claimPairingCode(session.code, "127.0.0.1");
    assert.equal(first.ok, true);
    const second = await claimPairingCode(session.code, "127.0.0.1");
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, "INVALID_PAIRING_CODE");
});

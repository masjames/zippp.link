import assert from "node:assert/strict";
import test from "node:test";
import type { OAuth2Client } from "google-auth-library";
import { resolveGoogleUser } from "./oauth";

function client(getTokenInfo: () => Promise<unknown>): OAuth2Client {
    return { getTokenInfo } as unknown as OAuth2Client;
}

test("Google identity uses the verified subject from token info", async () => {
    const result = await resolveGoogleUser(
        client(async () => ({ sub: "verified-subject", email: null })),
        "test-access-token"
    );
    assert.deepEqual(result, { id: "verified-subject", email: null });
});

test("missing Google subject fails closed instead of creating a generic user", async () => {
    await assert.rejects(
        () => resolveGoogleUser(client(async () => ({ email: null })), "test-access-token"),
        /identity verification failed/
    );
});

test("Google token-info errors fail closed", async () => {
    await assert.rejects(
        () => resolveGoogleUser(client(async () => { throw new Error("test failure"); }), "test-access-token"),
        /identity verification failed/
    );
});

import test from "node:test";
import assert from "node:assert/strict";
import {
    isLocalPreviewAuthEnabled,
    localPreviewIdentity,
    LOCAL_PREVIEW_USER_ID,
} from "./local-preview";

const development = {
    NODE_ENV: "development",
    ZIPPP_LOCAL_DUMMY_AUTH: "1",
    ZIPPP_LOCAL_DUMMY_HOST: "susi.tail6078b4.ts.net",
};

test("dummy identity requires explicit development opt-in and a local or tailnet host", () => {
    assert.equal(isLocalPreviewAuthEnabled(development), true);
    assert.equal(
        localPreviewIdentity(new Request("http://127.0.0.1:3000/api/auth/me"), development)?.googleUserId,
        LOCAL_PREVIEW_USER_ID
    );
    assert.equal(
        localPreviewIdentity(new Request("http://100.108.141.6:3000/api/auth/me"), development)?.googleUserId,
        LOCAL_PREVIEW_USER_ID
    );
    assert.equal(
        localPreviewIdentity(
            new Request("https://susi.tail6078b4.ts.net:39876/api/auth/me"),
            development
        )?.googleUserId,
        LOCAL_PREVIEW_USER_ID
    );
    assert.equal(localPreviewIdentity(new Request("https://example.com/api/auth/me"), development), null);
    assert.equal(localPreviewIdentity(new Request("http://100.128.0.1/api/auth/me"), development), null);
});

test("production and Vercel never issue the dummy identity", () => {
    assert.equal(
        isLocalPreviewAuthEnabled({ NODE_ENV: "production", ZIPPP_LOCAL_DUMMY_AUTH: "1" }),
        false
    );
    assert.equal(
        localPreviewIdentity(
            new Request("http://127.0.0.1/api/auth/me"),
            { ...development, VERCEL: "1" }
        ),
        null
    );
});

test("dummy identity contains no admin or billing claims", () => {
    assert.deepEqual(
        localPreviewIdentity(new Request("http://100.108.141.6/api/auth/me"), development),
        {
            userId: LOCAL_PREVIEW_USER_ID,
            googleUserId: LOCAL_PREVIEW_USER_ID,
            email: "local-preview@example.invalid",
            localPreview: true,
        }
    );
});

/**
 * One-time OAuth to mint a donation Drive refresh token.
 *
 * Run locally with the operator's Google account:
 *   node scripts/donation-drive-auth.mjs
 *
 * Before running, add this Authorized redirect URI to the OAuth 2.0 client in
 * Google Cloud Console (APIs & Services -> Credentials -> the web client used
 * by zippp):
 *
 *   http://localhost:53682/callback
 *
 * The script prints DONATION_GOOGLE_REFRESH_TOKEN. Put it in Vercel for the
 * zippp-link project (Production and Preview), then redeploy. Scope is
 * drive.file, so the app can only see files it creates.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

function loadEnvLocal() {
    try {
        const raw = readFileSync(".env.local", "utf8");
        for (const line of raw.split("\n")) {
            const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (!m || process.env[m[1]]) continue;
            process.env[m[1]] = m[2]
                .trim()
                .replace(/^["']|["']$/g, "");
        }
    } catch {
        /* env may already be exported */
    }
}

loadEnvLocal();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
    console.error(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required. Put them in .env.local or export them."
    );
    process.exit(1);
}

const client = new OAuth2Client(clientId, clientSecret, REDIRECT);
const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SCOPE],
});

console.log("1) Add this Authorized redirect URI to the OAuth client:");
console.log(`   ${REDIRECT}`);
console.log("2) Open this URL and approve with the operator Google account:");
console.log(url);
console.log("Waiting for Google to redirect back...");

const server = createServer(async (req, res) => {
    const u = new URL(req.url || "/", REDIRECT);
    if (u.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
    }
    const error = u.searchParams.get("error");
    const code = u.searchParams.get("code");
    if (error || !code) {
        res.end(`Auth failed: ${error || "no code"}`);
        console.error(`Auth failed: ${error || "no code"}`);
        server.close();
        return;
    }
    try {
        const { tokens } = await client.getToken(code);
        if (!tokens.refresh_token) {
            res.end("No refresh token. Re-run and approve the consent screen.");
            console.error("No refresh token returned.");
        } else {
            res.end("Done. Return to the terminal.");
            console.log("\nAdd to Vercel (zippp-link, Production and Preview):\n");
            console.log(`DONATION_GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log("\nThen redeploy.");
        }
    } catch (err) {
        res.end("Token exchange failed.");
        console.error(
            "Token exchange failed:",
            err instanceof Error ? err.message : String(err)
        );
    } finally {
        server.close();
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`   (listening on ${REDIRECT})`);
});

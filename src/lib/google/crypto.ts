import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Derive a 32-byte AES key from TOKEN_ENCRYPTION_KEY.
 * Accepts 64-char hex, or any string (SHA-256 hashed).
 * Returns null if env is unset — caller may store plaintext with a "plain:" prefix.
 */
export function encryptionKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.trim() === "") return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Encrypt UTF-8 plaintext. Format: v1:<iv_b64>:<tag_b64>:<ct_b64> or plain:<text>. */
export function encryptSecret(plaintext: string): string {
  const key = encryptionKey();
  if (!key) {
    return `plain:${plaintext}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (stored.startsWith("plain:")) {
    return stored.slice("plain:".length);
  }
  if (!stored.startsWith("v1:")) {
    throw new Error("Unrecognized encrypted secret format.");
  }
  const key = encryptionKey();
  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required to decrypt stored tokens."
    );
  }
  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Corrupt encrypted secret.");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8"
  );
}

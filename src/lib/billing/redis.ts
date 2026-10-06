import { UPSTASH_TOKEN, UPSTASH_URL } from "./config";

/** True when a durable, atomic store is configured. */
export function billingConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

/** Run one Upstash REST command. */
export async function command(args: unknown[]): Promise<unknown> {
  const res = await fetch(UPSTASH_URL.replace(/\/+$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (typeof json.error === "string") throw new Error(json.error);
  return json.result;
}

/** Run a Lua script (atomic). */
export function evalScript(
  script: string,
  keys: string[],
  args: (string | number)[]
): Promise<unknown> {
  return command(["EVAL", script, keys.length, ...keys, ...args]);
}

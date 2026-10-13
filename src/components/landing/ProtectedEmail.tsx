"use client";

import { useEffect, useState } from "react";
import type { T } from "@/lib/t";

type Challenge = { a: number; b: number; token: string };

/**
 * Contact email is not in the HTML. User clicks, solves a short sum, then
 * gets a mailto link. Stops dumb scrapers; humans (and reviewers) still reach us.
 */
export default function ProtectedEmail({ t }: { t: T }) {
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [open, setOpen] = useState(false);
    const [sum, setSum] = useState("");
    const [email, setEmail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancel = false;
        void fetch("/api/contact/reveal", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                if (!cancel && data.ok) setChallenge(data.challenge as Challenge);
            })
            .catch(() => {});
        return () => {
            cancel = true;
        };
    }, []);

    async function reveal() {
        if (!challenge) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/contact/reveal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    a: challenge.a,
                    b: challenge.b,
                    sum: Number(sum),
                    token: challenge.token,
                }),
            });
            const data = await res.json();
            if (data.ok && data.email) {
                setEmail(data.email as string);
            } else {
                setError(t("contact.reveal.wrong"));
                const next = await fetch("/api/contact/reveal", { cache: "no-store" }).then(
                    (r) => r.json()
                );
                if (next.ok) {
                    setChallenge(next.challenge as Challenge);
                    setSum("");
                }
            }
        } catch {
            setError(t("contact.reveal.wrong"));
        } finally {
            setBusy(false);
        }
    }

    if (email) {
        return (
            <a
                href={`mailto:${email}`}
                className="inline-flex items-center rounded-full bg-maroon px-6 py-3 font-semibold text-white"
            >
                {email}
            </a>
        );
    }

    if (!open) {
        return (
            <button
                type="button"
                disabled={!challenge}
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-full bg-maroon px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
                {t("contact.reveal.show")}
            </button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-body">
                {challenge
                    ? t("contact.reveal.prompt")
                          .replace("{a}", String(challenge.a))
                          .replace("{b}", String(challenge.b))
                    : t("contact.reveal.show")}
            </label>
            <input
                type="number"
                inputMode="numeric"
                value={sum}
                onChange={(e) => setSum(e.target.value)}
                className="w-20 rounded-xl border-2 border-line bg-card px-3 py-2 text-body"
                aria-label={t("contact.reveal.prompt")}
            />
            <button
                type="button"
                disabled={busy || sum === ""}
                onClick={reveal}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
                {t("contact.reveal.submit")}
            </button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
    );
}

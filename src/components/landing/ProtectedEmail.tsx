"use client";

import { useEffect, useState } from "react";

type Challenge = { a: number; b: number; token: string };

type Labels = {
    show: string;
    prompt: string;
    submit: string;
    wrong: string;
};

/**
 * Contact email is not in the HTML. User clicks, solves a short sum, then
 * gets a mailto link. Stops dumb scrapers; humans (and reviewers) still reach us.
 */
export default function ProtectedEmail({ labels }: { labels: Labels }) {
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
                setError(labels.wrong);
                const next = await fetch("/api/contact/reveal", { cache: "no-store" }).then(
                    (r) => r.json()
                );
                if (next.ok) {
                    setChallenge(next.challenge as Challenge);
                    setSum("");
                }
            }
        } catch {
            setError(labels.wrong);
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
                {labels.show}
            </button>
        );
    }

    const prompt = challenge
        ? labels.prompt
              .replace("{a}", String(challenge.a))
              .replace("{b}", String(challenge.b))
        : labels.show;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-body">{prompt}</label>
            <input
                type="number"
                inputMode="numeric"
                value={sum}
                onChange={(e) => setSum(e.target.value)}
                className="w-20 rounded-xl border-2 border-line bg-card px-3 py-2 text-body"
                aria-label={prompt}
            />
            <button
                type="button"
                disabled={busy || sum === ""}
                onClick={reveal}
                className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
                {labels.submit}
            </button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
    );
}

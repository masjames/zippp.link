"use client";

import { useEffect, useState } from "react";
import { fill } from "@/lib/t";

type Labels = {
    loading: string;
    invited: string;
    join: string;
    busy: string;
    signIn: string;
    success: string;
    open: string;
    invalid: string;
    missingCode: string;
    emailMismatch: string;
    error: string;
};

type Phase =
    | "loading"
    | "ready"
    | "signedOut"
    | "joining"
    | "joined"
    | "invalid"
    | "missing"
    | "mismatch"
    | "error";

export default function JoinClient({
    code,
    labels,
}: {
    code: string;
    labels: Labels;
}) {
    const [phase, setPhase] = useState<Phase>(code ? "loading" : "missing");
    const [spaceName, setSpaceName] = useState("");

    useEffect(() => {
        if (!code) return;
        let cancelled = false;

        async function load() {
            try {
                const preview = await fetch(
                    `/api/spaces/join?code=${encodeURIComponent(code)}`,
                    { cache: "no-store" }
                );
                const previewData = await preview.json();
                if (cancelled) return;
                if (!preview.ok || !previewData.ok) {
                    setPhase("invalid");
                    return;
                }
                setSpaceName(previewData.space.display_name as string);

                const me = await fetch("/api/auth/me", { cache: "no-store" });
                const meData = await me.json();
                if (cancelled) return;
                setPhase(meData.signedIn ? "ready" : "signedOut");
            } catch {
                if (!cancelled) setPhase("error");
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [code]);

    async function join() {
        setPhase("joining");
        try {
            const res = await fetch("/api/spaces/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (res.status === 401) {
                setPhase("signedOut");
                return;
            }
            if (!res.ok || !data.ok) {
                if (data.code === "INVITE_EMAIL_MISMATCH") {
                    setPhase("mismatch");
                } else if (
                    data.code === "INVALID_INVITE" ||
                    data.code === "SPACE_NOT_FOUND"
                ) {
                    setPhase("invalid");
                } else {
                    setPhase("error");
                }
                return;
            }
            setSpaceName(data.space.display_name as string);
            setPhase("joined");
        } catch {
            setPhase("error");
        }
    }

    if (phase === "loading" || phase === "joining") {
        return (
            <p className="mt-4 text-sm text-muted">
                {phase === "joining" ? labels.busy : labels.loading}
            </p>
        );
    }

    if (phase === "missing") {
        return <p className="mt-4 text-sm text-danger">{labels.missingCode}</p>;
    }

    if (phase === "invalid") {
        return <p className="mt-4 text-sm text-danger">{labels.invalid}</p>;
    }

    if (phase === "error") {
        return <p className="mt-4 text-sm text-danger">{labels.error}</p>;
    }

    if (phase === "mismatch") {
        return (
            <p className="mt-4 text-sm text-danger">{labels.emailMismatch}</p>
        );
    }

    if (phase === "joined") {
        return (
            <div className="mt-4">
                <p className="text-sm font-semibold text-body">
                    {fill(labels.success, { name: spaceName })}
                </p>
                <a
                    href="/app"
                    className="mt-4 block rounded-full bg-brand px-4 py-3 text-center text-sm font-semibold text-ink"
                >
                    {labels.open}
                </a>
            </div>
        );
    }

    const signInHref = `/api/auth/login?next=${encodeURIComponent(
        `/join?code=${code}`
    )}`;

    return (
        <div className="mt-4">
            <p className="text-sm text-body">
                {fill(labels.invited, { name: spaceName })}
            </p>
            {phase === "signedOut" ? (
                <a
                    href={signInHref}
                    className="mt-4 block rounded-full bg-brand px-4 py-3 text-center text-sm font-semibold text-ink"
                >
                    {labels.signIn}
                </a>
            ) : (
                <button
                    type="button"
                    onClick={() => void join()}
                    className="mt-4 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-ink"
                >
                    {labels.join}
                </button>
            )}
        </div>
    );
}

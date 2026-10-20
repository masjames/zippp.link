"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";
import type { Receipt } from "@/types/receipt";

type Bubble =
    | { kind: "sys"; text: string }
    | { kind: "user"; text: string; thumb?: string }
    | { kind: "bot"; text: string };

const FIXTURE: Receipt = {
    merchant: "Indomaret",
    date: "2026-10-20",
    currency: "IDR",
    category: "Lainnya",
    line_items: [
        {
            description: "Air mineral",
            qty: 2,
            unit_price: 5000,
            amount: 10000,
        },
        {
            description: "Snack",
            qty: 1,
            unit_price: 4500,
            amount: 4500,
        },
    ],
    subtotal: 14500,
    tax: null,
    total: 14500,
};

function money(n: number | null): string {
    if (n == null) return "-";
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function reviewText(r: Receipt, mockLabel: boolean): string {
    const lines = r.line_items.length;
    const head = mockLabel ? "[MOCK] " : "";
    return `${head}${r.merchant ?? "—"}\nTotal ${money(r.total)}\n${lines} baris. Cek, lalu Terima.`;
}

/**
 * Fake WhatsApp chat so the intake flow is visible without Meta.
 * Extract uses the real pipeline when a photo is chosen; otherwise fixture.
 * Accept uses real /api/sheets/append when sheet + credits exist.
 */
export default function WaMockClient() {
    const { t } = useApp();
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const [bubbles, setBubbles] = useState<Bubble[]>([
        {
            kind: "sys",
            text: t("app.wa.mock.intro"),
        },
        {
            kind: "bot",
            text: t("app.wa.mock.ready"),
        },
    ]);
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [scanId, setScanId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [usedFixture, setUsedFixture] = useState(false);

    function push(...more: Bubble[]) {
        setBubbles((b) => [...b, ...more]);
    }

    async function onPickFile(file: File) {
        setBusy(true);
        const thumb = URL.createObjectURL(file);
        push({ kind: "user", text: "📷 " + file.name, thumb });
        push({ kind: "bot", text: t("app.wa.mock.reading") });

        let next: Receipt = FIXTURE;
        let fixture = true;
        try {
            const form = new FormData();
            form.append("image", file);
            const res = await fetch("/api/extract", {
                method: "POST",
                body: form,
            });
            const data = (await res.json()) as {
                ok?: boolean;
                receipt?: Receipt;
            };
            if (data.ok && data.receipt?.line_items?.length) {
                next = data.receipt;
                fixture = false;
            }
        } catch {
            /* fixture */
        }

        const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `mock-${Date.now()}`;
        setScanId(id);
        setReceipt(next);
        setUsedFixture(fixture);
        push({
            kind: "bot",
            text: reviewText(next, fixture),
        });
        setBusy(false);
    }

    async function accept() {
        if (!receipt || !scanId) return;
        setBusy(true);
        push({ kind: "user", text: t("app.wa.accept") });
        try {
            const res = await fetch("/api/sheets/append", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receipt, scanId }),
            });
            const data = (await res.json()) as {
                ok?: boolean;
                error?: string;
                needsCredits?: boolean;
            };
            if (data.ok) {
                push({ kind: "bot", text: t("app.wa.saved") });
            } else if (data.needsCredits) {
                push({
                    kind: "bot",
                    text: t("app.wa.mock.needCredits"),
                });
            } else {
                push({
                    kind: "bot",
                    text: data.error ?? t("app.wa.mock.appendFail"),
                });
            }
        } catch {
            push({ kind: "bot", text: t("app.wa.mock.appendFail") });
        }
        setReceipt(null);
        setScanId(null);
        setBusy(false);
    }

    function discard() {
        push({ kind: "user", text: t("app.wa.discard") });
        push({ kind: "bot", text: t("app.wa.mock.discarded") });
        setReceipt(null);
        setScanId(null);
    }

    function edit() {
        push({ kind: "user", text: t("app.wa.edit") });
        push({ kind: "bot", text: t("app.wa.mock.editHint") });
        router.push("/app/snap");
    }

    function useDemo() {
        const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `mock-${Date.now()}`;
        setScanId(id);
        setReceipt(FIXTURE);
        setUsedFixture(true);
        push({ kind: "user", text: t("app.wa.mock.demoPhoto") });
        push({ kind: "bot", text: reviewText(FIXTURE, true) });
    }

    return (
        <PhoneShell tone="page">
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => router.push("/app/settings")}
                    className="text-sm font-semibold text-muted"
                >
                    ← {t("app.settings.title")}
                </button>
                <span className="rounded-full bg-brand/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                    {t("app.wa.mock.badge")}
                </span>
            </div>
            <h2 className="font-head text-2xl font-extrabold leading-none">
                {t("app.wa.mock.title")}
            </h2>
            <p className="text-xs text-muted">{t("app.wa.mock.body")}</p>

            <div className="flex min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto rounded-2xl bg-[#e5ddd5] p-3">
                {bubbles.map((b, i) => {
                    if (b.kind === "sys") {
                        return (
                            <p
                                key={i}
                                className="mx-auto max-w-[90%] rounded-lg bg-black/10 px-2 py-1 text-center text-[11px] text-ink/80"
                            >
                                {b.text}
                            </p>
                        );
                    }
                    const mine = b.kind === "user";
                    return (
                        <div
                            key={i}
                            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                mine
                                    ? "ml-auto bg-[#dcf8c6] text-ink"
                                    : "mr-auto bg-white text-ink"
                            }`}
                        >
                            {"thumb" in b && b.thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={b.thumb}
                                    alt=""
                                    className="mb-1 max-h-32 rounded-lg object-cover"
                                />
                            ) : null}
                            {b.text}
                        </div>
                    );
                })}
            </div>

            {receipt ? (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void accept()}
                        className="rounded-full bg-btn px-2 py-3 text-xs font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.wa.accept")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={edit}
                        className="rounded-full bg-mist px-2 py-3 text-xs font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.wa.edit")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={discard}
                        className="rounded-full bg-mist px-2 py-3 text-xs font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.wa.discard")}
                    </button>
                </div>
            ) : (
                <div className="grid gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileRef.current?.click()}
                        className="rounded-full bg-btn px-6 py-3 font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.wa.mock.sendPhoto")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={useDemo}
                        className="rounded-full bg-mist px-6 py-3 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.wa.mock.useFixture")}
                    </button>
                </div>
            )}
            {usedFixture && receipt ? (
                <p className="text-center text-[11px] text-muted">
                    {t("app.wa.mock.fixtureNote")}
                </p>
            ) : null}
            <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickFile(f);
                    e.target.value = "";
                }}
            />
        </PhoneShell>
    );
}

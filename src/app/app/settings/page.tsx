"use client";

import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";
import { fill } from "@/lib/t";

export default function SettingsPage() {
    const { t, lang, balance, signOut } = useApp();
    const router = useRouter();

    const expiry =
        balance?.soonestExpiry != null
            ? new Date(balance.soonestExpiry).toLocaleDateString(
                  lang === "id" ? "id-ID" : "en-US"
              )
            : null;

    const refLink =
        balance?.refCode != null
            ? `https://zippp.link/?ref=${balance.refCode}`
            : null;

    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.settings.title")}
            </h2>

            <div className="rounded-2xl bg-surface p-4">
                <p className="font-head text-2xl font-extrabold">
                    {balance?.configured
                        ? fill(t("app.credits.balance"), {
                              count: balance.credits,
                          })
                        : t("app.settings.soon")}
                </p>
                {balance?.configured && expiry ? (
                    <p className="text-sm text-muted">
                        {fill(t("app.credits.expires"), { date: expiry })}
                    </p>
                ) : null}
            </div>

            {refLink ? (
                <div className="rounded-2xl bg-card p-4 text-sm">
                    <p className="font-semibold">{t("app.referral.title")}</p>
                    <p className="text-muted">{t("app.referral.body")}</p>
                    <p className="mt-2 break-all font-mono text-xs">
                        {t("app.referral.link")}: {refLink}
                    </p>
                    <p className="mt-1 text-muted">
                        {fill(t("app.referral.earned"), {
                            count: balance?.referralEarned ?? 0,
                        })}
                    </p>
                </div>
            ) : null}

            <div className="mt-auto grid gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/app/topup")}
                    className="rounded-full bg-brand px-6 py-4 font-semibold text-ink"
                >
                    {t("app.topup.title")}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/app/settings/sheet")}
                    className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                >
                    {t("app.sheets.connected")}
                </button>
                <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                >
                    {t("app.auth.signout")}
                </button>
            </div>
        </PhoneShell>
    );
}

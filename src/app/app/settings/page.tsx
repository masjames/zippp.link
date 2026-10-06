"use client";

import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";

/** Placeholder. Task 3 builds the full hub (balance, sheet, sign out). */
export default function SettingsPage() {
    const { t, signOut } = useApp();
    const router = useRouter();

    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.settings.title")}
            </h2>
            <p className="text-muted">{t("app.settings.soon")}</p>
            <div className="mt-auto grid gap-3">
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

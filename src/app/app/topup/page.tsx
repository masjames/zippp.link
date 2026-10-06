"use client";

import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";

/** Placeholder. Task 6 builds GoPay; Task 8 builds Paddle; Task 4 adds the gate. */
export default function TopUpPage() {
    const { t } = useApp();
    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.topup.title")}
            </h2>
            <p className="text-muted">{t("app.topup.soon")}</p>
        </PhoneShell>
    );
}

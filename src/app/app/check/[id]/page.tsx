"use client";

import { useParams, useRouter } from "next/navigation";
import BadPhotoScreen from "@/components/app/screens/BadPhotoScreen";
import CheckScreen from "@/components/app/screens/CheckScreen";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";

/** Review one queued item before sending it to the sheet. */
export default function CheckPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { t, workspace, queue, sending, sendError, send, retryItem } = useApp();
    const item = queue.find((entry) => entry.id === id);

    if (!item) {
        return (
            <PhoneShell>
                <p className="mt-8 text-center text-muted">
                    {t("app.check.missing")}
                </p>
            </PhoneShell>
        );
    }

    if (item.status === "failed") {
        return (
            <BadPhotoScreen
                t={t}
                debug={item.debug}
                onRetry={() => {
                    retryItem(item.id);
                    router.push("/app/snap");
                }}
            />
        );
    }

    if (!item.receipt) {
        return (
            <PhoneShell>
                <p className="mt-8 text-center text-muted">
                    {t("app.reading.title")}
                </p>
            </PhoneShell>
        );
    }

    return (
        <CheckScreen
            t={t}
            receipt={item.receipt}
            sheetTitle={workspace?.spreadsheet_title ?? ""}
            sheetTab={workspace?.sheet_tab ?? ""}
            requireStaff={workspace?.template_id === "resto-inventory"}
            requireOutlet={(workspace?.outlets?.length ?? 0) > 1}
            sending={sending}
            sendError={sendError}
            debug={item.debug}
            onSend={async (receipt, staff, outlet) => {
                const ok = await send(receipt, staff, outlet, item.id);
                if (ok) router.push("/app/sent");
            }}
        />
    );
}

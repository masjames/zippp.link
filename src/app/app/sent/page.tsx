"use client";

import { useRouter } from "next/navigation";
import SentScreen from "@/components/app/screens/SentScreen";
import { useApp } from "@/components/app/AppProvider";

export default function SentPage() {
    const { t, workspace, sent, queue, resetSent } = useApp();
    const router = useRouter();

    const sheetUrl = workspace
        ? `https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}`
        : null;

    return (
        <SentScreen
            t={t}
            count={sent?.count ?? 0}
            merchant={sent?.merchant ?? ""}
            total={sent?.total ?? ""}
            sheetUrl={sheetUrl}
            onAgain={() => {
                resetSent();
                const ready = queue.find((item) => item.status === "ready");
                router.push(ready ? `/app/check/${ready.id}` : "/app/snap");
            }}
        />
    );
}

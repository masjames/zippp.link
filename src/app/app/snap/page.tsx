"use client";

import { useRouter } from "next/navigation";
import CaptureScreen from "@/components/app/screens/CaptureScreen";
import { useApp } from "@/components/app/AppProvider";

/** Home: live camera + the snap queue. */
export default function SnapPage() {
    const { t, workspace, queue, addFile, removeItem, retryItem } = useApp();
    const router = useRouter();
    const ready = queue.filter((item) => item.status === "ready");

    return (
        <CaptureScreen
            t={t}
            pill={workspace?.spreadsheet_title}
            onFile={addFile}
            queue={queue}
            onReview={(id) => router.push(`/app/check/${id}`)}
            onRetry={retryItem}
            onRemove={removeItem}
            readyCount={ready.length}
            onReviewNext={() => {
                if (ready[0]) router.push(`/app/check/${ready[0].id}`);
            }}
        />
    );
}

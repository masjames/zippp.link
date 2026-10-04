import type { ExtractDebug, Receipt } from "@/types/receipt";

export type QueueStatus = "queued" | "reading" | "ready" | "failed" | "sending" | "sent";

export type QueueItem = {
    id: string;
    file: File;
    /** Object URL for the thumbnail. */
    previewUrl: string;
    status: QueueStatus;
    receipt?: Receipt;
    debug?: ExtractDebug | null;
    error?: string;
};

export type SentInfo = {
    count: number;
    merchant: string;
    total: string;
};

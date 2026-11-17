import type { BatchItem } from "../../../src/lib/batch-db";

export type DraftPatch = Partial<Pick<BatchItem, "status" | "receipt" | "draft" | "error" | "scanId">>;

export type NewDraft = {
  id: string;
  ownerId: string;
  createdAt: number;
  mimeType: string;
  imageBytes: Uint8Array;
} & DraftPatch;

export type DraftSummary = Pick<BatchItem, "id" | "createdAt" | "status"> & {
  mimeType: string;
  scanId?: string;
  receipt?: BatchItem["receipt"];
  draft?: BatchItem["draft"];
  error?: string;
};

export type DraftContents = DraftSummary & { imageBytes: Uint8Array };

export function storageOwnerId(ownerId: string): string {
  if (!ownerId || ownerId.trim() !== ownerId) throw new Error("Invalid draft owner");
  return `expo:${ownerId}`;
}

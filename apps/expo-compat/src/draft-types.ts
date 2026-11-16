export type NewDraft = {
  id: string;
  ownerId: string;
  createdAt: number;
  mimeType: string;
  imageBytes: Uint8Array;
};

export type DraftSummary = {
  id: string;
  createdAt: number;
  mimeType: string;
};

export type DraftContents = DraftSummary & { imageBytes: Uint8Array };

export function storageOwnerId(ownerId: string): string {
  if (!ownerId || ownerId.trim() !== ownerId) throw new Error("Invalid draft owner");
  return `expo:${ownerId}`;
}

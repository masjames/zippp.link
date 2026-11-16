import {
  allItems,
  deleteItem,
  putItem,
  type BatchItem,
} from "../../../src/lib/batch-db";
import type { DraftContents, DraftSummary, NewDraft } from "./draft-types";
import { storageOwnerId } from "./draft-types";

export type { DraftContents, DraftSummary, NewDraft } from "./draft-types";

function toBatchItem(draft: NewDraft): BatchItem {
  const imageBuffer = new ArrayBuffer(draft.imageBytes.byteLength);
  new Uint8Array(imageBuffer).set(draft.imageBytes);
  return {
    id: draft.id,
    ownerId: storageOwnerId(draft.ownerId),
    createdAt: draft.createdAt,
    blob: new Blob([imageBuffer], { type: draft.mimeType }),
    thumb: "",
    status: "queued",
    source: "manual",
  };
}

export async function saveDraft(draft: NewDraft): Promise<DraftSummary> {
  await putItem(toBatchItem(draft));
  return { id: draft.id, createdAt: draft.createdAt, mimeType: draft.mimeType };
}

export async function listDrafts(ownerId: string): Promise<DraftSummary[]> {
  const items = await allItems(storageOwnerId(ownerId));
  return items.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    mimeType: item.blob.type || "image/jpeg",
  }));
}

export async function loadDraft(ownerId: string, id: string): Promise<DraftContents | null> {
  const item = (await allItems(storageOwnerId(ownerId))).find((candidate) => candidate.id === id);
  if (!item) return null;
  return {
    id: item.id,
    createdAt: item.createdAt,
    mimeType: item.blob.type || "image/jpeg",
    imageBytes: new Uint8Array(await item.blob.arrayBuffer()),
  };
}

export async function removeDraft(ownerId: string, id: string): Promise<void> {
  await deleteItem(storageOwnerId(ownerId), id);
}

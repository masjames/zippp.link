import {
  allItems,
  deleteItem,
  putItem,
  type BatchItem,
} from "../../../src/lib/batch-db";
import type { DraftContents, DraftPatch, DraftSummary, NewDraft } from "./draft-types";
import { storageOwnerId } from "./draft-types";

export type { DraftContents, DraftPatch, DraftSummary, NewDraft } from "./draft-types";

function toBatchItem(draft: NewDraft): BatchItem {
  const imageBuffer = new ArrayBuffer(draft.imageBytes.byteLength);
  new Uint8Array(imageBuffer).set(draft.imageBytes);
  return {
    id: draft.id,
    ownerId: storageOwnerId(draft.ownerId),
    createdAt: draft.createdAt,
    blob: new Blob([imageBuffer], { type: draft.mimeType }),
    thumb: "",
    status: draft.status ?? "queued",
    source: "manual",
    scanId: draft.scanId,
    receipt: draft.receipt,
    draft: draft.draft,
    error: draft.error,
  };
}

function toSummary(item: BatchItem): DraftSummary {
  return {
    id: item.id,
    createdAt: item.createdAt,
    mimeType: item.blob.type || "image/jpeg",
    status: item.status,
    scanId: item.scanId,
    receipt: item.receipt,
    draft: item.draft,
    error: item.error,
  };
}

export async function saveDraft(draft: NewDraft): Promise<DraftSummary> {
  const item = toBatchItem(draft);
  await putItem(item);
  return toSummary(item);
}

export async function listDrafts(ownerId: string): Promise<DraftSummary[]> {
  const items = await allItems(storageOwnerId(ownerId));
  return items.map(toSummary);
}

export async function loadDraft(ownerId: string, id: string): Promise<DraftContents | null> {
  const item = (await allItems(storageOwnerId(ownerId))).find((candidate) => candidate.id === id);
  if (!item) return null;
  return {
    ...toSummary(item),
    imageBytes: new Uint8Array(await item.blob.arrayBuffer()),
  };
}

export async function updateDraft(ownerId: string, id: string, patch: DraftPatch): Promise<DraftSummary | null> {
  const storageId = storageOwnerId(ownerId);
  const item = (await allItems(storageId)).find((candidate) => candidate.id === id);
  if (!item) return null;
  const updated = { ...item, ...patch };
  await putItem(updated);
  return toSummary(updated);
}

export async function removeDraft(ownerId: string, id: string): Promise<void> {
  await deleteItem(storageOwnerId(ownerId), id);
}

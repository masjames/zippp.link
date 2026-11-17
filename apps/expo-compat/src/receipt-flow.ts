import { fromDraft, toDraft, type Draft } from "../../../src/components/app/draft";
import { acceptBlocked, outletMissing } from "../../../src/lib/review-ops";
import type { Receipt } from "../../../src/types/receipt";
import { loadDraft, removeDraft, updateDraft, type DraftSummary } from "./draft-store";
import { loadSession } from "./home-data";

export type ReviewWorkspace = {
  spreadsheet_title: string;
  sheet_tab: string;
  template_id: string;
  staff_names: string[];
  outlets: string[];
  default_outlet: string | null;
};

export type ReviewCheck = {
  noReceipt: boolean;
  noLines: boolean;
  noPrice: boolean;
  noOutlet: boolean;
  hardFlagsBlocked: boolean;
  canSend: boolean;
};

export function checkReceiptForSend(
  receipt: Receipt | undefined,
  draft: Draft | undefined,
  workspace: ReviewWorkspace | null,
): ReviewCheck {
  const noReceipt = !receipt || !draft;
  const noLines = !draft?.lines.some(
    (line) => line.description.trim() || line.qty.trim() || line.unitPrice.trim() || line.amount.trim(),
  );
  const noPrice = !draft?.lines.some((line) => line.amount.trim() !== "") && !draft?.total.trim();
  const noOutlet = Boolean(
    draft && workspace && outletMissing(workspace.outlets, workspace.default_outlet, draft.outlet),
  );
  const hardFlagsBlocked = Boolean(receipt && draft && acceptBlocked(receipt, draft));
  const canSend = Boolean(workspace) && !noReceipt && !noLines && !noPrice && !noOutlet && !hardFlagsBlocked;
  return { noReceipt, noLines, noPrice, noOutlet, hardFlagsBlocked, canSend };
}

export type ExtractDraftResult =
  | { kind: "ready"; item: DraftSummary }
  | { kind: "failed"; status: number }
  | { kind: "signedOut" }
  | { kind: "missing" };

export async function extractDraft(
  ownerId: string,
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<ExtractDraftResult> {
  const session = await loadSession((url, init) => fetcher(url, init));
  if (session.kind !== "signedIn" || session.userId !== ownerId) return { kind: "signedOut" };

  const contents = await loadDraft(ownerId, id);
  if (!contents) return { kind: "missing" };
  await updateDraft(ownerId, id, { status: "reading", error: undefined });

  const form = new FormData();
  form.append(
    "image",
    new Blob([contents.imageBytes.buffer as ArrayBuffer], { type: contents.mimeType }),
    "receipt",
  );
  try {
    const response = await fetcher("/api/extract", { method: "POST", body: form });
    const data = await response.json() as {
      ok: boolean;
      receipt?: Receipt;
      scanId?: string;
      error?: string;
    };
    if (!response.ok || !data.ok || !data.receipt || !data.scanId) {
      await updateDraft(ownerId, id, { status: "failed", error: data.error ?? "EXTRACTION_FAILED" });
      return { kind: "failed", status: response.status };
    }

    const item = await updateDraft(ownerId, id, {
      status: "ready",
      scanId: data.scanId,
      receipt: data.receipt,
      draft: toDraft(data.receipt),
      error: undefined,
    });
    return item ? { kind: "ready", item } : { kind: "missing" };
  } catch {
    await updateDraft(ownerId, id, { status: "failed", error: "NETWORK_ERROR" });
    return { kind: "failed", status: 0 };
  }
}

export type AppendDraftResult =
  | { kind: "sent"; rowsWritten: number; spreadsheetTitle: string; sheetTab: string }
  | { kind: "signedOut" }
  | { kind: "missing" }
  | { kind: "notReady" }
  | { kind: "notChecked" }
  | { kind: "failed"; status: number; code: string | null };

export async function appendDraft(
  ownerId: string,
  id: string,
  workspace: ReviewWorkspace | null,
  checked: boolean,
  fetcher: typeof fetch = fetch,
): Promise<AppendDraftResult> {
  if (!checked) return { kind: "notChecked" };
  const session = await loadSession((url, init) => fetcher(url, init));
  if (session.kind !== "signedIn" || session.userId !== ownerId) return { kind: "signedOut" };

  const item = await loadDraft(ownerId, id);
  if (!item || !item.receipt || !item.draft) return { kind: "missing" };
  if (!item.scanId) return { kind: "notReady" };
  if (!checkReceiptForSend(item.receipt, item.draft, workspace).canSend || !workspace) {
    return { kind: "notChecked" };
  }

  try {
    const response = await fetcher("/api/sheets/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt: fromDraft(item.draft),
        staff: item.draft.staff.trim(),
        outlet: item.draft.outlet.trim() || null,
        payment: item.draft.payment?.trim() || null,
        purpose: item.draft.purpose?.trim() || null,
        customer: item.draft.customer?.trim() || null,
        expectedUserId: ownerId,
        scanId: item.scanId,
      }),
    });
    const data = await response.json() as {
      ok: boolean;
      code?: string;
      rows_written?: number;
      spreadsheet_title?: string;
      sheet_tab?: string;
    };
    if (!response.ok || !data.ok) {
      return { kind: "failed", status: response.status, code: data.code ?? null };
    }
    await removeDraft(ownerId, id);
    return {
      kind: "sent",
      rowsWritten: data.rows_written ?? 0,
      spreadsheetTitle: data.spreadsheet_title ?? workspace.spreadsheet_title,
      sheetTab: data.sheet_tab ?? workspace.sheet_tab,
    };
  } catch {
    return { kind: "failed", status: 0, code: null };
  }
}

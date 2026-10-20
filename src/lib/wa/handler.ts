import { balance, refundScan, spend } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";
import { runExtraction } from "@/lib/extract-pipeline";
import {
    appendRows,
    SheetsApiError,
    SheetsAuthError,
} from "@/lib/google/sheets";
import { buildAppendRows } from "@/lib/google/templates";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { loadWording } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { fill, makeT } from "@/lib/t";
import type { Receipt } from "@/types/receipt";
import {
    waChannelEnabled,
    waConfigured,
    waServiceMsgSoftCap,
} from "./config";
import {
    downloadMedia,
    parseInbound,
    sendCtaUrl,
    sendReviewButtons,
    sendText,
    type InboundMessage,
} from "./meta";
import {
    bumpOutbound,
    deleteDraft,
    getLinkByWaId,
    loadDraft,
    newScanId,
    outboundCount,
    saveDraft,
    saveLink,
    consumeLinkToken,
} from "./store";

function tId() {
    return makeT(loadWording(), "id");
}

function formatMoney(n: number | null): string {
    if (n == null || !Number.isFinite(n)) return "-";
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

async function noteOutbound(): Promise<void> {
    await bumpOutbound(1);
}

export async function handleWaWebhookBody(rawBody: string): Promise<void> {
    if (!waChannelEnabled() || !waConfigured()) return;
    let payload: unknown;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return;
    }
    const messages = parseInbound(payload);
    for (const msg of messages) {
        try {
            await handleOne(msg);
        } catch (err) {
            console.error(
                JSON.stringify({
                    event: "wa.handle.error",
                    waId: msg.waId,
                    error: err instanceof Error ? err.message : String(err),
                })
            );
        }
    }
}

async function handleOne(msg: InboundMessage): Promise<void> {
    const t = tId();

    // Link claim: user sends "zippp LINK <token>" or just the token after CTA.
    const linkMatch =
        msg.text?.match(/^(?:zippp\s+)?link\s+([a-f0-9]{32})$/i) ||
        msg.text?.match(/^([a-f0-9]{32})$/);
    if (msg.type === "text" && linkMatch) {
        const pending = await consumeLinkToken(linkMatch[1]);
        if (!pending) {
            await sendText(msg.waId, "Kode kedaluwarsa. Buka Settings lagi.");
            await noteOutbound();
            return;
        }
        await saveLink(
            {
                googleUserId: pending.googleUserId,
                phone: msg.waId,
                linkedAt: Date.now(),
            },
            msg.waId
        );
        await sendText(msg.waId, "WhatsApp terhubung. Kirim foto struk.");
        await noteOutbound();
        return;
    }

    const link = await getLinkByWaId(msg.waId);
    if (!link) {
        const url = absoluteUrl("/app/settings");
        await sendCtaUrl(
            msg.waId,
            fill(t("app.wa.needLink"), { url }),
            "Buka zippp",
            url
        );
        await noteOutbound();
        return;
    }

    if (msg.type === "interactive" && msg.buttonId) {
        await handleButton(msg.waId, link.googleUserId, msg.buttonId);
        return;
    }

    if (msg.type === "image" && msg.imageId) {
        await handleImage(msg.waId, link.googleUserId, msg.imageId);
        return;
    }

    if (msg.type === "text") {
        await sendText(
            msg.waId,
            "Kirim foto struk, atau ketuk tombol di pesan review."
        );
        await noteOutbound();
    }
}

async function handleImage(
    waId: string,
    googleUserId: string,
    mediaId: string
): Promise<void> {
    const t = tId();
    const count = await outboundCount();
    if (count >= waServiceMsgSoftCap()) {
        const url = absoluteUrl("/app/snap");
        await sendText(waId, fill(t("app.wa.quota"), { url }));
        await noteOutbound();
        return;
    }

    const workspace = await loadWorkspaceForUser(googleUserId);
    if (
        !workspace?.spreadsheet_id ||
        !workspace.sheet_tab ||
        !workspace.column_map ||
        Object.keys(workspace.column_map).length === 0
    ) {
        const url = absoluteUrl("/app/settings/sheet");
        await sendCtaUrl(
            waId,
            fill(t("app.wa.needSheet"), { url }),
            "Sambungkan",
            url
        );
        await noteOutbound();
        return;
    }

    if (billingConfigured()) {
        const bal = await balance(googleUserId);
        if (bal.credits < 1) {
            const url = absoluteUrl("/app/topup");
            await sendCtaUrl(
                waId,
                fill(t("app.wa.needCredits"), { url }),
                "Isi kredit",
                url
            );
            await noteOutbound();
            return;
        }
    }

    const media = await downloadMedia(mediaId);
    if (!media) {
        await sendText(waId, t("app.wa.unreadable"));
        await noteOutbound();
        return;
    }

    const file = new File([new Uint8Array(media.bytes)], "wa-receipt.jpg", {
        type: media.mime,
    });
    const result = await runExtraction(file);
    if (!result.ok || !result.receipt) {
        await sendText(waId, t("app.wa.unreadable"));
        await noteOutbound();
        return;
    }

    const receipt = result.receipt;
    if (!receipt.line_items?.length) {
        await sendText(waId, t("app.wa.unreadable"));
        await noteOutbound();
        return;
    }

    const scanId = newScanId();
    await saveDraft({
        scanId,
        googleUserId,
        waId,
        receipt,
        createdAt: Date.now(),
    });

    const body = fill(t("app.wa.review"), {
        merchant: receipt.merchant ?? "—",
        total: formatMoney(receipt.total),
        lines: receipt.line_items.length,
    });

    await sendReviewButtons(waId, body, [
        { id: `accept:${scanId}`, title: t("app.wa.accept") },
        { id: `edit:${scanId}`, title: t("app.wa.edit") },
        { id: `discard:${scanId}`, title: t("app.wa.discard") },
    ]);
    await noteOutbound();
}

async function handleButton(
    waId: string,
    googleUserId: string,
    buttonId: string
): Promise<void> {
    const t = tId();
    const [action, scanId] = buttonId.split(":");
    if (!scanId) return;

    if (action === "discard") {
        await deleteDraft(scanId);
        await sendText(waId, "Dibuang.");
        await noteOutbound();
        return;
    }

    if (action === "edit") {
        const url = absoluteUrl("/app/snap");
        await sendCtaUrl(waId, "Ubah di aplikasi, lalu Accept di sana.", "Buka", url);
        await noteOutbound();
        return;
    }

    if (action !== "accept") return;

    const draft = await loadDraft(scanId);
    if (!draft || draft.googleUserId !== googleUserId) {
        await sendText(waId, "Draft sudah hilang. Kirim foto lagi.");
        await noteOutbound();
        return;
    }

    const ok = await acceptDraft(draft);
    await deleteDraft(scanId);
    if (!ok.ok) {
        await sendText(waId, ok.error ?? "Gagal menyimpan.");
        await noteOutbound();
        return;
    }
    await sendText(waId, t("app.wa.saved"));
    await noteOutbound();
}

async function acceptDraft(draft: {
    scanId: string;
    googleUserId: string;
    receipt: Receipt;
}): Promise<{ ok: boolean; error?: string }> {
    const workspace = await loadWorkspaceForUser(draft.googleUserId);
    if (!workspace?.spreadsheet_id || !workspace.sheet_tab) {
        return { ok: false, error: "Sheet belum tersambung." };
    }

    let rows;
    try {
        rows = buildAppendRows({
            receipt: draft.receipt,
            column_map: workspace.column_map,
            constants: workspace.constants,
            headers: workspace.headers,
            staff: "",
            outlet: workspace.default_outlet,
            captured_at: new Date().toISOString(),
        });
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Gagal membangun baris.",
        };
    }

    let charged = false;
    if (billingConfigured()) {
        const spent = await spend({
            userId: draft.googleUserId,
            credits: 1,
            idem: `scan:${draft.scanId}`,
        });
        if (spent === "insufficient") {
            return { ok: false, error: "Kredit habis. Isi dulu di aplikasi." };
        }
        if (spent === "duplicate") {
            return { ok: false, error: "Sudah pernah diterima." };
        }
        charged = true;
    }

    try {
        await appendRows(
            workspace.spreadsheet_id,
            workspace.sheet_tab,
            rows,
            draft.googleUserId
        );
        return { ok: true };
    } catch (err) {
        if (charged) {
            try {
                await refundScan(draft.googleUserId, draft.scanId);
            } catch {
                /* ignore */
            }
        }
        if (err instanceof SheetsAuthError) {
            return { ok: false, error: "Google login kedaluwarsa. Sign in lagi." };
        }
        if (err instanceof SheetsApiError) {
            return { ok: false, error: err.message };
        }
        return { ok: false, error: "Gagal menulis ke Sheet." };
    }
}

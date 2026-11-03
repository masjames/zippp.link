"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";
import { fill } from "@/lib/t";

type SpaceSummary = {
    id: string;
    display_name: string;
    role: "owner" | "member";
    member_count: number;
};

type SpaceMember = {
    user_id: string;
    email: string | null;
    role: "owner" | "member";
    joined_at: number;
};

type SpaceDetail = {
    id: string;
    display_name: string;
    owner_user_id: string;
    role: "owner" | "member";
    members: SpaceMember[];
};

type LedgerItem = {
    id: string;
    kind: "asset" | "goal";
    name: string;
    amount: number;
    progress: number | null;
    note: string | null;
};

export default function SpaceSettingsPage() {
    const { t, auth } = useApp();
    const router = useRouter();
    const [spaces, setSpaces] = useState<SpaceSummary[] | null>(null);
    const [listError, setListError] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SpaceDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(false);
    const [createName, setCreateName] = useState("");
    const [creating, setCreating] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteNotice, setInviteNotice] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [items, setItems] = useState<LedgerItem[]>([]);
    const [itemKind, setItemKind] = useState<"asset" | "goal">("asset");
    const [itemName, setItemName] = useState("");
    const [itemAmount, setItemAmount] = useState("");
    const [itemProgress, setItemProgress] = useState("");
    const [itemNote, setItemNote] = useState("");
    const [itemEditingId, setItemEditingId] = useState<string | null>(null);
    const [itemBusy, setItemBusy] = useState(false);
    const [itemError, setItemError] = useState<string | null>(null);

    const myUserId = auth?.googleUserId ?? null;

    const loadSpaces = useCallback(async (): Promise<SpaceSummary[]> => {
        const res = await fetch("/api/spaces", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error("LIST_FAILED");
        const rows = Array.isArray(data.spaces) ? data.spaces : [];
        setSpaces(rows);
        setListError(false);
        return rows as SpaceSummary[];
    }, []);

    const loadDetail = useCallback(async (spaceId: string) => {
        setDetailLoading(true);
        setDetailError(false);
        setActionError(null);
        try {
            const res = await fetch(`/api/spaces/${spaceId}`, {
                cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error("DETAIL_FAILED");
            setDetail(data.space as SpaceDetail);
        } catch {
            setDetail(null);
            setDetailError(true);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSpaces()
            .then((rows) => {
                if (rows.length > 0) setSelectedId(rows[0].id);
            })
            .catch(() => {
                setListError(true);
                setSpaces([]);
            });
    }, [loadSpaces]);

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        void loadDetail(selectedId);
    }, [selectedId, loadDetail]);

    async function create() {
        setCreating(true);
        setActionError(null);
        try {
            const res = await fetch("/api/spaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ display_name: createName }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error("CREATE_FAILED");
            setCreateName("");
            await loadSpaces();
            setSelectedId(data.space.id as string);
        } catch {
            setActionError(t("app.space.error.generic"));
        } finally {
            setCreating(false);
        }
    }

    async function invite() {
        if (!detail) return;
        setInviting(true);
        setActionError(null);
        setInviteLink(null);
        setInviteNotice(null);
        setCopied(false);
        try {
            const res = await fetch(`/api/spaces/${detail.id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                if (data.code === "INVALID_EMAIL") {
                    setActionError(t("app.space.invite.invalidEmail"));
                } else {
                    setActionError(t("app.space.error.generic"));
                }
                return;
            }
            setInviteLink(`${window.location.origin}${data.path}`);
            setInviteNotice(
                data.emailed
                    ? t("app.space.invite.sent")
                    : t("app.space.invite.shareOnly")
            );
        } catch {
            setActionError(t("app.space.error.generic"));
        } finally {
            setInviting(false);
        }
    }

    async function copyLink() {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    async function removeMember(userId: string) {
        if (!detail) return;
        if (!window.confirm(t("app.space.remove.confirm"))) return;
        setActionBusy(true);
        setActionError(null);
        try {
            const res = await fetch(
                `/api/spaces/${detail.id}/members/${encodeURIComponent(userId)}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error("REMOVE_FAILED");
            await loadDetail(detail.id);
            await loadSpaces();
        } catch {
            setActionError(t("app.space.error.generic"));
        } finally {
            setActionBusy(false);
        }
    }

    async function leave() {
        if (!detail) return;
        if (!window.confirm(t("app.space.leave.confirm"))) return;
        setActionBusy(true);
        setActionError(null);
        try {
            const res = await fetch(`/api/spaces/${detail.id}/leave`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setActionError(
                    data.code === "OWNER_CANNOT_LEAVE"
                        ? t("app.space.leave.owner")
                        : t("app.space.error.generic")
                );
                return;
            }
            setSelectedId(null);
            setDetail(null);
            const rows = await loadSpaces();
            if (rows.length > 0) setSelectedId(rows[0].id);
        } catch {
            setActionError(t("app.space.error.generic"));
        } finally {
            setActionBusy(false);
        }
    }

    const loadItems = useCallback(async (spaceId: string) => {
        const res = await fetch(`/api/spaces/${spaceId}/assets`, {
            cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error("ITEMS_FAILED");
        setItems(Array.isArray(data.items) ? (data.items as LedgerItem[]) : []);
    }, []);

    useEffect(() => {
        if (!detail?.id) {
            setItems([]);
            return;
        }
        setItemEditingId(null);
        setItemError(null);
        loadItems(detail.id).catch(() => setItems([]));
    }, [detail?.id, loadItems]);

    function resetItemForm() {
        setItemEditingId(null);
        setItemName("");
        setItemAmount("");
        setItemProgress("");
        setItemNote("");
    }

    function editItem(item: LedgerItem) {
        setItemEditingId(item.id);
        setItemKind(item.kind);
        setItemName(item.name);
        setItemAmount(String(item.amount));
        setItemProgress(item.progress === null ? "" : String(item.progress));
        setItemNote(item.note ?? "");
    }

    async function saveItem() {
        if (!detail) return;
        const amount = Number(itemAmount.replace(",", "."));
        const progress = Number((itemProgress || "0").replace(",", "."));
        if (!itemName.trim() || !Number.isFinite(amount)) {
            setItemError(t("app.space.items.error"));
            return;
        }
        setItemBusy(true);
        setItemError(null);
        try {
            const res = await fetch(
                itemEditingId
                    ? `/api/spaces/${detail.id}/assets/${itemEditingId}`
                    : `/api/spaces/${detail.id}/assets`,
                {
                    method: itemEditingId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        kind: itemKind,
                        name: itemName,
                        amount,
                        progress: itemKind === "goal" ? progress : undefined,
                        note: itemNote.trim() || null,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error("SAVE_FAILED");
            resetItemForm();
            await loadItems(detail.id);
        } catch {
            setItemError(t("app.space.items.error"));
        } finally {
            setItemBusy(false);
        }
    }

    async function archiveItem(id: string) {
        if (!detail) return;
        setItemBusy(true);
        setItemError(null);
        try {
            const res = await fetch(
                `/api/spaces/${detail.id}/assets/${id}`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error("ARCHIVE_FAILED");
            if (itemEditingId === id) resetItemForm();
            await loadItems(detail.id);
        } catch {
            setItemError(t("app.space.items.error"));
        } finally {
            setItemBusy(false);
        }
    }

    const isOwner = detail?.role === "owner";

    return (
        <PhoneShell>
            <button
                type="button"
                onClick={() => router.push("/app/settings")}
                className="mt-2 text-left text-sm font-semibold text-muted"
            >
                {t("app.nav.back")}
            </button>
            <h2 className="font-head text-3xl font-extrabold leading-none">
                {t("app.space.title")}
            </h2>
            <p className="text-sm text-muted">{t("app.space.subtitle")}</p>

            <div className="rounded-2xl bg-card p-4">
                <p className="text-sm font-semibold">
                    {t("app.space.create.title")}
                </p>
                <label className="mt-3 block text-xs font-semibold text-muted">
                    {t("app.space.create.name")}
                </label>
                <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    maxLength={80}
                    placeholder={t("app.space.create.placeholder")}
                    className="mt-1 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-body"
                />
                <button
                    type="button"
                    disabled={creating}
                    onClick={() => void create()}
                    className="mt-3 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                    {creating
                        ? t("app.space.create.busy")
                        : t("app.space.create.button")}
                </button>
            </div>

            {spaces === null ? (
                <p className="text-sm text-muted">{t("app.space.loading")}</p>
            ) : listError ? (
                <p className="text-sm text-danger">{t("app.space.error")}</p>
            ) : spaces.length === 0 ? (
                <p className="text-sm text-muted">{t("app.space.empty")}</p>
            ) : (
                <ul className="grid gap-2">
                    {spaces.map((space) => (
                        <li key={space.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedId(space.id);
                                    setInviteLink(null);
                                    setInviteNotice(null);
                                }}
                                className={`w-full rounded-2xl p-4 text-left ${
                                    selectedId === space.id
                                        ? "bg-mist"
                                        : "bg-card"
                                }`}
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="truncate font-head text-lg font-extrabold">
                                        {space.display_name}
                                    </p>
                                    <span className="flex-none text-xs font-semibold text-muted">
                                        {t(
                                            space.role === "owner"
                                                ? "app.space.role.owner"
                                                : "app.space.role.member"
                                        )}
                                    </span>
                                </div>
                                <p className="text-xs text-muted">
                                    {fill(t("app.space.members.count"), {
                                        count: space.member_count,
                                    })}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {detailLoading ? (
                <p className="text-sm text-muted">{t("app.space.loading")}</p>
            ) : detailError ? (
                <p className="text-sm text-danger">
                    {t("app.space.error")}
                </p>
            ) : detail ? (
                <div className="rounded-2xl bg-card p-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="font-head text-xl font-extrabold">
                            {detail.display_name}
                        </p>
                        <span className="text-xs font-semibold text-muted">
                            {t(
                                isOwner
                                    ? "app.space.role.owner"
                                    : "app.space.role.member"
                            )}
                        </span>
                    </div>

                    <p className="mt-4 text-sm font-semibold">
                        {t("app.space.members.title")}
                    </p>
                    <ul className="mt-1 divide-y divide-line">
                        {detail.members.map((member) => (
                            <li
                                key={member.user_id}
                                className="flex items-center justify-between gap-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                        {member.email ||
                                            t("app.space.memberUnknown")}
                                        {member.user_id === myUserId
                                            ? ` (${t("app.space.members.you")})`
                                            : ""}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {t(
                                            member.role === "owner"
                                                ? "app.space.role.owner"
                                                : "app.space.role.member"
                                        )}
                                    </p>
                                </div>
                                {isOwner &&
                                member.role !== "owner" &&
                                member.user_id !== myUserId ? (
                                    <button
                                        type="button"
                                        disabled={actionBusy}
                                        onClick={() =>
                                            void removeMember(member.user_id)
                                        }
                                        className="flex-none text-xs font-semibold text-danger disabled:opacity-50"
                                    >
                                        {t("app.space.remove.button")}
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>

                    <p className="mt-4 text-sm font-semibold">
                        {t("app.space.items.title")}
                    </p>
                    {items.length === 0 ? (
                        <p className="mt-1 text-xs text-muted">
                            {t("app.space.items.empty")}
                        </p>
                    ) : (
                        <ul className="mt-1 divide-y divide-line">
                            {items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {item.kind === "goal"
                                                ? fill(
                                                      t("app.space.items.goalProgress"),
                                                      {
                                                          progress: item.progress ?? 0,
                                                          target: item.amount,
                                                      }
                                                  )
                                                : fill(t("app.space.items.value"), {
                                                      amount: item.amount,
                                                  })}
                                        </p>
                                        {item.note ? (
                                            <p className="text-xs text-muted">
                                                {item.note}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-none flex-col items-end gap-1">
                                        <button
                                            type="button"
                                            disabled={itemBusy}
                                            onClick={() => editItem(item)}
                                            className="text-xs font-semibold text-brand disabled:opacity-50"
                                        >
                                            {t("app.space.items.edit")}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={itemBusy}
                                            onClick={() => void archiveItem(item.id)}
                                            className="text-xs font-semibold text-danger disabled:opacity-50"
                                        >
                                            {t("app.space.items.archive")}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-3 rounded-xl bg-page p-3">
                        <div className="flex gap-2">
                            {(["asset", "goal"] as const).map((kind) => (
                                <button
                                    key={kind}
                                    type="button"
                                    onClick={() => setItemKind(kind)}
                                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                                        itemKind === kind
                                            ? "bg-mist text-ink"
                                            : "bg-card text-muted"
                                    }`}
                                >
                                    {t(
                                        kind === "asset"
                                            ? "app.space.items.asset"
                                            : "app.space.items.goal"
                                    )}
                                </button>
                            ))}
                        </div>
                        <input
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            maxLength={80}
                            placeholder={t("app.space.items.name")}
                            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-body"
                        />
                        <div className="mt-2 flex gap-2">
                            <input
                                value={itemAmount}
                                onChange={(e) => setItemAmount(e.target.value)}
                                inputMode="decimal"
                                placeholder={t(
                                    itemKind === "goal"
                                        ? "app.space.items.target"
                                        : "app.space.items.amount"
                                )}
                                className="w-1/2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-body"
                            />
                            {itemKind === "goal" ? (
                                <input
                                    value={itemProgress}
                                    onChange={(e) => setItemProgress(e.target.value)}
                                    inputMode="decimal"
                                    placeholder={t("app.space.items.progress")}
                                    className="w-1/2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-body"
                                />
                            ) : null}
                        </div>
                        <input
                            value={itemNote}
                            onChange={(e) => setItemNote(e.target.value)}
                            maxLength={280}
                            placeholder={t("app.space.items.note")}
                            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-body"
                        />
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                disabled={itemBusy}
                                onClick={() => void saveItem()}
                                className="flex-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                            >
                                {itemEditingId
                                    ? t("app.space.items.save")
                                    : t("app.space.items.add")}
                            </button>
                            {itemEditingId ? (
                                <button
                                    type="button"
                                    onClick={resetItemForm}
                                    className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink"
                                >
                                    {t("app.space.items.cancel")}
                                </button>
                            ) : null}
                        </div>
                        {itemError ? (
                            <p className="mt-2 text-xs text-danger">{itemError}</p>
                        ) : null}
                    </div>

                    {isOwner ? (
                        <div className="mt-4 border-t border-line pt-4">
                            <p className="text-sm font-semibold">
                                {t("app.space.invite.title")}
                            </p>
                            <label className="mt-3 block text-xs font-semibold text-muted">
                                {t("app.space.invite.emailLabel")}
                            </label>
                            <input
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                type="email"
                                autoComplete="email"
                                placeholder={t(
                                    "app.space.invite.emailPlaceholder"
                                )}
                                className="mt-1 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-body"
                            />
                            <button
                                type="button"
                                disabled={inviting}
                                onClick={() => void invite()}
                                className="mt-3 w-full rounded-full bg-mist px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                            >
                                {inviting
                                    ? t("app.space.invite.busy")
                                    : t("app.space.invite.button")}
                            </button>
                            {inviteNotice ? (
                                <p className="mt-2 text-xs text-muted">
                                    {inviteNotice}
                                </p>
                            ) : null}
                            {inviteLink ? (
                                <div className="mt-2">
                                    <p className="text-xs font-semibold text-muted">
                                        {t("app.space.invite.link")}
                                    </p>
                                    <p className="break-all text-xs text-body">
                                        {inviteLink}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void copyLink()}
                                        className="mt-2 text-xs font-semibold text-brand"
                                    >
                                        {copied
                                            ? t("app.space.invite.copied")
                                            : t("app.space.invite.copy")}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void leave()}
                            className="mt-4 w-full rounded-full bg-mist px-4 py-3 text-sm font-semibold text-danger disabled:opacity-50"
                        >
                            {t("app.space.leave.button")}
                        </button>
                    )}

                    {actionError ? (
                        <p className="mt-2 text-xs text-danger">{actionError}</p>
                    ) : null}
                </div>
            ) : null}
        </PhoneShell>
    );
}

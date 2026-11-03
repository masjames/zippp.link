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

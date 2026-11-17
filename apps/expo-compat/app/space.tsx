import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { copy, useAppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession, type SessionState } from "../src/home-data";

type SpaceSummary = { id: string; display_name: string; role: "owner" | "member"; member_count: number };
type SpaceMember = { user_id: string; email: string | null; role: "owner" | "member"; joined_at: number };
type SpaceDetail = { id: string; display_name: string; owner_user_id: string; role: "owner" | "member"; members: SpaceMember[] };
type LedgerItem = { id: string; kind: "asset" | "goal"; name: string; amount: number; progress: number | null; note: string | null };
type ScreenState = "loading" | "signedOut" | "error" | "ready";

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json() as T & { ok?: boolean };
  if (!response.ok || !data.ok) throw new Error("REQUEST_FAILED");
  return data;
}

function fill(key: string, language: "en" | "id", values: Record<string, string | number>): string {
  let value = copy(key, language);
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
}

function confirmAction(message: string): boolean {
  if (Platform.OS === "web") return typeof window !== "undefined" && window.confirm(message);
  return true;
}

export default function SpaceScreen() {
  const language = useAppLanguage();
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [userId, setUserId] = useState("");
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
  const t = (key: string) => copy(key, language);
  const signedIn = screen === "ready";

  const loadSpaces = useCallback(async (): Promise<SpaceSummary[]> => {
    if (!signedIn) return [];
    const payload = await jsonRequest<{ spaces?: SpaceSummary[] }>("/api/spaces");
    const rows = Array.isArray(payload.spaces) ? payload.spaces : [];
    setSpaces(rows);
    return rows;
  }, [signedIn]);

  const loadDetail = useCallback(async (spaceId: string) => {
    if (!signedIn) return;
    setDetailLoading(true);
    setDetailError(false);
    try {
      const payload = await jsonRequest<{ space: SpaceDetail }>(`/api/spaces/${encodeURIComponent(spaceId)}`);
      setDetail(payload.space);
    } catch {
      setDetail(null);
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  }, [signedIn]);

  const loadItems = useCallback(async (spaceId: string) => {
    if (!signedIn) return;
    const payload = await jsonRequest<{ items?: LedgerItem[] }>(`/api/spaces/${encodeURIComponent(spaceId)}/assets`);
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [signedIn]);

  useEffect(() => {
    const controller = new AbortController();
    setListError(false);
    setSpaces(null);
    setSelectedId(null);
    setDetail(null);
    void (async () => {
      const session: SessionState = await loadSession((url, init) => fetch(url, init), controller.signal);
      if (controller.signal.aborted) return;
      if (session.kind === "signedOut" || session.kind === "localPreview") {
        setScreen("signedOut");
        return;
      }
      if (session.kind !== "signedIn") {
        setScreen("error");
        return;
      }
      setUserId(session.userId);
      setScreen("ready");
      try {
        const payload = await jsonRequest<{ spaces?: SpaceSummary[] }>("/api/spaces", { signal: controller.signal });
        if (controller.signal.aborted) return;
        const rows = Array.isArray(payload.spaces) ? payload.spaces : [];
        setListError(false);
        setSpaces(rows);
        setSelectedId(rows[0]?.id ?? null);
      } catch {
        if (!controller.signal.aborted) {
          setListError(true);
          setSpaces([]);
        }
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!signedIn || !selectedId) {
      setDetail(null);
      setItems([]);
      return;
    }
    setItemEditingId(null);
    setItemError(null);
    void loadDetail(selectedId);
    void loadItems(selectedId).catch(() => setItems([]));
  }, [selectedId, signedIn, loadDetail, loadItems]);

  function resetItemForm() {
    setItemEditingId(null);
    setItemName("");
    setItemAmount("");
    setItemProgress("");
    setItemNote("");
  }

  async function createSpace() {
    if (!signedIn) return;
    setCreating(true);
    setActionError(null);
    try {
      const payload = await jsonRequest<{ space: SpaceSummary }>("/api/spaces", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: createName }),
      });
      setCreateName("");
      await loadSpaces();
      setSelectedId(payload.space.id);
    } catch { setActionError(t("app.space.error.generic")); }
    finally { setCreating(false); }
  }

  async function invite() {
    if (!signedIn || !detail) return;
    setInviting(true);
    setActionError(null);
    setInviteLink(null);
    setInviteNotice(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/spaces/${encodeURIComponent(detail.id)}/invite`, {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await response.json() as { ok?: boolean; code?: string; path?: string; emailed?: boolean };
      if (!response.ok || !data.ok || !data.path) {
        setActionError(data.code === "INVALID_EMAIL" ? t("app.space.invite.invalidEmail") : t("app.space.error.generic"));
        return;
      }
      const inviteUrl = new URL(data.path, window.location.origin);
      inviteUrl.pathname = "/rn/join";
      setInviteLink(inviteUrl.toString());
      setInviteNotice(t(data.emailed ? "app.space.invite.sent" : "app.space.invite.shareOnly"));
    } catch { setActionError(t("app.space.error.generic")); }
    finally { setInviting(false); }
  }

  async function copyLink() {
    if (!inviteLink || Platform.OS !== "web") return;
    try { await navigator.clipboard.writeText(inviteLink); setCopied(true); }
    catch { setCopied(false); }
  }

  async function removeMember(memberId: string) {
    if (!signedIn || !detail || !confirmAction(t("app.space.remove.confirm"))) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await jsonRequest(`/api/spaces/${encodeURIComponent(detail.id)}/members/${encodeURIComponent(memberId)}`, { method: "DELETE" });
      await loadDetail(detail.id);
      await loadSpaces();
    } catch { setActionError(t("app.space.error.generic")); }
    finally { setActionBusy(false); }
  }

  async function leave() {
    if (!signedIn || !detail || !confirmAction(t("app.space.leave.confirm"))) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/spaces/${encodeURIComponent(detail.id)}/leave`, { method: "POST", cache: "no-store" });
      const data = await response.json() as { ok?: boolean; code?: string };
      if (!response.ok || !data.ok) {
        setActionError(data.code === "OWNER_CANNOT_LEAVE" ? t("app.space.leave.owner") : t("app.space.error.generic"));
        return;
      }
      setSelectedId(null);
      setDetail(null);
      const rows = await loadSpaces();
      setSelectedId(rows[0]?.id ?? null);
    } catch { setActionError(t("app.space.error.generic")); }
    finally { setActionBusy(false); }
  }

  async function saveItem() {
    if (!signedIn || !detail) return;
    const amount = Number(itemAmount.replace(",", "."));
    const progress = Number((itemProgress || "0").replace(",", "."));
    if (!itemName.trim() || !Number.isFinite(amount)) { setItemError(t("app.space.items.error")); return; }
    setItemBusy(true);
    setItemError(null);
    try {
      await jsonRequest(itemEditingId
        ? `/api/spaces/${encodeURIComponent(detail.id)}/assets/${encodeURIComponent(itemEditingId)}`
        : `/api/spaces/${encodeURIComponent(detail.id)}/assets`, {
        method: itemEditingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: itemKind, name: itemName, amount, progress: itemKind === "goal" ? progress : undefined, note: itemNote.trim() || null }),
      });
      resetItemForm();
      await loadItems(detail.id);
    } catch { setItemError(t("app.space.items.error")); }
    finally { setItemBusy(false); }
  }

  async function archiveItem(id: string) {
    if (!signedIn || !detail) return;
    setItemBusy(true);
    setItemError(null);
    try {
      await jsonRequest(`/api/spaces/${encodeURIComponent(detail.id)}/assets/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (itemEditingId === id) resetItemForm();
      await loadItems(detail.id);
    } catch { setItemError(t("app.space.items.error")); }
    finally { setItemBusy(false); }
  }

  const isOwner = detail?.role === "owner";
  return (
    <PreviewShell language={language}>
      <Link href="/settings" asChild><Pressable accessibilityRole="link"><Text style={styles.muted}>{t("app.nav.back")}</Text></Pressable></Link>
      <Text accessibilityRole="header" style={styles.title}>{t("app.space.title")}</Text>
      <Text style={styles.muted}>{t("app.space.subtitle")}</Text>
      {screen === "loading" ? <Text style={styles.muted}>{t("app.space.loading")}</Text> : null}
      {screen === "signedOut" ? <SignInCard language={language} /> : null}
      {screen === "error" ? <View style={styles.card}><Text style={styles.error}>{t("app.space.error")}</Text><Button label={t("app.bad.retry")} onPress={() => setAttempt((value) => value + 1)} /></View> : null}
      {signedIn ? <>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("app.space.create.title")}</Text>
          <Text style={styles.label}>{t("app.space.create.name")}</Text>
          <TextInput accessibilityLabel={t("app.space.create.name")} value={createName} onChangeText={setCreateName} maxLength={80} placeholder={t("app.space.create.placeholder")} style={styles.input} />
          <Button label={creating ? t("app.space.create.busy") : t("app.space.create.button")} disabled={creating} onPress={() => void createSpace()} primary />
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </View>
        {listError ? <Text style={styles.error}>{t("app.space.error")}</Text> : spaces === null ? <Text style={styles.muted}>{t("app.space.loading")}</Text> : spaces.length === 0 ? <Text style={styles.muted}>{t("app.space.empty")}</Text> : <View style={styles.list}>{spaces.map((space) => <Pressable key={space.id} accessibilityRole="button" onPress={() => { setSelectedId(space.id); setInviteLink(null); setInviteNotice(null); }} style={[styles.spaceButton, selectedId === space.id && styles.selected]}>
          <View style={styles.row}><Text numberOfLines={1} style={styles.spaceName}>{space.display_name}</Text><Text style={styles.small}>{t(space.role === "owner" ? "app.space.role.owner" : "app.space.role.member")}</Text></View>
          <Text style={styles.small}>{fill("app.space.members.count", language, { count: space.member_count })}</Text>
        </Pressable>)}</View>}
        {detailLoading ? <Text style={styles.muted}>{t("app.space.loading")}</Text> : detailError ? <Text style={styles.error}>{t("app.space.error")}</Text> : detail ? <View style={styles.card}>
          <View style={styles.row}><Text style={styles.sectionTitle}>{detail.display_name}</Text><Text style={styles.small}>{t(isOwner ? "app.space.role.owner" : "app.space.role.member")}</Text></View>
          <Text style={styles.subheading}>{t("app.space.members.title")}</Text>
          {detail.members.map((member) => <View key={member.user_id} style={styles.memberRow}><View style={styles.flex}><Text numberOfLines={1} style={styles.body}>{member.email || t("app.space.memberUnknown")}{member.user_id === userId ? ` (${t("app.space.members.you")})` : ""}</Text><Text style={styles.small}>{t(member.role === "owner" ? "app.space.role.owner" : "app.space.role.member")}</Text></View>{isOwner && member.role !== "owner" && member.user_id !== userId ? <Button label={t("app.space.remove.button")} disabled={actionBusy} onPress={() => void removeMember(member.user_id)} danger /> : null}</View>)}
          <Text style={styles.subheading}>{t("app.space.items.title")}</Text>
          {!items.length ? <Text style={styles.small}>{t("app.space.items.empty")}</Text> : items.map((item) => <View key={item.id} style={styles.memberRow}><View style={styles.flex}><Text numberOfLines={1} style={styles.body}>{item.name}</Text><Text style={styles.small}>{item.kind === "goal" ? fill("app.space.items.goalProgress", language, { progress: item.progress ?? 0, target: item.amount }) : fill("app.space.items.value", language, { amount: item.amount })}</Text>{item.note ? <Text style={styles.small}>{item.note}</Text> : null}</View><View style={styles.itemButtons}><Button label={t("app.space.items.edit")} disabled={itemBusy} onPress={() => { setItemEditingId(item.id); setItemKind(item.kind); setItemName(item.name); setItemAmount(String(item.amount)); setItemProgress(item.progress === null ? "" : String(item.progress)); setItemNote(item.note ?? ""); }} /><Button label={t("app.space.items.archive")} disabled={itemBusy} onPress={() => void archiveItem(item.id)} danger /></View></View>)}
          <View style={styles.form}>
            <View style={styles.row}>{(["asset", "goal"] as const).map((kind) => <Button key={kind} label={t(kind === "asset" ? "app.space.items.asset" : "app.space.items.goal")} onPress={() => setItemKind(kind)} selected={itemKind === kind} />)}</View>
            <TextInput accessibilityLabel={t("app.space.items.name")} value={itemName} onChangeText={setItemName} maxLength={80} placeholder={t("app.space.items.name")} style={styles.input} />
            <View style={styles.row}><TextInput accessibilityLabel={t(itemKind === "goal" ? "app.space.items.target" : "app.space.items.amount")} value={itemAmount} onChangeText={setItemAmount} keyboardType="decimal-pad" placeholder={t(itemKind === "goal" ? "app.space.items.target" : "app.space.items.amount")} style={[styles.input, styles.flex]} />{itemKind === "goal" ? <TextInput accessibilityLabel={t("app.space.items.progress")} value={itemProgress} onChangeText={setItemProgress} keyboardType="decimal-pad" placeholder={t("app.space.items.progress")} style={[styles.input, styles.flex]} /> : null}</View>
            <TextInput accessibilityLabel={t("app.space.items.note")} value={itemNote} onChangeText={setItemNote} maxLength={280} placeholder={t("app.space.items.note")} style={styles.input} />
            <View style={styles.row}><Button label={t(itemEditingId ? "app.space.items.save" : "app.space.items.add")} disabled={itemBusy} onPress={() => void saveItem()} primary />{itemEditingId ? <Button label={t("app.space.items.cancel")} onPress={resetItemForm} /> : null}</View>
            {itemError ? <Text style={styles.error}>{itemError}</Text> : null}
          </View>
          {isOwner ? <View style={styles.form}><Text style={styles.subheading}>{t("app.space.invite.title")}</Text><Text style={styles.label}>{t("app.space.invite.emailLabel")}</Text><TextInput accessibilityLabel={t("app.space.invite.emailLabel")} value={inviteEmail} onChangeText={setInviteEmail} autoComplete="email" keyboardType="email-address" placeholder={t("app.space.invite.emailPlaceholder")} style={styles.input} /><Button label={inviting ? t("app.space.invite.busy") : t("app.space.invite.button")} disabled={inviting} onPress={() => void invite()} />{inviteNotice ? <Text style={styles.small}>{inviteNotice}</Text> : null}{inviteLink ? <View><Text style={styles.label}>{t("app.space.invite.link")}</Text><Text selectable style={styles.small}>{inviteLink}</Text><Button label={copied ? t("app.space.invite.copied") : t("app.space.invite.copy")} onPress={() => void copyLink()} /></View> : null}</View> : <Button label={t("app.space.leave.button")} disabled={actionBusy} danger onPress={() => void leave()} />}
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </View> : null}
      </> : null}
    </PreviewShell>
  );
}

function Button({ label, onPress, disabled, primary, danger, selected }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, primary && styles.primary, selected && styles.selected, disabled && styles.disabled]}><Text style={[styles.buttonText, danger && styles.dangerText, primary && styles.primaryText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  title: { color: "#241a18", fontSize: 30, lineHeight: 36, fontWeight: "800" },
  muted: { color: "#64514c", fontSize: 14 },
  card: { gap: 12, borderRadius: 18, backgroundColor: "#ffffff", padding: 16 },
  sectionTitle: { flexShrink: 1, color: "#241a18", fontSize: 20, fontWeight: "800" },
  subheading: { marginTop: 6, color: "#241a18", fontSize: 15, fontWeight: "700" },
  label: { color: "#64514c", fontSize: 12, fontWeight: "700" },
  input: { minWidth: 0, borderWidth: 1, borderColor: "#ded8d6", borderRadius: 12, backgroundColor: "#ffffff", paddingHorizontal: 12, paddingVertical: 10, color: "#241a18", fontSize: 14 },
  button: { alignSelf: "flex-start", minHeight: 38, justifyContent: "center", borderRadius: 999, backgroundColor: "#f2efee", paddingHorizontal: 14, paddingVertical: 9 },
  buttonText: { color: "#241a18", fontSize: 13, fontWeight: "700", textAlign: "center" },
  primary: { alignSelf: "stretch", backgroundColor: "#f04c24" },
  primaryText: { color: "#170b08" },
  dangerText: { color: "#b42318" },
  disabled: { opacity: 0.5 },
  list: { gap: 8 },
  spaceButton: { gap: 5, borderRadius: 16, backgroundColor: "#ffffff", padding: 14 },
  selected: { backgroundColor: "#fce7e0" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  spaceName: { flex: 1, color: "#241a18", fontSize: 17, fontWeight: "800" },
  small: { color: "#64514c", fontSize: 12 },
  body: { color: "#241a18", fontSize: 14, fontWeight: "600" },
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ded8d6", paddingVertical: 9 },
  flex: { flex: 1, minWidth: 0 },
  itemButtons: { alignItems: "flex-end", gap: 5 },
  form: { gap: 9, borderRadius: 14, backgroundColor: "#f7f5f4", padding: 12 },
  error: { color: "#b42318", fontSize: 13 },
});

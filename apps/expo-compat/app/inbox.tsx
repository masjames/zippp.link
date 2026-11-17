import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { fromByteArray } from "base64-js";
import { copy, useAppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession, type SessionState } from "../src/home-data";
import { listDrafts, loadDraft, removeDraft, updateDraft, type DraftContents, type DraftSummary } from "../src/draft-store";
import { appendDraft, checkReceiptForSend, extractDraft, type ReviewWorkspace } from "../src/receipt-flow";
import { ReceiptReview } from "../src/components/ReceiptReview";

type InboxState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "error" }
  | { kind: "storageError" }
  | { kind: "signedIn"; userId: string; drafts: DraftSummary[]; workspace: ReviewWorkspace | null };

type SelectedDraft = DraftContents & { imageUri: string };

type WorkspacePayload = {
  ok: boolean;
  workspace: ReviewWorkspace | null;
};

const statusCopy: Record<NonNullable<DraftSummary["status"]>, string> = {
  queued: "app.queue.queued",
  reading: "app.queue.reading",
  ready: "app.queue.ready",
  failed: "app.queue.failed",
  accepted: "app.queue.sending",
  sending: "app.queue.sending",
};

export default function InboxScreen() {
  const language = useAppLanguage();
  const [state, setState] = useState<InboxState>(
    Platform.OS === "web" ? { kind: "loading" } : { kind: "signedOut" },
  );
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SelectedDraft | null>(null);
  const [openingDraft, setOpeningDraft] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const [showCheckErrors, setShowCheckErrors] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());
  const locale = language === "id" ? "id-ID" : "en-AU";

  useEffect(() => {
    if (Platform.OS !== "web") {
      setState({ kind: "signedOut" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      const session: SessionState = await loadSession((url, init) => fetch(url, init), controller.signal);
      if (controller.signal.aborted) return;
      if (session.kind !== "signedIn") {
        setState(session.kind === "signedOut" || session.kind === "localPreview" ? { kind: "signedOut" } : { kind: "error" });
        return;
      }
      try {
        const [drafts, workspaceResponse] = await Promise.all([
          listDrafts(session.userId),
          fetch("/api/sheets/workspace", { cache: "no-store", signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        let workspace: ReviewWorkspace | null = null;
        if (workspaceResponse.ok) {
          const payload = await workspaceResponse.json() as WorkspacePayload;
          if (!payload.ok || !payload.workspace) throw new Error("Workspace response is invalid");
          workspace = payload.workspace;
        } else if (workspaceResponse.status !== 404) {
          throw new Error("Workspace could not be loaded");
        }
        setState({ kind: "signedIn", userId: session.userId, drafts, workspace });
      } catch {
        if (!controller.signal.aborted) setState({ kind: "storageError" });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  function patchSelectedDraft(draft: NonNullable<SelectedDraft["draft"]>) {
    if (!selected || state.kind !== "signedIn") return;
    const next = { ...selected, draft };
    setSelected(next);
    setCheckedId(null);
    setShowCheckErrors(false);
    const ownerId = state.userId;
    const id = selected.id;
    persistenceQueue.current = persistenceQueue.current
      .catch(() => undefined)
      .then(async () => {
        await updateDraft(ownerId, id, { draft });
      });
    void persistenceQueue.current.catch(() => {
      setMessage(copy("app.expoCapture.storageUnavailable", language));
    });
  }

  async function openDraft(draft: DraftSummary) {
    if (state.kind !== "signedIn") return;
    setOpeningDraft(true);
    setMessage(null);
    setCheckedId(null);
    try {
      const contents = await loadDraft(state.userId, draft.id);
      if (!contents) throw new Error("Draft not found");
      setSelected({
        ...contents,
        imageUri: `data:${contents.mimeType};base64,${fromByteArray(contents.imageBytes)}`,
      });
    } catch {
      setState({ kind: "storageError" });
    } finally {
      setOpeningDraft(false);
    }
  }

  async function retryDraft(id: string) {
    if (state.kind !== "signedIn") return;
    setWorkingId(id);
    setMessage(null);
    try {
      const result = await extractDraft(state.userId, id);
      if (result.kind === "signedOut") {
        setState({ kind: "signedOut" });
        setSelected(null);
        return;
      }
      if (result.kind !== "ready") setMessage(copy("app.expoCapture.extractFailed", language));
      if (selected?.id === id && result.kind === "ready") {
        const contents = await loadDraft(state.userId, id);
        if (contents) {
          setSelected({
            ...contents,
            imageUri: `data:${contents.mimeType};base64,${fromByteArray(contents.imageBytes)}`,
          });
        }
      }
    } catch {
      setMessage(copy("app.expoCapture.extractFailed", language));
    } finally {
      setWorkingId(null);
      setAttempt((value) => value + 1);
    }
  }

  async function deleteDraft(id: string) {
    if (state.kind !== "signedIn") return;
    setWorkingId(id);
    try {
      await removeDraft(state.userId, id);
      if (selected?.id === id) setSelected(null);
      setCheckedId(null);
      setAttempt((value) => value + 1);
    } catch {
      setMessage(copy("app.expoCapture.storageUnavailable", language));
    } finally {
      setWorkingId(null);
    }
  }

  async function checkDraft() {
    if (state.kind !== "signedIn" || !selected?.receipt || !selected.draft) return;
    setShowCheckErrors(true);
    const check = checkReceiptForSend(selected.receipt, selected.draft, state.workspace);
    if (!check.canSend) return;
    try {
      await persistenceQueue.current;
      await updateDraft(state.userId, selected.id, { draft: selected.draft });
      setCheckedId(selected.id);
      setMessage(null);
    } catch {
      setMessage(copy("app.expoCapture.storageUnavailable", language));
    }
  }

  async function sendDraft() {
    if (state.kind !== "signedIn" || !selected || !state.workspace) return;
    setWorkingId(selected.id);
    setMessage(null);
    try {
      const result = await appendDraft(
        state.userId,
        selected.id,
        state.workspace,
        checkedId === selected.id,
      );
      if (result.kind === "signedOut") {
        setState({ kind: "signedOut" });
        setSelected(null);
        return;
      }
      if (result.kind === "failed" && (result.status === 401 || result.status === 403)) {
        setState({ kind: "signedOut" });
        setSelected(null);
        return;
      }
      if (result.kind === "notReady") {
        setMessage(copy("app.expoCapture.extractFailed", language));
        setCheckedId(null);
        return;
      }
      if (result.kind === "sent") {
        setSelected(null);
        setCheckedId(null);
        setMessage(copy("app.review.saved", language));
        setAttempt((value) => value + 1);
        return;
      }
      if (result.kind === "failed" && result.status === 402) {
        setMessage(copy("app.inbox.noCredits", language));
      } else {
        setMessage(copy("app.check.sendErr", language));
      }
      setCheckedId(null);
    } catch {
      setMessage(copy("app.check.sendErr", language));
      setCheckedId(null);
    } finally {
      setWorkingId(null);
    }
  }

  const drafts = state.kind === "signedIn" ? state.drafts : [];
  const workspace = state.kind === "signedIn" ? state.workspace : null;

  return (
    <PreviewShell language={language}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.inbox.title", language)}</Text>
      {state.kind === "loading" ? (
        <Text accessibilityRole="status" style={styles.note}>{copy("app.inbox.loading", language)}</Text>
      ) : null}
      {state.kind === "signedOut" ? <SignInCard language={language} /> : null}
      {state.kind === "error" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.expoPreview.connectionError", language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
            <Text style={styles.link}>{copy("app.home.retry", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "storageError" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.expoCapture.storageUnavailable", language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
            <Text style={styles.link}>{copy("app.home.retry", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "signedIn" && !workspace ? (
        <View style={styles.card}>
          <Text style={styles.body}>{copy("app.home.noWorkspace", language)}</Text>
          <Pressable
            accessibilityRole="link"
            style={styles.openButton}
            onPress={() => {
              if (Platform.OS === "web") window.location.assign("/app/settings/sheet");
            }}
          >
            <Text style={styles.openText}>{copy("app.home.sheetSettings", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "signedIn" && drafts.length === 0 ? (
        <Text style={styles.note}>{copy("app.expoCapture.empty", language)}</Text>
      ) : null}
      {drafts.map((draft) => (
        <View key={draft.id} style={styles.draftCard}>
          <View style={styles.draftDetails}>
            <Text style={styles.draftTitle}>{draft.draft?.merchant.trim() || draft.receipt?.merchant || copy("app.inbox.receipt", language)}</Text>
            <Text style={styles.note}>{copy(statusCopy[draft.status], language)}</Text>
            <Text style={styles.note}>{copy("app.expoCapture.capturedAt", language)} · {new Date(draft.createdAt).toLocaleString(locale)}</Text>
          </View>
          {draft.status === "failed" ? (
            <View style={styles.row}>
              <Pressable accessibilityRole="button" disabled={workingId === draft.id} style={styles.openButton} onPress={() => void retryDraft(draft.id)}>
                <Text style={styles.openText}>{copy("app.queue.retry", language)}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={workingId === draft.id} onPress={() => void deleteDraft(draft.id)}>
                <Text style={styles.deleteText}>{copy("app.queue.remove", language)}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" disabled={openingDraft || workingId === draft.id} style={styles.openButton} onPress={() => void openDraft(draft)}>
              <Text style={styles.openText}>{copy("app.queue.check", language)}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {message ? <Text accessibilityRole="status" style={styles.note}>{message}</Text> : null}
      <Link href="/capture" asChild>
        <Pressable accessibilityRole="link" style={styles.captureLink}>
          <Text style={styles.openText}>{copy("app.home.capture", language)}</Text>
        </Pressable>
      </Link>
      {selected ? (
        <View style={styles.previewCard}>
          <Image
            accessibilityLabel={copy("app.inbox.receipt", language)}
            source={{ uri: selected.imageUri }}
            resizeMode="contain"
            style={styles.previewImage}
          />
          {selected.status === "reading" ? (
            <Text accessibilityRole="status" style={styles.note}>{copy("app.review.reading", language)}</Text>
          ) : selected.status === "failed" || !selected.receipt || !selected.draft ? (
            <View style={styles.card}>
              <Text style={styles.body}>{copy("app.bad.title", language)}</Text>
              <Text style={styles.note}>{copy("app.bad.body", language)}</Text>
              <Pressable accessibilityRole="button" disabled={workingId === selected.id} style={styles.openButton} onPress={() => void retryDraft(selected.id)}>
                <Text style={styles.openText}>{copy("app.bad.retry", language)}</Text>
              </Pressable>
            </View>
          ) : workspace ? (
            <ReceiptReview
              receipt={selected.receipt}
              draft={selected.draft}
              workspace={workspace}
              language={language}
              checked={checkedId === selected.id}
              showErrors={showCheckErrors}
              sending={workingId === selected.id}
              message={message}
              onDraftChange={patchSelectedDraft}
              onCheck={() => void checkDraft()}
              onSend={() => void sendDraft()}
              onDelete={() => void deleteDraft(selected.id)}
            />
          ) : (
            <View style={styles.card}>
              <Text style={styles.body}>{copy("app.home.noWorkspace", language)}</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" style={styles.inboxLink} onPress={() => setSelected(null)}>
            <Text style={styles.linkText}>{copy("app.expoCapture.back", language)}</Text>
          </Pressable>
        </View>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#180c0b", fontSize: 30, fontWeight: "800" },
  card: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  body: { color: "#64514c", fontSize: 18, lineHeight: 26 },
  note: { color: "#64514c", fontSize: 14 },
  link: { color: "#241a18", fontSize: 15, fontWeight: "700" },
  draftCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 16 },
  draftDetails: { flex: 1, gap: 4 },
  draftTitle: { color: "#180c0b", fontSize: 16, fontWeight: "700" },
  row: { alignItems: "center", gap: 8 },
  openButton: { alignItems: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 16, paddingVertical: 10 },
  openText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
  deleteText: { color: "#b42318", fontSize: 14, fontWeight: "700" },
  previewCard: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 12 },
  previewImage: { width: "100%", height: 320 },
  captureLink: { alignSelf: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 20, paddingVertical: 12 },
  inboxLink: { alignSelf: "center", borderRadius: 999, backgroundColor: "#ffffff", paddingHorizontal: 20, paddingVertical: 12 },
  linkText: { color: "#241a18", fontSize: 15, fontWeight: "700" },
});

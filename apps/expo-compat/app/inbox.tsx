import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { fromByteArray } from "base64-js";
import { copy, useAppLanguage } from "../src/copy";
import { LegacyInboxCard, SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession, type SessionState } from "../src/home-data";
import { listDrafts, loadDraft, type DraftContents, type DraftSummary } from "../src/draft-store";

type InboxState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "error" }
  | { kind: "storageError"; localPreview: boolean }
  | { kind: "localPreview"; userId: string; drafts: DraftSummary[] }
  | { kind: "signedIn"; userId: string; drafts: DraftSummary[] };

type SelectedDraft = Pick<DraftContents, "id" | "mimeType"> & { uri: string };

export default function InboxScreen() {
  const language = useAppLanguage();
  const [state, setState] = useState<InboxState>(
    Platform.OS === "web"
      ? { kind: "loading" }
      : { kind: "localPreview", userId: "local-preview-user", drafts: [] },
  );
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SelectedDraft | null>(null);
  const [openingDraft, setOpeningDraft] = useState(false);
  const locale = language === "id" ? "id-ID" : "en-AU";

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void (async () => {
      const session: SessionState = Platform.OS === "web"
        ? await loadSession((url, init) => fetch(url, init), controller.signal)
        : { kind: "localPreview", userId: "local-preview-user" };
      if (controller.signal.aborted) return;
      if (session.kind !== "localPreview" && session.kind !== "signedIn") {
        setState(session);
        return;
      }
      try {
        const drafts = await listDrafts(session.userId);
        if (!controller.signal.aborted) setState({ ...session, drafts });
      } catch {
        if (!controller.signal.aborted) {
          setState({ kind: "storageError", localPreview: session.kind === "localPreview" });
        }
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  async function openDraft(draft: DraftSummary) {
    if (state.kind !== "localPreview" && state.kind !== "signedIn") return;
    setOpeningDraft(true);
    try {
      const contents = await loadDraft(state.userId, draft.id);
      if (!contents) throw new Error("Draft not found");
      setSelected({
        id: contents.id,
        mimeType: contents.mimeType,
        uri: `data:${contents.mimeType};base64,${fromByteArray(contents.imageBytes)}`,
      });
    } catch {
      setState({ kind: "storageError", localPreview: state.kind === "localPreview" });
    } finally {
      setOpeningDraft(false);
    }
  }

  const localPreview = state.kind === "localPreview" || (state.kind === "storageError" && state.localPreview);
  const drafts = state.kind === "localPreview" || state.kind === "signedIn" ? state.drafts : [];

  return (
    <PreviewShell language={language} localPreview={localPreview}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.inbox.title", language)}</Text>
      {state.kind === "loading" ? (
        <Text accessibilityRole="text" style={styles.note}>{copy("app.inbox.loading", language)}</Text>
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
      {state.kind === "localPreview" && drafts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>{copy("app.inbox.localPreviewEmpty", language)}</Text>
        </View>
      ) : null}
      {state.kind === "signedIn" && drafts.length === 0 ? (
        <Text style={styles.note}>{copy("app.expoCapture.empty", language)}</Text>
      ) : null}
      {drafts.map((draft) => (
        <View key={draft.id} style={styles.draftCard}>
          <View style={styles.draftDetails}>
            <Text style={styles.draftTitle}>{copy("app.inbox.receipt", language)}</Text>
            <Text style={styles.note}>{copy("app.expoCapture.capturedAt", language)} · {new Date(draft.createdAt).toLocaleString(locale)}</Text>
            <Text style={styles.note}>{copy("app.expoCapture.saved", language)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={openingDraft}
            style={styles.openButton}
            onPress={() => void openDraft(draft)}
          >
            <Text style={styles.openText}>{copy("app.inbox.open", language)}</Text>
          </Pressable>
        </View>
      ))}
      {state.kind === "signedIn" ? <LegacyInboxCard language={language} /> : null}
      {selected ? (
        <View style={styles.previewCard}>
          <Image
            accessibilityLabel={copy("app.inbox.receipt", language)}
            source={{ uri: selected.uri }}
            resizeMode="contain"
            style={styles.previewImage}
          />
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)}>
            <Text style={styles.openText}>{copy("app.expoCapture.back", language)}</Text>
          </Pressable>
        </View>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#180c0b", fontSize: 30, fontWeight: "800" },
  card: { gap: 16, borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  body: { color: "#64514c", fontSize: 18, lineHeight: 26 },
  note: { color: "#64514c", fontSize: 14 },
  link: { color: "#170b08", fontSize: 15, fontWeight: "700" },
  draftCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 16 },
  draftDetails: { flex: 1, gap: 4 },
  draftTitle: { color: "#180c0b", fontSize: 16, fontWeight: "700" },
  openButton: { borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 16, paddingVertical: 10 },
  openText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
  previewCard: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 12 },
  previewImage: { width: "100%", height: 420 },
});

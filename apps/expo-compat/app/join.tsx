import { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { copy, useAppLanguage } from "../src/copy";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession } from "../src/home-data";

type Phase = "loading" | "signedOut" | "ready" | "joining" | "joined" | "invalid" | "missing" | "mismatch" | "error";
type JoinResponse = { ok?: boolean; code?: string; already_member?: boolean; space?: { display_name?: string } };

function fill(key: string, language: "en" | "id", name: string): string {
  return copy(key, language).replace("{name}", name);
}

export default function JoinScreen() {
  const language = useAppLanguage();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code ?? "").trim();
  const [phase, setPhase] = useState<Phase>(code ? "loading" : "missing");
  const [spaceName, setSpaceName] = useState("");

  useEffect(() => {
    if (!code) {
      setPhase("missing");
      return;
    }
    const controller = new AbortController();
    setPhase("loading");
    void (async () => {
      try {
        const previewResponse = await fetch(`/api/spaces/join?code=${encodeURIComponent(code)}`, { cache: "no-store", signal: controller.signal });
        const preview = await previewResponse.json() as { ok?: boolean; space?: { display_name?: string } };
        if (controller.signal.aborted) return;
        if (!previewResponse.ok || !preview.ok || !preview.space?.display_name) {
          setPhase("invalid");
          return;
        }
        setSpaceName(preview.space.display_name);
        const session = await loadSession((url, init) => fetch(url, init), controller.signal);
        if (controller.signal.aborted) return;
        if (session.kind === "signedIn") setPhase("ready");
        else if (session.kind === "signedOut" || session.kind === "localPreview") setPhase("signedOut");
        else setPhase("error");
      } catch {
        if (!controller.signal.aborted) setPhase("error");
      }
    })();
    return () => controller.abort();
  }, [code]);

  async function join() {
    if (phase !== "ready" || !code) return;
    setPhase("joining");
    try {
      const response = await fetch("/api/spaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json() as JoinResponse;
      if (response.status === 401) {
        setPhase("signedOut");
        return;
      }
      if (!response.ok || !data.ok) {
        if (data.code === "INVITE_EMAIL_MISMATCH") setPhase("mismatch");
        else if (data.code === "INVALID_INVITE" || data.code === "SPACE_NOT_FOUND") setPhase("invalid");
        else setPhase("error");
        return;
      }
      setSpaceName(data.space?.display_name ?? spaceName);
      setPhase("joined");
    } catch {
      setPhase("error");
    }
  }

  const signInUrl = `/api/auth/login?next=${encodeURIComponent(`/rn/join?code=${code}`)}`;
  const messageKey = phase === "missing"
    ? "app.space.join.missingCode"
    : phase === "invalid"
      ? "app.space.join.invalid"
      : phase === "mismatch"
        ? "app.space.join.emailMismatch"
        : phase === "error"
          ? "app.space.join.error"
          : null;

  return (
    <PreviewShell language={language}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.space.join.title", language)}</Text>
      {phase === "loading" || phase === "joining" ? (
        <Text accessibilityRole="status" style={styles.note}>{copy(phase === "joining" ? "app.space.join.busy" : "app.space.join.loading", language)}</Text>
      ) : null}
      {messageKey ? <Text accessibilityRole="alert" style={styles.error}>{copy(messageKey, language)}</Text> : null}
      {phase === "signedOut" || phase === "ready" ? (
        <View style={styles.card}>
          <Text style={styles.body}>{fill("app.space.join.invited", language, spaceName)}</Text>
          {phase === "signedOut" ? (
            <Pressable accessibilityRole="link" style={styles.primary} onPress={() => { if (typeof window !== "undefined") window.location.assign(signInUrl); }}>
              <Text style={styles.buttonText}>{copy("app.space.join.signIn", language)}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" style={styles.primary} onPress={() => void join()}>
              <Text style={styles.buttonText}>{copy("app.space.join.button", language)}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      {phase === "joined" ? (
        <View style={styles.card}>
          <Text style={styles.body}>{fill("app.space.join.success", language, spaceName)}</Text>
          <Link href="/space" asChild>
            <Pressable accessibilityRole="link" style={styles.primary}>
              <Text style={styles.buttonText}>{copy("app.space.join.open", language)}</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#241a18", fontSize: 30, lineHeight: 36, fontWeight: "800" },
  card: { gap: 16, borderRadius: 18, backgroundColor: "#ffffff", padding: 18 },
  body: { color: "#241a18", fontSize: 15, lineHeight: 23 },
  note: { color: "#64514c", fontSize: 14 },
  error: { color: "#b42318", fontSize: 14 },
  primary: { alignItems: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
});

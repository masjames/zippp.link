import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { copy, useAppLanguage } from "../../../src/copy";
import { SignInCard } from "../../../src/components/AccountActions";
import { PreviewShell } from "../../../src/components/PreviewShell";
import { loadSession, type SessionState } from "../../../src/home-data";

type Order = { id: string; amount: number; credits: number; status: "pending" | "succeeded" | "failed" | "expired" | "canceled"; expiresAt: number; checkoutUrl: string };
type ScreenState = SessionState | { kind: "loading" };

export default function QrisStatusScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [session, setSession] = useState<ScreenState>({ kind: "loading" });
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadSession((url, init) => fetch(url, init), controller.signal).then((value) => {
      setSession(value);
      if (value.kind !== "signedIn" || !id) return;
      const load = async () => {
        try {
          const response = await fetch(`/api/topup/qris/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
          const data = await response.json() as { ok?: boolean; error?: string; order?: Order };
          if (data.ok && data.order) { setOrder(data.order); setError(null); }
          else setError(data.error || copy("app.error.failed", language));
        } catch { if (!controller.signal.aborted) setError(copy("app.error.network", language)); }
      };
      void load();
      const interval = setInterval(() => void load(), 3000);
      controller.signal.addEventListener("abort", () => clearInterval(interval), { once: true });
    });
    return () => controller.abort();
  }, [id, language]);

  const settled = order?.status === "succeeded";
  const dead = order?.status === "expired" || order?.status === "failed" || order?.status === "canceled";
  return <PreviewShell language={language}>
    <Text accessibilityRole="header" style={styles.title}>{copy("app.topup.title", language)}</Text>
    {session.kind === "loading" ? <Text style={styles.body}>{copy("app.home.loading", language)}</Text> : null}
    {session.kind === "signedOut" ? <SignInCard language={language} /> : null}
    {session.kind === "error" ? <Text style={styles.error}>{copy("app.error.failed", language)}</Text> : null}
    {session.kind === "signedIn" && order ? <View style={styles.card}>
      <Text style={styles.body}>{copy(settled ? "app.qris.paid" : dead ? "app.qris.expired" : "app.qris.waiting", language)}</Text>
      <Text style={styles.amount}>Rp {order.amount.toLocaleString("id-ID")}</Text>
      {settled ? <Text style={styles.muted}>{copy("app.qris.credits", language).replace("{count}", String(order.credits))}</Text> : null}
      {!settled && !dead ? <Pressable accessibilityRole="link" onPress={() => { if (typeof window !== "undefined") window.location.assign(order.checkoutUrl); }} style={styles.button}><Text style={styles.buttonText}>{copy("app.qris.open", language)}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace(settled ? "/" : "/topup")} style={[styles.button, styles.secondary]}><Text style={styles.secondaryText}>{copy(settled ? "app.qris.backSnap" : "app.qris.backTopup", language)}</Text></Pressable>
    </View> : null}
    {session.kind === "signedIn" && !order ? <Text style={error ? styles.error : styles.muted}>{error || copy("app.qris.waiting", language)}</Text> : null}
  </PreviewShell>;
}

const styles = StyleSheet.create({ title: { color: "#180c0b", fontSize: 30, fontWeight: "800" }, card: { gap: 14, borderRadius: 16, backgroundColor: "#fff", padding: 20 }, body: { color: "#180c0b", fontSize: 18, fontWeight: "700" }, amount: { color: "#180c0b", fontSize: 26, fontWeight: "800" }, muted: { color: "#64514c" }, button: { borderRadius: 999, backgroundColor: "#f04c24", padding: 15, alignItems: "center" }, buttonText: { color: "#170b08", fontWeight: "700" }, secondary: { backgroundColor: "#f3f0ef" }, secondaryText: { color: "#180c0b", fontWeight: "700" }, error: { color: "#a52117", fontWeight: "600" } });

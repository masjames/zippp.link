import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { copy, useAppLanguage } from "../../../src/copy";
import { SignInCard } from "../../../src/components/AccountActions";
import { PreviewShell } from "../../../src/components/PreviewShell";
import { loadSession, type SessionState } from "../../../src/home-data";

type Order = { id: string; baseIdr: number; payIdr: number; state: "pending" | "claimed" | "approved" | "rejected" | "expired"; expiresAt: number };
type ScreenState = SessionState | { kind: "loading" };
type GoPay = { number: string; name: string };
function remaining(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "0:00";
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
}

export default function GoPayOrderScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [session, setSession] = useState<ScreenState>({ kind: "loading" });
  const [order, setOrder] = useState<Order | null>(null);
  const [gopay, setGopay] = useState<GoPay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let polling: ReturnType<typeof setInterval> | undefined;
    let clock: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      if (!id || controller.signal.aborted) return;
      try {
        const response = await fetch(`/api/topup/orders/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { ok?: boolean; error?: string; order?: Order; gopay?: GoPay };
        if (data.ok && data.order) { setOrder(data.order); setGopay(data.gopay || null); setError(null); }
        else setError(data.error || copy("app.error.failed", language));
      } catch { if (!controller.signal.aborted) setError(copy("app.error.network", language)); }
    };
    void loadSession((url, init) => fetch(url, init), controller.signal).then((value) => {
      setSession(value);
      if (value.kind !== "signedIn" || !id) return;
      void load();
      polling = setInterval(() => void load(), 5000);
      clock = setInterval(() => setTick((n) => n + 1), 1000);
    });
    return () => { controller.abort(); clearInterval(polling); clearInterval(clock); };
  }, [id, language]);

  async function action(kind: "claim" | "cancel") {
    if (busy || !order || order.state !== "pending" && !(kind === "cancel" && order.state === "claimed")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/topup/orders/${encodeURIComponent(id || "")}/${kind}`, { method: "POST" });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || data.ok === false) { setError(data.error || copy("app.error.failed", language)); return; }
      if (kind === "cancel") router.replace("/topup");
      else {
        const refreshed = await fetch(`/api/topup/orders/${encodeURIComponent(id || "")}`, { cache: "no-store" });
        const result = await refreshed.json() as { ok?: boolean; order?: Order; gopay?: GoPay; error?: string };
        if (result.ok && result.order) { setOrder(result.order); setGopay(result.gopay || null); }
        else setError(result.error || copy("app.error.failed", language));
      }
    } catch { setError(copy("app.error.network", language)); }
    finally { setBusy(false); }
  }
  void tick;
  const statusKey = order?.state === "approved" ? "app.order.approved" : order?.state === "rejected" ? "app.order.rejected" : order?.state === "expired" ? "app.order.expired" : order?.state === "claimed" ? "app.order.claimed" : "app.order.waiting";
  return <PreviewShell language={language}>
    <Text accessibilityRole="header" style={styles.title}>{copy("app.topup.title", language)}</Text>
    {session.kind === "loading" ? <Text style={styles.body}>{copy("app.home.loading", language)}</Text> : null}
    {session.kind === "signedOut" ? <SignInCard language={language} /> : null}
    {session.kind === "error" ? <Text style={styles.error}>{copy("app.error.failed", language)}</Text> : null}
    {session.kind === "signedIn" && order ? <View style={styles.card}>
      <Text style={styles.body}>{copy("app.order.payTo", language)}</Text>
      <Text style={styles.number}>{gopay?.number}</Text>
      <Text style={styles.muted}>{gopay?.name}</Text>
      <View style={styles.amountCard}><Text style={styles.muted}>{copy("app.order.amount", language)}</Text><Text style={styles.amount}>Rp {order.payIdr.toLocaleString("id-ID")}</Text>{order.state === "pending" ? <Text style={styles.muted}>{copy("app.order.expiresIn", language).replace("{time}", remaining(order.expiresAt))}</Text> : null}</View>
      <Text style={styles.status}>{copy(statusKey, language)}</Text>
      {order.state === "pending" ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void action("claim")} style={[styles.button, busy && styles.disabled]}><Text style={styles.buttonText}>{copy("app.order.paid", language)}</Text></Pressable> : null}
      {order.state === "pending" || order.state === "claimed" ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void action("cancel")} style={[styles.button, styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>{copy("app.order.cancel", language)}</Text></Pressable> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="link" onPress={() => router.replace("/")} style={[styles.button, styles.secondary]}><Text style={styles.secondaryText}>{copy("app.nav.back", language)}</Text></Pressable>
    </View> : null}
    {session.kind === "signedIn" && !order ? <Text style={error ? styles.error : styles.muted}>{error || copy("app.order.waiting", language)}</Text> : null}
  </PreviewShell>;
}

const styles = StyleSheet.create({ title: { color: "#180c0b", fontSize: 30, fontWeight: "800" }, card: { gap: 12, borderRadius: 16, backgroundColor: "#fff", padding: 20 }, body: { color: "#180c0b", fontSize: 18, fontWeight: "700" }, number: { color: "#180c0b", fontSize: 20, fontWeight: "700" }, muted: { color: "#64514c" }, amountCard: { gap: 4, borderRadius: 12, backgroundColor: "#f6f3f2", padding: 14 }, amount: { color: "#180c0b", fontSize: 25, fontWeight: "800" }, status: { textAlign: "center", color: "#180c0b", fontWeight: "600" }, button: { borderRadius: 999, backgroundColor: "#f04c24", padding: 15, alignItems: "center" }, buttonText: { color: "#170b08", fontWeight: "700" }, secondary: { backgroundColor: "#f3f0ef" }, secondaryText: { color: "#180c0b", fontWeight: "700" }, disabled: { opacity: 0.5 }, error: { color: "#a52117", fontWeight: "600" } });

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { copy, useAppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession, type SessionState } from "../src/home-data";

type PaddleSettings = { configured: boolean; clientToken: string; priceId: string; env: string; credits: number; usd: number };
type TopUpConfig = { ok: boolean; region: "id" | "intl"; gopay: boolean; qris: boolean; minIdr: number; maxIdr: number; idrPerCredit: number; presets: number[]; inviteMismatch: string | null; paddle: PaddleSettings };
type State = SessionState | { kind: "loading" };
type PaddleCheckout = { Environment: { set(env: string): void }; Initialize(options: { token: string }): void; Checkout: { open(options: { items: { priceId: string; quantity: number }[]; customData: { google_user_id: string } }): void } };
declare global { interface Window { Paddle?: PaddleCheckout } }
export default function TopUpScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const [session, setSession] = useState<State>({ kind: "loading" });
  const [config, setConfig] = useState<TopUpConfig | null>(null);
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"gopay" | "qris">("gopay");
  const amount = Number(amountText);
  const presets = config
    ? config.minIdr < (config.presets[0] ?? config.minIdr)
      ? [config.minIdr, ...config.presets]
      : config.presets
    : [];
  const valid = Boolean(config && Number.isFinite(amount) && Number.isInteger(amount) && amount >= config.minIdr && amount <= config.maxIdr && amount % 1000 === 0);

  useEffect(() => {
    const controller = new AbortController();
    void loadSession((url, init) => fetch(url, init), controller.signal).then(async (value) => {
      setSession(value);
      if (value.kind !== "signedIn") return;
      try {
        const response = await fetch("/api/topup/config", { cache: "no-store", signal: controller.signal });
        const data = await response.json() as TopUpConfig;
        if (!response.ok || !data.ok) throw new Error(copy("app.error.failed", language));
        setConfig(data);
        setAmountText(String(data.region === "id"
          ? data.minIdr < (data.presets[0] ?? data.minIdr) ? data.minIdr : (data.presets[1] ?? data.minIdr)
          : ""));
        setMethod(data.qris ? "qris" : "gopay");
      } catch {
        if (!controller.signal.aborted) setError(copy("app.error.network", language));
      }
    });
    return () => controller.abort();
  }, [language]);

  useEffect(() => {
    if (session.kind !== "signedIn" || config?.region !== "intl" || !config.paddle.configured || typeof document === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const paddle = window.Paddle;
      if (!paddle) return;
      if (config.paddle.env === "sandbox") paddle.Environment.set("sandbox");
      paddle.Initialize({ token: config.paddle.clientToken });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [session.kind, config]);

  async function createOrder(method: "gopay" | "qris") {
    if (session.kind !== "signedIn" || !config || config.region !== "id" || !valid || busy || !(method === "qris" ? config.qris : config.gopay)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(method === "qris" ? "/api/topup/qris" : "/api/topup/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method === "qris" ? { amountIdr: amount } : { baseIdr: amount }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; order?: { id?: string; checkoutUrl?: string } };
      if (!response.ok || !data.ok || !data.order?.id) {
        setError(data.error || copy("app.error.failed", language));
        return;
      }
      router.push(method === "qris"
        ? `/topup/qris/${encodeURIComponent(data.order.id)}`
        : `/topup/order/${encodeURIComponent(data.order.id)}`);
    } catch {
      setError(copy("app.error.network", language));
    } finally {
      setBusy(false);
    }
  }
  function buyPaddle() {
    if (session.kind !== "signedIn" || !config || config.region !== "intl" || !config.paddle.configured || typeof window === "undefined") return;
    const paddle = window.Paddle;
    if (!paddle) {
      setError(copy("app.topup.checkoutLoading", language));
      return;
    }
    paddle.Checkout.open({
      items: [{ priceId: config.paddle.priceId, quantity: 1 }],
      customData: { google_user_id: session.userId },
    });
  }

  return (
    <PreviewShell language={language}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.topup.title", language)}</Text>
      {session.kind === "loading" ? <Text style={styles.body}>{copy("app.home.loading", language)}</Text> : null}
      {session.kind === "signedOut" ? <SignInCard language={language} /> : null}
      {session.kind === "error" ? <Text style={styles.error}>{copy("app.error.failed", language)}</Text> : null}
      {session.kind === "signedIn" && !config ? <Text style={error ? styles.error : styles.body}>{error || copy("app.topup.title", language)}</Text> : null}
      {session.kind === "signedIn" && config?.region === "id" ? <View style={styles.card}>
        <Text style={styles.body}>{copy("app.topup.choose", language)}</Text>
        {config.inviteMismatch ? <Text style={styles.muted}>{copy("app.invite.mismatch", language).replace("{email}", config.inviteMismatch)}</Text> : null}
        <Text style={styles.muted}>{copy(config.qris ? "app.topup.qris.methods" : "app.topup.gopay.methods", language)}</Text>
        <View style={styles.presets}>{presets.map((preset) => <Pressable key={preset} onPress={() => setAmountText(String(preset))} style={[styles.preset, amount === preset && styles.selected]}><Text style={styles.presetText}>Rp {preset.toLocaleString("id-ID")}</Text></Pressable>)}</View>
        <Text style={styles.label}>{copy("app.topup.custom", language)}</Text>
        <TextInput accessibilityLabel={copy("app.topup.custom", language)} keyboardType="number-pad" value={amountText} onChangeText={setAmountText} style={styles.input} />
        <Text style={styles.muted}>{copy("app.credits.balance", language).replace("{count}", String(Math.floor((Number.isFinite(amount) ? amount : 0) / config.idrPerCredit)))}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {config.qris || config.gopay ? <Pressable accessibilityRole="button" disabled={!valid || busy} onPress={() => void createOrder(method)} style={[styles.button, (!valid || busy) && styles.disabled]}><Text style={styles.buttonText}>{copy(method === "qris" ? "app.topup.qris.pay" : "app.topup.create", language)}</Text></Pressable> : <Text style={styles.muted}>{copy("app.topup.unavailable", language)}</Text>}
      </View> : null}
      {session.kind === "signedIn" && config?.region === "intl" ? <View style={styles.card}>
        <Text style={styles.body}>{copy("app.topup.packBody", language).replace("{credits}", String(config.paddle.credits)).replace("{usd}", String(config.paddle.usd))}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {config.paddle.configured ? <Pressable accessibilityRole="button" onPress={buyPaddle} style={styles.button}><Text style={styles.buttonText}>{copy("app.topup.buy", language).replace("{credits}", String(config.paddle.credits))}</Text></Pressable> : <Text style={styles.muted}>{copy("app.topup.unavailable", language)}</Text>}
      </View> : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({ title: { color: "#180c0b", fontSize: 30, fontWeight: "800" }, card: { gap: 14, borderRadius: 16, backgroundColor: "#fff", padding: 20 }, body: { color: "#64514c", fontSize: 17 }, muted: { color: "#64514c", fontSize: 14 }, methods: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, preset: { borderRadius: 12, backgroundColor: "#f3f0ef", padding: 12 }, selected: { backgroundColor: "#f04c24" }, presetText: { color: "#180c0b", fontWeight: "700" }, label: { color: "#64514c", fontWeight: "700" }, input: { borderWidth: 1, borderColor: "#cfc5c2", borderRadius: 12, padding: 12, color: "#180c0b" }, button: { borderRadius: 999, backgroundColor: "#f04c24", padding: 15, alignItems: "center" }, buttonText: { color: "#170b08", fontWeight: "700" }, secondary: { backgroundColor: "#f3f0ef" }, secondaryText: { color: "#180c0b", fontWeight: "700" }, disabled: { opacity: 0.5 }, error: { color: "#a52117", fontWeight: "600" } });

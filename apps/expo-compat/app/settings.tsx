import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { QRCodeSVG } from "qrcode.react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { copy, setAppLanguage, useAppLanguage, type AppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession } from "../src/home-data";

type ScreenState = "loading" | "signedOut" | "error" | "ready";
type AccountResponse = { signedIn?: boolean; email?: string | null; mobileApiEnabled?: boolean; localPreview?: boolean };
type BalanceResponse = { ok?: boolean; configured?: boolean; credits?: number; soonestExpiry?: number | null; admin?: boolean };
type Plan = { status: "active" | "canceled"; included: number; used: number; used_pct: number; period_end: number };
type PlanResponse = { ok?: boolean; plan?: Plan | null };
type Device = { device_id: string; device_name: string; platform: string; app_version: string; paired_at: number; last_seen_at: number; revoked: boolean };
type DevicesResponse = { ok?: boolean; devices?: Device[] };
type TelegramResponse = { ok?: boolean; linked?: boolean; url?: string };
type WhatsAppLink = { phone: string; linkedAt: number };
type WhatsAppResponse = { ok?: boolean; enabled?: boolean; configured?: boolean; mock?: boolean; live?: boolean; linked?: WhatsAppLink | null };
type PairingSession = { code: string; expires_at: number; qr_payload: string };
type PairingResponse = { ok?: boolean; code?: string; expires_at?: number; qr_payload?: string };
type CheckoutResponse = { ok?: boolean; url?: string };

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) throw new Error("REQUEST_FAILED");
  return await response.json() as T;
}

function fill(key: string, language: AppLanguage, values: Record<string, string | number>): string {
  let text = copy(key, language);
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

function formatDate(value: number, language: AppLanguage, includeTime = false): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(language === "id" ? "id-ID" : "en-US", includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" });
  } catch {
    return "-";
  }
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function SettingsScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileApiEnabled, setMobileApiEnabled] = useState(false);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [devicesError, setDevicesError] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [telegramError, setTelegramError] = useState(false);
  const [whatsApp, setWhatsApp] = useState<WhatsAppResponse | null>(null);
  const [whatsAppOpenUrl, setWhatsAppOpenUrl] = useState<string | null>(null);
  const [whatsAppError, setWhatsAppError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [planError, setPlanError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState(false);
  const [pairSession, setPairSession] = useState<PairingSession | null>(null);
  const [pairSeconds, setPairSeconds] = useState(0);
  const [pairQrVisible, setPairQrVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setScreen("loading");
    setEmail(null);
    setMobileApiEnabled(false);
    setBalance(null);
    setBalanceError(false);
    setPlan(null);
    setPlanLoaded(false);
    setPlanError(false);
    setDevices(null);
    setDevicesError(false);
    setTelegramLinked(null);
    setTelegramError(false);
    setWhatsApp(null);
    setWhatsAppError(false);
    setActionError(false);

    void (async () => {
      const session = await loadSession((url, init) => fetch(url, init), controller.signal);
      if (controller.signal.aborted) return;
      if (session.kind === "signedOut" || session.kind === "localPreview") {
        setScreen("signedOut");
        return;
      }
      if (session.kind !== "signedIn") {
        setScreen("error");
        return;
      }

      try {
        const account = await requestJson<AccountResponse>("/api/auth/me", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!account.signedIn || account.localPreview) {
          setScreen("signedOut");
          return;
        }
        const hasMobileApi = Boolean(account.mobileApiEnabled);
        setEmail(account.email ?? null);
        setMobileApiEnabled(hasMobileApi);
        setScreen("ready");

        const results = await Promise.allSettled([
          requestJson<BalanceResponse>("/api/billing/balance", { signal: controller.signal }),
          requestJson<PlanResponse>("/api/billing/plan", { signal: controller.signal }),
          requestJson<TelegramResponse>("/api/telegram/link", { signal: controller.signal }),
          requestJson<WhatsAppResponse>("/api/wa/link", { signal: controller.signal }),
          hasMobileApi
            ? requestJson<DevicesResponse>("/api/auth/devices", { signal: controller.signal })
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;

        const [balanceResult, planResult, telegramResult, whatsAppResult, devicesResult] = results;
        if (balanceResult.status === "fulfilled" && balanceResult.value.ok) setBalance(balanceResult.value);
        else setBalanceError(true);
        if (planResult.status === "fulfilled" && planResult.value.ok) setPlan(planResult.value.plan ?? null);
        else setPlanError(true);
        setPlanLoaded(true);
        if (telegramResult.status === "fulfilled" && telegramResult.value.ok) setTelegramLinked(Boolean(telegramResult.value.linked));
        else setTelegramError(true);
        if (whatsAppResult.status === "fulfilled" && whatsAppResult.value.ok) setWhatsApp(whatsAppResult.value);
        else setWhatsAppError(true);
        if (hasMobileApi) {
          if (devicesResult.status === "fulfilled" && devicesResult.value?.ok) setDevices(devicesResult.value.devices ?? []);
          else setDevicesError(true);
        }
      } catch {
        if (!controller.signal.aborted) setScreen("error");
      }
    })();

    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!pairSession) return;
    const update = () => setPairSeconds(Math.max(0, Math.floor((pairSession.expires_at * 1000 - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [pairSession]);

  async function loadDevices() {
    try {
      const response = await requestJson<DevicesResponse>("/api/auth/devices");
      if (!response.ok) throw new Error("DEVICE_LOAD_FAILED");
      setDevices(response.devices ?? []);
      setDevicesError(false);
    } catch {
      setDevicesError(true);
    }
  }

  async function revokeDevice(deviceId?: string) {
    if (typeof window === "undefined" || !window.confirm(copy("web.devices.confirmRevoke", language))) return;
    setBusyAction("devices");
    setDevicesError(false);
    try {
      const response = await requestJson<{ ok?: boolean }>("/api/auth/device/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceId ? { device_id: deviceId } : { revoke_all: true }),
      });
      if (!response.ok) throw new Error("DEVICE_REVOKE_FAILED");
      await loadDevices();
    } catch {
      setDevicesError(true);
    } finally {
      setBusyAction(null);
    }
  }

  async function generatePairing() {
    setPairLoading(true);
    setPairError(false);
    setPairSession(null);
    setPairQrVisible(false);
    try {
      const response = await requestJson<PairingResponse>("/api/auth/pair/generate", { method: "POST" });
      if (!response.ok || !response.code || !response.expires_at || !response.qr_payload) throw new Error("PAIRING_FAILED");
      setPairSession({ code: response.code, expires_at: response.expires_at, qr_payload: response.qr_payload });
    } catch {
      setPairSession(null);
      setPairError(true);
    } finally {
      setPairLoading(false);
    }
  }

  async function signOut() {
    setBusyAction("signout");
    setActionError(false);
    try {
      const response = await requestJson<{ ok?: boolean }>("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("SIGNOUT_FAILED");
      router.replace("/");
    } catch {
      setActionError(true);
      setBusyAction(null);
    }
  }

  async function subscribe() {
    setBusyAction("plan");
    setPlanError(false);
    try {
      const response = await requestJson<CheckoutResponse>("/api/billing/subscribe", { method: "POST" });
      if (!response.ok || !response.url) throw new Error("CHECKOUT_UNAVAILABLE");
      await Linking.openURL(response.url);
    } catch {
      setPlanError(true);
    } finally {
      setBusyAction(null);
    }
  }

  async function startTelegramLink() {
    setBusyAction("telegram");
    setTelegramError(false);
    try {
      const response = await requestJson<TelegramResponse>("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!response.ok || !response.url) throw new Error("TELEGRAM_LINK_FAILED");
      await Linking.openURL(response.url);
    } catch {
      setTelegramError(true);
    } finally {
      setBusyAction(null);
    }
  }

  async function unlinkTelegram() {
    if (typeof window === "undefined" || !window.confirm(copy("web.telegram.unlink", language))) return;
    setBusyAction("telegram");
    setTelegramError(false);
    try {
      const response = await requestJson<TelegramResponse>("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      if (!response.ok) throw new Error("TELEGRAM_UNLINK_FAILED");
      setTelegramLinked(false);
    } catch {
      setTelegramError(true);
    } finally {
      setBusyAction(null);
    }
  }

  async function startWhatsAppLink() {
    setBusyAction("whatsapp");
    setWhatsAppError(false);
    try {
      const response = await requestJson<{ ok?: boolean; mock?: boolean; openUrl?: string }>("/api/wa/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!response.ok || response.mock || !response.openUrl) throw new Error("WHATSAPP_LINK_FAILED");
      setWhatsAppOpenUrl(response.openUrl);
      const openUrl = new URL(response.openUrl, window.location.origin).toString();
      await Linking.openURL(openUrl);
    } catch {
      setWhatsAppError(true);
    } finally {
      setBusyAction(null);
    }
  }

  async function unlinkWhatsApp() {
    if (typeof window === "undefined" || !window.confirm(copy("app.wa.link.unlink", language))) return;
    setBusyAction("whatsapp");
    setWhatsAppError(false);
    try {
      const response = await requestJson<{ ok?: boolean }>("/api/wa/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      if (!response.ok) throw new Error("WHATSAPP_UNLINK_FAILED");
      setWhatsApp((current) => current ? { ...current, linked: null } : current);
      setWhatsAppOpenUrl(null);
    } catch {
      setWhatsAppError(true);
    } finally {
      setBusyAction(null);
    }
  }

  const pairExpired = pairSession !== null && pairSeconds === 0;

  return (
    <PreviewShell language={language}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.settings.title", language)}</Text>
      {screen === "loading" ? <Text accessibilityRole="status" style={styles.note}>{copy("app.home.loading", language)}</Text> : null}
      {screen === "signedOut" ? <SignInCard language={language} /> : null}
      {screen === "error" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.home.error", language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
            <Text style={styles.link}>{copy("app.home.retry", language)}</Text>
          </Pressable>
        </View>
      ) : null}

      {screen === "ready" ? (
        <>
          {email ? <View style={styles.card}><Text style={styles.body}>{email}</Text></View> : null}

          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>
              {balance?.configured ? fill("app.credits.balance", language, { count: balance.credits ?? 0 }) : balanceError ? copy("app.home.error", language) : copy("app.settings.soon", language)}
            </Text>
            {balance?.configured && balance.soonestExpiry != null ? (
              <Text style={styles.note}>{fill("app.credits.expires", language, { date: formatDate(balance.soonestExpiry, language) })}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{copy("app.settings.language.title", language)}</Text>
            <View style={styles.row}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: language === "en" }} disabled={language === "en"} style={[styles.secondary, language === "en" && styles.selected]} onPress={() => setAppLanguage("en")}>
                <Text style={styles.buttonText}>{copy("app.settings.language.english", language)}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: language === "id" }} disabled={language === "id"} style={[styles.secondary, language === "id" && styles.selected]} onPress={() => setAppLanguage("id")}>
                <Text style={styles.buttonText}>{copy("app.settings.language.indonesia", language)}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Link href="/space" asChild>
              <Pressable accessibilityRole="link" style={styles.secondary}>
                <Text style={styles.buttonText}>{copy("app.space.settings", language)}</Text>
              </Pressable>
            </Link>
          </View>

          {mobileApiEnabled ? (
            <>
              <View style={styles.card}>
                <Pressable accessibilityRole="button" disabled={pairLoading} style={styles.secondary} onPress={() => { setPairOpen((open) => !open); setPairSession(null); setPairError(false); }}>
                  <Text style={styles.buttonText}>{copy("web.pairing.button", language)}</Text>
                </Pressable>
                {pairOpen ? (
                  <View style={styles.pairPanel}>
                    <View style={styles.row}>
                      <Text style={styles.sectionTitle}>{copy("web.pairing.title", language)}</Text>
                      <Pressable accessibilityRole="button" onPress={() => { setPairOpen(false); setPairSession(null); }}>
                        <Text style={styles.link}>{copy("web.pairing.close", language)}</Text>
                      </Pressable>
                    </View>
                    {pairLoading ? <Text accessibilityRole="status" style={styles.note}>{copy("web.pairing.generating", language)}</Text> : null}
                    {pairSession && !pairLoading ? (
                      <>
                        <Text style={styles.pairCode}>{pairSession.code}</Text>
                        <Text style={[styles.note, pairExpired && styles.error]}>
                          {pairExpired ? copy("web.pairing.expired", language) : `${copy("web.pairing.expires", language)} ${formatCountdown(pairSeconds)}`}
                        </Text>
                        {!pairExpired ? (
                          <>
                            <Text style={styles.note}>{copy("web.pairing.instruction", language)}</Text>
                            <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setPairQrVisible((visible) => !visible)}>
                              <Text style={styles.buttonText}>{copy(pairQrVisible ? "web.pairing.qrHide" : "web.pairing.qrShow", language)}</Text>
                            </Pressable>
                            {pairQrVisible ? <View style={styles.qr}><QRCodeSVG value={pairSession.qr_payload} size={180} level="M" includeMargin /></View> : null}
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {pairError && !pairLoading ? <Text accessibilityRole="alert" style={styles.error}>{copy("web.pairing.error", language)}</Text> : null}
                    <Pressable accessibilityRole="button" disabled={pairLoading} style={styles.primary} onPress={() => void generatePairing()}>
                      <Text style={styles.buttonText}>{copy("web.pairing.generate", language)}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.sectionTitle}>{copy("web.devices.title", language)}</Text>
                  {devices?.some((device) => !device.revoked) ? (
                    <Pressable accessibilityRole="button" disabled={busyAction === "devices"} onPress={() => void revokeDevice()}>
                      <Text style={styles.dangerText}>{copy("web.devices.revoke_all", language)}</Text>
                    </Pressable>
                  ) : null}
                </View>
                {devices === null && !devicesError ? <Text style={styles.note}>{copy("web.devices.loading", language)}</Text> : null}
                {devicesError ? <Text accessibilityRole="alert" style={styles.error}>{copy("web.devices.error", language)}</Text> : null}
                {devices && devices.length === 0 ? <Text style={styles.note}>{copy("web.devices.empty", language)}</Text> : null}
                {devices?.map((device) => (
                  <View key={device.device_id} style={styles.deviceRow}>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.device_name}</Text>
                      <Text style={styles.note}>{device.platform} · {device.app_version}</Text>
                      <Text style={styles.note}>{copy("web.devices.paired_at", language)}: {formatDate(device.paired_at, language, true)}</Text>
                      <Text style={styles.note}>{copy("web.devices.last_seen", language)}: {formatDate(device.last_seen_at, language, true)}</Text>
                    </View>
                    {device.revoked ? <Text style={styles.note}>{copy("web.devices.revoked", language)}</Text> : (
                      <Pressable accessibilityRole="button" disabled={busyAction === "devices"} onPress={() => void revokeDevice(device.device_id)}>
                        <Text style={styles.dangerText}>{copy("web.devices.revoke", language)}</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.sectionTitle}>{copy("app.plan.title", language)}</Text>
              {planError ? <Text accessibilityRole="alert" style={styles.error}>{copy("app.plan.error", language)}</Text> : <Text style={styles.note}>{planLoaded ? copy(plan ? (plan.status === "active" ? "app.plan.active" : "app.plan.canceled") : "app.plan.free", language) : copy("app.home.loading", language)}</Text>}
            </View>
            {plan ? (
              <>
                <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: plan.used_pct }} style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, plan.used_pct))}%` }]} />
                </View>
                <Text style={styles.note}>{fill("app.plan.used", language, { used: plan.used, included: plan.included })} · {fill("app.plan.percent", language, { percent: plan.used_pct })}</Text>
                <Text style={styles.note}>{fill("app.plan.periodEnd", language, { date: formatDate(plan.period_end, language) })}</Text>
              </>
            ) : planLoaded && !planError ? <Text style={styles.note}>{copy("app.plan.body", language)}</Text> : null}
            <Pressable accessibilityRole="button" disabled={busyAction === "plan" || !planLoaded || planError} style={styles.primary} onPress={() => void subscribe()}>
              <Text style={styles.buttonText}>{copy(busyAction === "plan" ? "app.plan.busy" : plan ? "app.plan.renew" : "app.plan.subscribe", language)}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.sectionTitle}>{copy("web.telegram.title", language)}</Text>
              {telegramLinked ? (
                <Pressable accessibilityRole="button" disabled={busyAction === "telegram"} onPress={() => void unlinkTelegram()}>
                  <Text style={styles.dangerText}>{copy("web.telegram.unlink", language)}</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" disabled={busyAction === "telegram" || telegramLinked === null} onPress={() => void startTelegramLink()}>
                  <Text style={styles.link}>{copy("web.telegram.link", language)}</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.note}>{copy(telegramLinked ? "web.telegram.linked" : "web.telegram.notLinked", language)}</Text>
            {telegramError ? <Text accessibilityRole="alert" style={styles.error}>{copy("web.telegram.error", language)}</Text> : null}
          </View>

          {whatsApp?.enabled && !whatsApp.mock ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{copy("app.wa.link.title", language)}</Text>
              <Text style={styles.note}>{copy("app.wa.link.body", language)}</Text>
              {!whatsApp.configured || !whatsApp.live ? <Text style={styles.note}>{copy("app.wa.disabled", language)}</Text> : whatsApp.linked ? (
                <>
                  <Text style={styles.body}>{fill("app.wa.link.linked", language, { phone: whatsApp.linked.phone })}</Text>
                  <Pressable accessibilityRole="button" disabled={busyAction === "whatsapp"} style={styles.secondary} onPress={() => void unlinkWhatsApp()}>
                    <Text style={styles.buttonText}>{copy("app.wa.link.unlink", language)}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable accessibilityRole="button" disabled={busyAction === "whatsapp"} style={styles.primary} onPress={() => void startWhatsAppLink()}>
                    <Text style={styles.buttonText}>{copy("app.wa.link.button", language)}</Text>
                  </Pressable>
                  {whatsAppOpenUrl ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(whatsAppOpenUrl)}><Text style={styles.link}>{copy("app.wa.link.open", language)}</Text></Pressable> : null}
                </>
              )}
              {whatsAppError ? <Text accessibilityRole="alert" style={styles.error}>{copy("app.wa.link.error", language)}</Text> : null}
            </View>
          ) : null}

          {actionError ? <Text accessibilityRole="alert" style={styles.error}>{copy("app.home.error", language)}</Text> : null}

          <Link href="/topup" asChild>
            <Pressable accessibilityRole="link" style={styles.secondary}><Text style={styles.buttonText}>{copy("app.topup.title", language)}</Text></Pressable>
          </Link>
          <Link href="/sheet" asChild>
            <Pressable accessibilityRole="link" style={styles.secondary}><Text style={styles.buttonText}>{copy("app.sheets.connected", language)}</Text></Pressable>
          </Link>
          <Pressable accessibilityRole="button" disabled={busyAction === "signout"} style={styles.signOut} onPress={() => void signOut()}>
            <Text style={styles.buttonText}>{copy("app.auth.signout", language)}</Text>
          </Pressable>
        </>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#180c0b", fontSize: 30, fontWeight: "800" },
  card: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 18 },
  balanceCard: { gap: 6, borderRadius: 16, backgroundColor: "#f3efee", padding: 18 },
  balanceTitle: { color: "#180c0b", fontSize: 24, fontWeight: "800" },
  sectionTitle: { color: "#180c0b", fontSize: 16, fontWeight: "700" },
  body: { color: "#64514c", fontSize: 15, lineHeight: 22 },
  note: { color: "#64514c", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  secondary: { alignItems: "center", borderRadius: 999, backgroundColor: "#f3efee", paddingHorizontal: 16, paddingVertical: 12 },
  primary: { alignItems: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 16, paddingVertical: 12 },
  signOut: { alignItems: "center", borderRadius: 999, backgroundColor: "#241a18", paddingHorizontal: 16, paddingVertical: 14 },
  selected: { backgroundColor: "#e9dedb" },
  buttonText: { color: "#241a18", fontSize: 14, fontWeight: "700" },
  link: { color: "#f04c24", fontSize: 14, fontWeight: "700" },
  dangerText: { color: "#b42318", fontSize: 13, fontWeight: "700" },
  error: { color: "#b42318", fontSize: 13 },
  pairPanel: { gap: 12, borderRadius: 12, backgroundColor: "#f7f4f3", padding: 14 },
  pairCode: { alignSelf: "center", borderWidth: 2, borderColor: "#f04c24", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, color: "#180c0b", fontSize: 24, fontWeight: "800", letterSpacing: 4 },
  qr: { alignSelf: "center", borderRadius: 12, backgroundColor: "#ffffff", padding: 16 },
  deviceRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderColor: "#e3dcda", paddingVertical: 12 },
  deviceInfo: { flex: 1, gap: 4 },
  deviceName: { color: "#180c0b", fontSize: 14, fontWeight: "700" },
  progressTrack: { height: 8, overflow: "hidden", borderRadius: 999, backgroundColor: "#e9e4e2" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#f04c24" },
});

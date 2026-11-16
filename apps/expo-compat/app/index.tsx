import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { formatCurrencyTotal } from "../../../src/lib/cashflow/format";
import { copy, useAppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadHomeData, type HomeDataState } from "../src/home-data";

type ViewState = HomeDataState | { kind: "loading" };

function Totals({ values, locale, language }: {
  values: { currency: string; minor: string }[];
  locale: string;
  language: "en" | "id";
}) {
  if (values.length === 0) {
    return <Text style={styles.muted}>{copy("app.home.noTotals", language)}</Text>;
  }
  return (
    <View style={styles.totalList}>
      {values.map((value) => (
        <Text key={value.currency} style={styles.total}>{formatCurrencyTotal(value, locale)}</Text>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const language = useAppLanguage();
  const locale = language === "id" ? "id-ID" : "en-AU";
  const [state, setState] = useState<ViewState>(
    Platform.OS === "web" ? { kind: "loading" } : { kind: "localPreview", userId: "local-preview-user" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setState({ kind: "localPreview", userId: "local-preview-user" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    let timeZone = "";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timeZone = "";
    }
    void loadHomeData((url, init) => fetch(url, init), timeZone, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setState(next);
      });
    return () => controller.abort();
  }, [attempt]);

  const localPreview = state.kind === "localPreview";
  return (
    <PreviewShell language={language} localPreview={localPreview}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.home.title", language)}</Text>
      {state.kind === "loading" ? (
        <Text accessibilityRole="text" style={styles.muted}>{copy("app.home.loading", language)}</Text>
      ) : null}
      {state.kind === "localPreview" ? (
        <>
          <View style={styles.card}>
            <Text style={styles.body}>{copy("app.home.localPreviewEmpty", language)}</Text>
            <Link href="/inbox" asChild>
              <Pressable accessibilityRole="link" style={styles.openLink}>
                <Text style={styles.openText}>{copy("app.inbox.open", language)}</Text>
              </Pressable>
            </Link>
          </View>
        </>
      ) : null}
      {state.kind === "signedOut" ? <SignInCard language={language} /> : null}
      {state.kind === "noWorkspace" ? (
        <View style={styles.card}>
          <Text style={styles.body}>{copy("app.home.noWorkspace", language)}</Text>
          <Pressable
            accessibilityRole="link"
            style={styles.openLink}
            onPress={() => {
              if (Platform.OS === "web") window.location.assign("/app/settings/sheet");
            }}
          >
            <Text style={styles.openText}>{copy("app.home.sheetSettings", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "unsupported" ? (
        <View style={styles.card}>
          <Text style={styles.body}>{copy("app.home.unsupported", language)}</Text>
          <Pressable
            accessibilityRole="link"
            style={styles.openLink}
            onPress={() => {
              if (Platform.OS === "web") window.location.assign("/app/settings/sheet");
            }}
          >
            <Text style={styles.openText}>{copy("app.home.sheetSettings", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "error" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.home.error", language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
            <Text style={styles.openText}>{copy("app.home.retry", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "ready" ? (
        <>
          <Text style={styles.muted}>{copy("app.home.legacyNotice", language)}</Text>
          {state.summary.partial ? (
            <Text accessibilityRole="alert" style={styles.partial}>{copy("app.home.partial", language)}</Text>
          ) : null}
          <Text style={styles.workspace}>{state.workspaceTitle}</Text>
          <View style={styles.summary}>
            <View style={styles.section}>
              <Text style={styles.label}>{copy("app.home.today", language)}</Text>
              <Totals values={state.summary.todayTotals} locale={locale} language={language} />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>{copy("app.home.week", language)}</Text>
              <Text style={styles.muted}>{copy("app.home.weekNote", language)}</Text>
              <Totals values={state.summary.weekTotals} locale={locale} language={language} />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>{copy("app.home.balance", language)}</Text>
              <Text style={styles.muted}>{copy("app.home.balanceUnavailable", language)}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.latestTitle}>{copy("app.home.latest", language)}</Text>
            {state.summary.latest.length === 0 ? (
              <Text style={styles.muted}>{copy("app.home.empty", language)}</Text>
            ) : state.summary.latest.map((receipt) => (
              <View key={receipt.receiptId} style={styles.receipt}>
                <View>
                  <Text style={styles.receiptName}>{copy("app.home.receipt", language)}</Text>
                  <Text style={styles.muted}>{receipt.occurredOn}</Text>
                </View>
                <Text style={styles.total}>{formatCurrencyTotal(receipt.amount, locale)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#180c0b", fontSize: 30, fontWeight: "800" },
  card: { gap: 16, borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  body: { color: "#64514c", fontSize: 18, lineHeight: 26 },
  muted: { color: "#64514c", fontSize: 14 },
  openLink: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 18, paddingVertical: 11 },
  openText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
  note: { color: "#64514c", fontSize: 14, textAlign: "center", padding: 14 },
  partial: { borderRadius: 12, backgroundColor: "#fff0d6", color: "#5b3b00", padding: 12 },
  workspace: { color: "#64514c", fontSize: 13 },
  summary: { gap: 16, borderRadius: 16, backgroundColor: "#ffffff", padding: 18 },
  section: { gap: 6 },
  label: { color: "#64514c", fontSize: 12, fontWeight: "700" },
  totalList: { gap: 4 },
  total: { color: "#180c0b", fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  latestTitle: { color: "#180c0b", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  receipt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderRadius: 12, backgroundColor: "#ffffff", padding: 14, marginBottom: 8 },
  receiptName: { color: "#180c0b", fontSize: 14, fontWeight: "700" },
});

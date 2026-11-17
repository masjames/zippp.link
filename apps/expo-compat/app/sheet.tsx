import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { DEFAULT_SHEET_DISPLAY_NAME, TEMPLATE_HEADERS } from "../../../src/lib/google/templates";
import type { TemplateId } from "../../../src/lib/google/workspace-store";
import { copy, useAppLanguage } from "../src/copy";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession } from "../src/home-data";

type SheetCandidate = { id: string; name: string; modifiedTime: string };
type ConnectedWorkspace = {
  spreadsheet_id: string;
  spreadsheet_title: string;
  sheet_tab: string;
  template_id: TemplateId;
};
type SetupState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "error" }
  | { kind: "choose" }
  | { kind: "picking"; candidates: SheetCandidate[] }
  | { kind: "wizard" }
  | { kind: "naming" }
  | { kind: "creating" }
  | { kind: "connected" };
type ConnectResponse = {
  ok?: boolean;
  workspace?: ConnectedWorkspace | null;
  created?: boolean;
  none?: boolean;
  needsPick?: boolean;
  candidates?: SheetCandidate[];
  duplicateName?: boolean;
};
type TemplateOption = { id: TemplateId; title: string; body: string };

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: "personal-expense", title: "app.sheets.tpl.expense", body: "app.sheets.tpl.expenseBody" },
  { id: "resto-inventory", title: "app.sheets.tpl.resto", body: "app.sheets.tpl.restoBody" },
  { id: "sales-recap", title: "app.sheets.tpl.sales", body: "app.sheets.tpl.salesBody" },
  { id: "reimbursement", title: "app.sheets.tpl.reimburse", body: "app.sheets.tpl.reimburseBody" },
  { id: "custom", title: "app.sheets.tpl.custom", body: "app.sheets.tpl.customBody" },
];

export default function SheetSetupScreen() {
  const language = useAppLanguage();
  const locale = language === "id" ? "id-ID" : "en-AU";
  const [state, setState] = useState<SetupState>({ kind: "loading" });
  const [workspace, setWorkspace] = useState<ConnectedWorkspace | null>(null);
  const [candidates, setCandidates] = useState<SheetCandidate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("personal-expense");
  const [sheetName, setSheetName] = useState(DEFAULT_SHEET_DISPLAY_NAME);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setState({ kind: "signedOut" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    setErrorKey(null);
    void (async () => {
      const session = await loadSession((url, init) => fetch(url, init), controller.signal);
      if (controller.signal.aborted) return;
      if (session.kind !== "signedIn") {
        setState({ kind: "signedOut" });
        return;
      }
      try {
        const response = await fetch("/api/sheets/workspace", { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.ok) {
          const payload = await response.json() as { ok: boolean; workspace: ConnectedWorkspace | null };
          if (!payload.ok || !payload.workspace) throw new Error("Workspace response unavailable");
          setWorkspace(payload.workspace);
          setState({ kind: "connected" });
          return;
        }
        if (response.status !== 404) throw new Error("Workspace request failed");
        await connect({ mode: "find" });
      } catch {
        if (!controller.signal.aborted) setState({ kind: "error" });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  async function connect(body: { mode?: "find" | "list" | "create"; spreadsheetId?: string; templateId?: TemplateId; sheetName?: string }) {
    setBusy(true);
    setErrorKey(null);
    if (body.mode === "create") setState({ kind: "creating" });
    try {
      const response = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        setState({ kind: "signedOut" });
        return;
      }
      const data = await response.json() as ConnectResponse;
      if (data.ok && data.workspace) {
        setWorkspace(data.workspace);
        setCreated(Boolean(data.created));
        setCandidates([]);
        setState({ kind: "connected" });
        return;
      }
      if (body.mode === "create" && (response.status === 409 || data.duplicateName)) {
        setErrorKey("app.sheets.name.duplicate");
        setState({ kind: "naming" });
        return;
      }
      if (data.needsPick && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setState({ kind: "picking", candidates: data.candidates });
        return;
      }
      if (data.none) {
        setCandidates([]);
        setState({ kind: "choose" });
        return;
      }
      setState({ kind: "error" });
    } catch {
      setState({ kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  function startWizard() {
    setErrorKey(null);
    setSelectedTemplate(workspace?.template_id ?? "personal-expense");
    setState({ kind: "wizard" });
  }

  function cancelChoice() {
    setErrorKey(null);
    setCandidates([]);
    setState(workspace ? { kind: "connected" } : { kind: "choose" });
  }

  function templateCopy(key: string) {
    return copy(key, language);
  }

  const selectedTemplateOption = TEMPLATE_OPTIONS.find((option) => option.id === selectedTemplate) ?? TEMPLATE_OPTIONS[0];
  const selectedHeaders = TEMPLATE_HEADERS[selectedTemplate].slice(0, 6);

  return (
    <PreviewShell language={language}>
      <Text accessibilityRole="header" style={styles.wordmark}>{copy("app.sheets.title", language)}</Text>
      {state.kind === "loading" ? (
        <Text accessibilityRole="status" style={styles.note}>{copy("app.sheets.checking", language)}</Text>
      ) : null}
      {state.kind === "signedOut" ? <SignInCard language={language} /> : null}
      {state.kind === "error" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.sheets.error", language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
            <Text style={styles.link}>{copy("app.sheets.retry", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "choose" ? (
        <View style={styles.card}>
          <Text style={styles.title}>{copy("app.sheets.chooseTitle", language)}</Text>
          <Text style={styles.body}>{copy("app.sheets.chooseBody", language)}</Text>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.primary} onPress={startWizard}>
            <Text style={styles.buttonText}>{copy("app.sheets.create", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => void connect({ mode: "list" })}>
            <Text style={styles.secondaryText}>{copy("app.sheets.useExisting", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "wizard" ? (
        <View style={styles.card}>
          <Text style={styles.title}>{copy("app.sheets.wizard.title", language)}</Text>
          <Text style={styles.body}>{copy("app.sheets.wizard.body", language)}</Text>
          {workspace ? <Text style={styles.note}>{copy("app.sheets.wizard.warn", language)}</Text> : null}
          <View style={styles.templates}>
            {TEMPLATE_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedTemplate === option.id }}
                disabled={busy}
                onPress={() => setSelectedTemplate(option.id)}
                style={[styles.template, selectedTemplate === option.id && styles.templateSelected]}
              >
                <Text style={styles.templateTitle}>{templateCopy(option.title)}</Text>
                <Text style={styles.note}>{templateCopy(option.body)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{copy("app.sheets.template", language)} · {templateCopy(selectedTemplateOption.title)}</Text>
          <View style={styles.headers}>
            {selectedHeaders.map((header, index) => <Text key={`${header}-${index}`} style={styles.headerCell}>{header}</Text>)}
          </View>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => { setSheetName(DEFAULT_SHEET_DISPLAY_NAME); setErrorKey(null); setState({ kind: "naming" }); }}>
            <Text style={styles.buttonText}>{copy("app.sheets.wizard.continue", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={cancelChoice}>
            <Text style={styles.secondaryText}>{copy("app.sheets.cancel", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "naming" ? (
        <View style={styles.card}>
          <Text style={styles.title}>{copy("app.sheets.name.title", language)}</Text>
          <Text style={styles.body}>{copy("app.sheets.name.body", language)}</Text>
          <Text style={styles.note}>{copy("app.sheets.template", language)} · {templateCopy(selectedTemplateOption.title)}</Text>
          <Text style={styles.label}>{copy("app.sheets.name.label", language)}</Text>
          <TextInput value={sheetName} onChangeText={setSheetName} maxLength={80} autoComplete="off" style={styles.input} />
          {errorKey ? <Text accessibilityRole="alert" style={styles.error}>{copy(errorKey, language)}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy || !sheetName.trim()}
            style={[styles.primary, (busy || !sheetName.trim()) && styles.disabled]}
            onPress={() => {
              if (!sheetName.trim()) {
                setErrorKey("app.sheets.name.required");
                return;
              }
              void connect({ mode: "create", templateId: selectedTemplate, sheetName: sheetName.trim() });
            }}
          >
            <Text style={styles.buttonText}>{copy("app.sheets.name.create", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={startWizard}>
            <Text style={styles.secondaryText}>{copy("app.sheets.name.back", language)}</Text>
          </Pressable>
        </View>
      ) : null}
      {state.kind === "picking" ? (
        <View style={styles.card}>
          <Text style={styles.title}>{candidates.length ? copy("app.sheets.title", language) : copy("app.sheets.emptyTitle", language)}</Text>
          <Text style={styles.body}>{candidates.length ? copy("app.sheets.body", language) : copy("app.sheets.emptyBody", language)}</Text>
          {candidates.map((candidate) => (
            <Pressable key={candidate.id} accessibilityRole="button" disabled={busy} style={styles.candidate} onPress={() => void connect({ spreadsheetId: candidate.id })}>
              <Text style={styles.templateTitle}>{candidate.name}</Text>
              {candidate.modifiedTime ? <Text style={styles.note}>{new Date(candidate.modifiedTime).toLocaleDateString(locale)}</Text> : null}
            </Pressable>
          ))}
          {!candidates.length ? <Pressable accessibilityRole="button" disabled={busy} style={styles.primary} onPress={startWizard}><Text style={styles.buttonText}>{copy("app.sheets.create", language)}</Text></Pressable> : null}
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={cancelChoice}><Text style={styles.secondaryText}>{copy("app.sheets.cancel", language)}</Text></Pressable>
        </View>
      ) : null}
      {state.kind === "connected" && workspace ? (
        <View style={styles.card}>
          {created ? <Text style={styles.created}>{copy("app.sheets.created", language)}</Text> : null}
          <Text style={styles.title}>{copy("app.sheets.connected", language)}</Text>
          <Text style={styles.body}>{workspace.spreadsheet_title} · {workspace.sheet_tab}</Text>
          <Text style={styles.note}>{copy("app.sheets.template", language)} · {templateCopy(TEMPLATE_OPTIONS.find((option) => option.id === workspace.template_id)?.title ?? "app.sheets.tpl.expense")}</Text>
          <Pressable accessibilityRole="link" style={styles.primary} onPress={() => void Linking.openURL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(workspace.spreadsheet_id)}/edit`)}>
            <Text style={styles.buttonText}>{copy("app.sheets.open", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={startWizard}>
            <Text style={styles.secondaryText}>{copy("app.sheets.create", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => void connect({ mode: "list" })}>
            <Text style={styles.secondaryText}>{copy("app.sheets.choose", language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => void connect({ spreadsheetId: workspace.spreadsheet_id })}>
            <Text style={styles.secondaryText}>{copy("app.sheets.reconnect", language)}</Text>
          </Pressable>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" style={styles.primary}>
              <Text style={styles.buttonText}>{copy("app.sheets.continue", language)}</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
      {busy ? <Text accessibilityRole="status" style={styles.note}>{state.kind === "creating" ? copy("app.sheets.creating", language).replace("{template}", templateCopy(selectedTemplateOption.title)) : copy("app.sheets.checking", language)}</Text> : null}
      {errorKey && state.kind !== "naming" ? <Text accessibilityRole="alert" style={styles.error}>{copy(errorKey, language)}</Text> : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  wordmark: { color: "#f04c24", fontSize: 30, fontWeight: "800" },
  card: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 18 },
  title: { color: "#180c0b", fontSize: 26, fontWeight: "800" },
  body: { color: "#64514c", fontSize: 16, lineHeight: 24 },
  note: { color: "#64514c", fontSize: 13 },
  link: { color: "#241a18", fontSize: 15, fontWeight: "700" },
  label: { color: "#64514c", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#d6cbc8", borderRadius: 12, paddingHorizontal: 12, color: "#180c0b", backgroundColor: "#ffffff" },
  templates: { gap: 8 },
  template: { gap: 4, borderWidth: 1, borderColor: "#d6cbc8", borderRadius: 12, padding: 12 },
  templateSelected: { borderColor: "#f04c24", backgroundColor: "#fff0e8" },
  templateTitle: { color: "#180c0b", fontSize: 15, fontWeight: "700" },
  headers: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  headerCell: { borderRadius: 8, backgroundColor: "#f3efee", paddingHorizontal: 8, paddingVertical: 5, color: "#64514c", fontSize: 11 },
  candidate: { gap: 4, borderWidth: 1, borderColor: "#d6cbc8", borderRadius: 12, padding: 12 },
  primary: { alignItems: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 18, paddingVertical: 12 },
  secondary: { alignItems: "center", borderRadius: 999, backgroundColor: "#ffffff", paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
  secondaryText: { color: "#241a18", fontSize: 15, fontWeight: "700" },
  error: { color: "#b42318", fontSize: 14 },
  created: { borderRadius: 12, backgroundColor: "#e8f5e9", padding: 10, color: "#225a30", fontWeight: "700" },
  disabled: { opacity: 0.5 },
});

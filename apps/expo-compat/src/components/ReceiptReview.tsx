import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Draft } from "../../../../src/components/app/draft";
import { PAYMENT_OPTIONS } from "../../../../src/lib/google/templates";
import type { TemplateId } from "../../../../src/lib/google/workspace-store";
import { hasHardFlags, opsFor, unresolvedHardFlags } from "../../../../src/lib/review-ops";
import type { Receipt } from "../../../../src/types/receipt";
import { copy, type AppLanguage } from "../copy";
import { checkReceiptForSend, type ReviewWorkspace } from "../receipt-flow";

type Props = {
  receipt: Receipt;
  draft: Draft;
  workspace: ReviewWorkspace;
  language: AppLanguage;
  checked: boolean;
  showErrors: boolean;
  sending: boolean;
  message: string | null;
  onDraftChange: (draft: Draft) => void;
  onCheck: () => void;
  onSend: () => void;
  onDelete: () => void;
};

export function ReceiptReview({
  receipt,
  draft,
  workspace,
  language,
  checked,
  showErrors,
  sending,
  message,
  onDraftChange,
  onCheck,
  onSend,
  onDelete,
}: Props) {
  const ops = opsFor(workspace.template_id);
  const paymentOptions = PAYMENT_OPTIONS[workspace.template_id as TemplateId] ?? [];
  const hardFlags = hasHardFlags(receipt);
  const unresolved = unresolvedHardFlags(receipt, draft);
  const flaggedPaths = new Set(unresolved.map((flag) => flag.path));
  const validation = checkReceiptForSend(receipt, draft, workspace);
  const outletValue = draft.outlet || workspace.default_outlet || "";

  function patch(next: Partial<Draft>) {
    onDraftChange({ ...draft, ...next });
  }

  function patchLine(index: number, next: Partial<Draft["lines"][number]>) {
    onDraftChange({
      ...draft,
      lines: draft.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...next } : line,
      ),
    });
  }

  const inputStyle = (path: string) => [styles.input, flaggedPaths.has(path) && styles.flagged];
  const controlStyle = (selected: boolean) => [styles.choice, selected && styles.choiceSelected];

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.review.edit", language)}</Text>
      <Text style={styles.note}>{copy("app.review.tapToEdit", language)}</Text>
      {hardFlags ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(draft.acknowledged) }}
          onPress={() => patch({ acknowledged: !draft.acknowledged })}
          style={styles.warning}
        >
          <Text style={styles.warningText}>{copy("app.review.hardFlagWarning", language)}</Text>
          <Text style={[styles.acknowledge, draft.acknowledged && styles.acknowledgeChecked]}>{copy("app.review.acknowledge", language)}</Text>
        </Pressable>
      ) : null}

      <View style={styles.twoColumns}>
        <Field label={copy("app.check.category", language)}>
          <TextInput accessibilityLabel={copy("app.check.category", language)} value={draft.category} onChangeText={(value) => patch({ category: value })} style={styles.input} />
        </Field>
        <Field label={copy("app.check.date", language)}>
          <TextInput accessibilityLabel={copy("app.check.date", language)} value={draft.date} onChangeText={(value) => patch({ date: value })} style={inputStyle("date")} />
        </Field>
        <Field label={copy("app.check.subtotal", language)}>
          <TextInput accessibilityLabel={copy("app.check.subtotal", language)} keyboardType="decimal-pad" value={draft.subtotal} onChangeText={(value) => patch({ subtotal: value })} style={inputStyle("subtotal")} />
        </Field>
        <Field label={copy("app.check.tax", language)}>
          <TextInput accessibilityLabel={copy("app.check.tax", language)} keyboardType="decimal-pad" value={draft.tax} onChangeText={(value) => patch({ tax: value })} style={inputStyle("tax")} />
        </Field>
      </View>
      <Field label={copy("app.check.merchantFallback", language)}>
        <TextInput accessibilityLabel={copy("app.check.merchantFallback", language)} value={draft.merchant} onChangeText={(value) => patch({ merchant: value })} style={inputStyle("merchant")} />
      </Field>
      <Field label={copy("app.check.total", language)}>
        <TextInput accessibilityLabel={copy("app.check.total", language)} keyboardType="decimal-pad" value={draft.total} onChangeText={(value) => patch({ total: value })} style={inputStyle("total")} />
      </Field>

      {ops.staff && workspace.staff_names.length > 0 ? (
        <ChoiceGroup language={language} label={copy("app.check.staff", language)} values={workspace.staff_names} selected={draft.staff} onSelect={(staff) => patch({ staff })} />
      ) : null}
      {ops.outlet && workspace.outlets.length > 1 ? (
        <ChoiceGroup language={language} label={copy("app.check.outlet", language)} values={workspace.outlets} selected={outletValue} onSelect={(outlet) => patch({ outlet })} />
      ) : null}
      {ops.payment && paymentOptions.length > 0 ? (
        <ChoiceGroup language={language} label={copy("app.check.payment", language)} values={[...paymentOptions]} selected={draft.payment ?? ""} onSelect={(payment) => patch({ payment })} optional />
      ) : null}
      {ops.customer ? (
        <Field label={`${copy("app.check.customer", language)} (${copy("app.check.optional", language)})`}>
          <TextInput accessibilityLabel={copy("app.check.customer", language)} value={draft.customer ?? ""} onChangeText={(customer) => patch({ customer })} style={styles.input} />
        </Field>
      ) : null}
      {ops.purpose ? (
        <Field label={`${copy("app.check.purpose", language)} (${copy("app.check.optional", language)})`}>
          <TextInput accessibilityLabel={copy("app.check.purpose", language)} value={draft.purpose ?? ""} onChangeText={(purpose) => patch({ purpose })} style={styles.input} />
        </Field>
      ) : null}

      <View style={styles.lines}>
        <Text style={styles.label}>{copy("app.check.found", language).replace("{count}", String(draft.lines.length))}</Text>
        {draft.lines.map((line, index) => (
          <View key={index} style={styles.line}>
            <TextInput accessibilityLabel={copy("app.check.item", language)} placeholder={copy("app.check.item", language)} value={line.description} onChangeText={(description) => patchLine(index, { description })} style={[styles.input, styles.lineDescription, flaggedPaths.has(`line_items[${index}].description`) && styles.flagged]} />
            <TextInput accessibilityLabel={copy("app.check.qty", language)} placeholder={copy("app.check.qty", language)} keyboardType="decimal-pad" value={line.qty} onChangeText={(qty) => patchLine(index, { qty })} style={[styles.input, styles.lineNumber, flaggedPaths.has(`line_items[${index}].qty`) && styles.flagged]} />
            <TextInput accessibilityLabel={copy("app.check.amt", language)} placeholder={copy("app.check.amt", language)} keyboardType="decimal-pad" value={line.amount} onChangeText={(amount) => patchLine(index, { amount })} style={[styles.input, styles.lineNumber, flaggedPaths.has(`line_items[${index}].amount`) && styles.flagged]} />
          </View>
        ))}
        {showErrors && validation.noLines ? <Text style={styles.error}>{copy("app.check.itemsErr", language)}</Text> : null}
        {showErrors && validation.noPrice ? <Text style={styles.error}>{copy("app.check.priceErr", language)}</Text> : null}
        {showErrors && validation.noOutlet ? <Text style={styles.error}>{copy("app.check.outletErr", language)}</Text> : null}
        {showErrors && validation.hardFlagsBlocked ? <Text style={styles.error}>{copy("app.review.hardFlagWarning", language)}</Text> : null}
      </View>

      {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={sending} style={[styles.button, styles.secondary]} onPress={onDelete}>
          <Text style={styles.buttonText}>{copy("app.review.delete", language)}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={sending} style={[styles.button, styles.secondary]} onPress={onCheck}>
          <Text style={styles.buttonText}>{copy("app.queue.check", language)}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!checked || !validation.canSend || sending} style={[styles.button, styles.primary, (!checked || !validation.canSend || sending) && styles.disabled]} onPress={onSend}>
          <Text style={styles.buttonText}>{sending ? copy("app.queue.sending", language) : copy("app.check.send", language)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceGroup({ language, label, values, selected, onSelect, optional = false }: {
  language: AppLanguage;
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{optional ? `${label} (${copy("app.check.optional", language)})` : label}</Text>
      <View style={styles.choices}>
        {values.map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceSelected]}>
            <Text style={styles.choiceText}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, borderRadius: 16, backgroundColor: "#ffffff", padding: 16 },
  title: { color: "#180c0b", fontSize: 22, fontWeight: "800" },
  note: { color: "#64514c", fontSize: 14 },
  field: { gap: 4 },
  label: { color: "#64514c", fontSize: 12, fontWeight: "700" },
  input: { minHeight: 42, borderWidth: 1, borderColor: "#d6cbc8", borderRadius: 9, paddingHorizontal: 10, color: "#180c0b", backgroundColor: "#ffffff" },
  flagged: { borderColor: "#b42318", borderWidth: 2 },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  line: { flexDirection: "row", gap: 6 },
  lineDescription: { flex: 1 },
  lineNumber: { width: 76, textAlign: "right" },
  lines: { gap: 8 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderWidth: 1, borderColor: "#d6cbc8", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#ffffff" },
  choiceSelected: { borderColor: "#f04c24", backgroundColor: "#fff0e8" },
  choiceText: { color: "#180c0b", fontSize: 13 },
  warning: { gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "#b42318", padding: 10 },
  warningText: { color: "#b42318", fontSize: 12 },
  acknowledge: { color: "#241a18", fontSize: 13, fontWeight: "700" },
  acknowledgeChecked: { borderColor: "#f04c24", backgroundColor: "#fff0e8" },
  error: { color: "#b42318", fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  button: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
  secondary: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d6cbc8" },
  primary: { backgroundColor: "#f04c24" },
  buttonText: { color: "#170b08", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },
});

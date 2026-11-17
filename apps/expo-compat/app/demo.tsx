import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { copy, type AppLanguage } from "../src/copy";
import {
  addDemoAccount, addDemoBill, addDemoTransaction, approveDemoReceipt, captureDemoReceipt,
  contributeToDemoGoal, createDemoState, editDemoReceipt, editDemoTransaction, payDemoBill,
  resetDemoState, reverseDemoTransaction, saveDemoCheckIn, saveDemoCoachingChoice,
  setDemoCycleDay, toggleDemoSetting, transferDemoMoney, updateDemoGoal, type DemoAccount,
  type DemoState,
} from "../src/demo-api";

type Screen = "welcome" | "setup" | "home" | "expense" | "receipt" | "inbox" | "receiptReview" | "income" | "activity" | "transaction" | "spending" | "accounts" | "plans" | "bill" | "goal" | "coaching" | "settings" | "wellbeing";
const screens: Screen[] = ["welcome", "setup", "home", "expense", "receipt", "inbox", "receiptReview", "income", "activity", "transaction", "spending", "accounts", "plans", "bill", "goal", "coaching", "settings", "wellbeing"];
const titleKeys: Record<Screen, string> = { welcome: "demo.welcome", setup: "demo.setup", home: "demo.home", expense: "demo.expense", receipt: "demo.receipt", inbox: "demo.inbox", receiptReview: "demo.review", income: "demo.income", activity: "demo.activity", transaction: "demo.transaction", spending: "demo.spending", accounts: "demo.accounts", plans: "demo.cashflow", bill: "demo.payment", goal: "demo.goal", coaching: "demo.coaching", settings: "demo.settings", wellbeing: "demo.wellbeing" };
const dataCopy: Record<string, string> = { "Everyday account": "demo.everyday", "Cash wallet": "demo.wallet", "Rainy day": "demo.rainy", Groceries: "demo.groceries", Coffee: "demo.coffee", Salary: "demo.salary", Food: "demo.food", Income: "demo.incomeCategory", Bills: "demo.billsCategory", "Corner Market": "demo.cornerMarket", "Market receipt": "demo.marketReceipt", Internet: "demo.internet", "Water bill": "demo.waterBill", "Weekend trip": "demo.weekendTrip", Shopping: "demo.shopping", Lunch: "demo.lunch", "Freelance work": "demo.freelance", Today: "demo.today", Yesterday: "demo.yesterday", "Nov 24": "demo.nov24", "Dec 02": "demo.decemberSecond", Bank: "demo.bank", Cash: "demo.cash", Savings: "demo.savings", transfer: "demo.transfer", Transfer: "demo.transfer" };
const translateData = (value: string, language: AppLanguage) => dataCopy[value] ? copy(dataCopy[value], language) : value;
const money = (value: number, language: AppLanguage) => `Rp ${Math.round(value).toLocaleString(language === "id" ? "id-ID" : "en-US")}`;
const numericValue = (value: string) => Number(value.replace(/[^0-9.-]/g, ""));

export default function DemoRoute() {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [state, setState] = useState<DemoState>(() => createDemoState());
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [accountId, setAccountId] = useState("daily");
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [accountKind, setAccountKind] = useState<DemoAccount["kind"]>("bank");
  const [showSavings, setShowSavings] = useState(false);
  const [transferFrom, setTransferFrom] = useState("daily");
  const [transferTo, setTransferTo] = useState("savings");
  const [transferAmount, setTransferAmount] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [receiptTitle, setReceiptTitle] = useState("Market receipt");
  const [receiptAmount, setReceiptAmount] = useState("72500");
  const [receiptDate, setReceiptDate] = useState("Today");
  const [receiptAccountId, setReceiptAccountId] = useState("daily");
  const [receiptCaptureTitle, setReceiptCaptureTitle] = useState("");
  const [receiptCaptureAmount, setReceiptCaptureAmount] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [transactionTitle, setTransactionTitle] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionAccountId, setTransactionAccountId] = useState("daily");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [spendingPeriod, setSpendingPeriod] = useState<"today" | "week">("today");
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDate, setBillDate] = useState("");
  const [billRecurring, setBillRecurring] = useState(false);
  const [billReminder, setBillReminder] = useState(true);
  const [cycleInput, setCycleInput] = useState("1");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalContribution, setGoalContribution] = useState("");
  const [coachingResponse, setCoachingResponse] = useState("");
  const t = (key: string) => copy(key, language);
  const go = (next: Screen) => setScreen(next);
  const button = (label: string, fn: () => void, secondary = false) => <Pressable key={label} accessibilityRole="button" onPress={fn} style={[styles.button, secondary && styles.secondary]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
  const field = (label: string, value: string, change: (next: string) => void, keyboardType: "default" | "numeric" = "default") => <View key={label} style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} keyboardType={keyboardType} style={styles.input} /></View>;
  const row = (title: string, detail: string, onPress?: () => void) => <Pressable key={`${title}-${detail}`} accessibilityRole={onPress ? "button" : undefined} onPress={onPress} disabled={!onPress} style={styles.row}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.muted}>{detail}</Text></Pressable>;
  const choice = (label: string, selected: boolean, fn: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={fn} style={[styles.choice, selected && styles.choiceSelected]}><Text style={selected ? styles.choiceTextSelected : styles.choiceText}>{label}</Text></Pressable>;
  const expenses = state.transactions.filter((item) => item.kind === "expense");
  const amountTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const todayTotal = expenses.filter((item) => item.date === "Today").reduce((sum, item) => sum + item.amount, 0);
  const weekTotal = expenses.filter((item) => item.date === "Today" || item.date === "Yesterday").reduce((sum, item) => sum + item.amount, 0);
  const reset = () => { setState(resetDemoState()); setSelectedReceiptId(null); setSelectedTransactionId(null); setScreen("welcome"); };
  const selectReceipt = (id: string) => {
    const receipt = state.receipts.find((item) => item.id === id);
    if (!receipt) return;
    setSelectedReceiptId(id); setReceiptTitle(receipt.title); setReceiptAmount(String(receipt.amount)); setReceiptDate(translateData(receipt.date, language)); setReceiptAccountId(receipt.accountId); go("receiptReview");
  };
  const selectTransaction = (id: string) => {
    const transaction = state.transactions.find((item) => item.id === id);
    if (!transaction) return;
    setSelectedTransactionId(id); setTransactionTitle(transaction.title); setTransactionAmount(String(transaction.amount)); setTransactionCategory(transaction.category); setTransactionAccountId(transaction.accountId); go("transaction");
  };
  const finishReceipt = (id: string, advance = false) => {
    if (!receiptTitle.trim() || !Number.isFinite(numericValue(receiptAmount)) || numericValue(receiptAmount) <= 0) return;
    const next = advance ? state.receipts.find((item) => item.status === "pending" && item.id !== id) : undefined;
    setState((current) => approveDemoReceipt(editDemoReceipt(current, id, { title: receiptTitle, amount: numericValue(receiptAmount), date: receiptDate, accountId: receiptAccountId }), id));
    if (next) selectReceipt(next.id);
    else go("inbox");
  };
  const accountChoices = state.accounts.map((account) => choice(`${translateData(account.name, language)} · ${money(account.balance, language)}`, accountId === account.id, () => setAccountId(account.id)));
  let content;
  switch (screen) {
    case "welcome": content = <><Text style={styles.hero}>{t("demo.promise")}</Text><Text style={styles.body}>{t("demo.welcomeBody")}</Text>{button(t("demo.start"), () => go("setup"))}{button(t("demo.openHome"), () => go("home"), true)}</>; break;
    case "setup": content = <><Text style={styles.body}>{t("demo.setupBody")}</Text>{field(t("demo.accountName"), accountName, setAccountName)}{field(t("demo.openingBalance"), accountBalance, setAccountBalance, "numeric")}{<Text style={styles.fieldLabel}>{t("demo.accountType")}</Text>}<View style={styles.choices}>{(["bank", "cash", "savings"] as const).map((kind) => choice(t(`demo.${kind}`), accountKind === kind, () => setAccountKind(kind)))}</View>{button(t("demo.addAccount"), () => { if (!accountName.trim() || numericValue(accountBalance) < 0) return; setState((s) => addDemoAccount(s, { name: accountName, kind: accountKind, balance: numericValue(accountBalance) })); setAccountName(""); setAccountBalance(""); go("home"); })}{button(t("demo.finishSetup"), () => go("home"), true)}</>; break;
    case "home": content = <><Text style={styles.eyebrow}>{t("demo.todaySpend")}</Text><Text style={styles.amount}>{money(todayTotal, language)}</Text><View style={styles.split}>{row(t("demo.weekSpend"), money(weekTotal, language))}{row(t("demo.balance"), money(state.accounts.filter((account) => account.kind !== "savings").reduce((sum, account) => sum + account.balance, 0), language))}</View>{button(t("demo.addExpense"), () => go("expense"))}{button(t("demo.recordIncome"), () => go("income"), true)}{button(t("demo.latestActivity"), () => go("activity"), true)}{button(t("demo.spending"), () => go("spending"), true)}{button(t("demo.accounts"), () => go("accounts"), true)}</>; break;
    case "expense": content = <>{field(t("demo.description"), expenseTitle, setExpenseTitle)}{field(t("demo.amount"), expenseAmount, setExpenseAmount, "numeric")}<Text style={styles.fieldLabel}>{t("demo.account")}</Text><View style={styles.choices}>{accountChoices}</View>{button(t("demo.saveExpense"), () => { if (!expenseTitle.trim() || !Number.isFinite(numericValue(expenseAmount)) || numericValue(expenseAmount) <= 0) return; setState((s) => addDemoTransaction(s, { title: expenseTitle, category: "Food", amount: numericValue(expenseAmount), kind: "expense", accountId })); setExpenseTitle(""); setExpenseAmount(""); go("home"); })}</>; break;
    case "receipt": content = <><Text style={styles.body}>{t("demo.captureBody")}</Text><View style={styles.receiptMock}><Text style={styles.receiptText}>{t("demo.paperReceipt")}</Text><Text style={styles.receiptTotal}>{money(72500, language)}</Text></View>{field(t("demo.merchant"), receiptCaptureTitle, setReceiptCaptureTitle)}{field(t("demo.amount"), receiptCaptureAmount, setReceiptCaptureAmount, "numeric")}{button(t("demo.simulateCapture"), () => { const id = `receipt-${state.receipts.length + 1}`; const title = receiptCaptureTitle || t("demo.marketReceipt"); const amount = numericValue(receiptCaptureAmount) || 72500; setState((s) => captureDemoReceipt(s, { title, amount, date: t("demo.today"), accountId })); setSelectedReceiptId(id); setReceiptTitle(title); setReceiptAmount(String(amount)); setReceiptDate(t("demo.today")); setReceiptAccountId(accountId); setReceiptCaptureTitle(""); setReceiptCaptureAmount(""); go("receiptReview"); })}{button(t("demo.manualExpense"), () => go("expense"), true)}</>; break;
    case "inbox": content = <>{state.receipts.filter((receipt) => receipt.status === "pending").map((receipt) => row(translateData(receipt.title, language), `${money(receipt.amount, language)} · ${t("demo.pending")}`, () => selectReceipt(receipt.id)))}{state.receipts.filter((receipt) => receipt.status === "pending").length === 0 ? <Text style={styles.body}>{t("demo.allReviewed")}</Text> : null}{button(t("demo.captureAnother"), () => go("receipt"), true)}</>; break;
    case "receiptReview": { const receipt = state.receipts.find((item) => item.id === selectedReceiptId && item.status === "pending"); content = receipt ? <>{field(t("demo.merchant"), receiptTitle, setReceiptTitle)}{field(t("demo.amount"), receiptAmount, setReceiptAmount, "numeric")}{field(t("demo.date"), receiptDate, setReceiptDate)}<Text style={styles.fieldLabel}>{t("demo.account")}</Text><View style={styles.choices}>{state.accounts.map((account) => choice(translateData(account.name, language), receiptAccountId === account.id, () => setReceiptAccountId(account.id)))}</View>{button(t("demo.approveReceipt"), () => finishReceipt(receipt.id))}{button(t("demo.saveNext"), () => finishReceipt(receipt.id, true), true)}</> : <>{row(t("demo.noReceipt"), t("demo.allReviewed"))}{button(t("demo.backInbox"), () => go("inbox"))}</>; break; }
    case "income": content = <>{field(t("demo.description"), incomeTitle, setIncomeTitle)}{field(t("demo.amount"), incomeAmount, setIncomeAmount, "numeric")}<Text style={styles.fieldLabel}>{t("demo.account")}</Text><View style={styles.choices}>{state.accounts.map((account) => choice(translateData(account.name, language), accountId === account.id, () => setAccountId(account.id)))}</View>{button(t("demo.saveIncome"), () => { if (!incomeTitle.trim() || !Number.isFinite(numericValue(incomeAmount)) || numericValue(incomeAmount) <= 0) return; setState((s) => addDemoTransaction(s, { title: incomeTitle, category: "Income", amount: numericValue(incomeAmount), kind: "income", accountId })); setIncomeTitle(""); setIncomeAmount(""); go("home"); })}</>; break;
    case "activity": {
      const matching = state.transactions.filter((tx) => translateData(tx.title, language).toLowerCase().includes(activitySearch.toLowerCase()) && (activityFilter === "all" || tx.kind === activityFilter));
      content = <><View style={styles.choices}>{(["all", "expense", "income", "transfer"] as const).map((filter) => choice(t(filter === "transfer" ? "demo.transfer" : `demo.filter.${filter}`), activityFilter === filter, () => setActivityFilter(filter)))}</View>{field(t("demo.search"), activitySearch, setActivitySearch)}{matching.map((tx) => row(tx.kind === "transfer" ? t("demo.transfer") : translateData(tx.title, language), `${tx.kind === "expense" ? "−" : tx.kind === "income" ? "+" : "↔"}${money(tx.amount, language)} · ${tx.kind === "transfer" ? t("demo.transfer") : translateData(tx.category, language)}`, () => selectTransaction(tx.id)))}{matching.length === 0 ? <Text style={styles.body}>{t("demo.noMatches")}</Text> : null}</>; break;
    }
    case "transaction": { const tx = state.transactions.find((item) => item.id === selectedTransactionId); content = tx ? <>{tx.kind === "transfer" ? <>{row(t("demo.transferFrom"), translateData(state.accounts.find((account) => account.id === tx.accountId)?.name ?? "", language))}{row(t("demo.transferTo"), translateData(state.accounts.find((account) => account.id === tx.toAccountId)?.name ?? "", language))}{row(t("demo.amount"), money(tx.amount, language))}</> : <>{field(t("demo.description"), transactionTitle, setTransactionTitle)}{field(t("demo.amount"), transactionAmount, setTransactionAmount, "numeric")}{field(t("demo.category"), transactionCategory, setTransactionCategory)}<Text style={styles.fieldLabel}>{t("demo.account")}</Text><View style={styles.choices}>{state.accounts.map((account) => choice(translateData(account.name, language), transactionAccountId === account.id, () => setTransactionAccountId(account.id)))}</View>{button(t("demo.saveChanges"), () => { setState((s) => editDemoTransaction(s, tx.id, { title: transactionTitle, amount: numericValue(transactionAmount), category: transactionCategory, accountId: transactionAccountId })); go("activity"); })}</>}{button(t("demo.undoTransaction"), () => { setState((s) => reverseDemoTransaction(s, tx.id)); go("activity"); }, true)}</> : <>{row(t("demo.noTransaction"), t("demo.noMatches"))}{button(t("demo.backInbox"), () => go("activity"))}</>; break; }
    case "spending": { const expenses = state.transactions.filter((tx) => tx.kind === "expense" && (spendingPeriod === "week" || tx.date === "Today")); const total = expenses.reduce((sum, tx) => sum + tx.amount, 0); const categories = expenses.reduce<Record<string, number>>((sum, tx) => ({ ...sum, [tx.category]: (sum[tx.category] ?? 0) + tx.amount }), {}); content = <><View style={styles.choices}>{choice(t("demo.todaySpend"), spendingPeriod === "today", () => setSpendingPeriod("today"))}{choice(t("demo.weekSpend"), spendingPeriod === "week", () => setSpendingPeriod("week"))}</View>{row(t("demo.spendingTotal"), money(total, language))}{Object.entries(categories).map(([category, amount]) => row(translateData(category, language), money(amount, language)))}{button(t("demo.viewTransactions"), () => go("activity"))}</>; break; }
    case "accounts": {
      const accountsToShow = showSavings ? state.accounts : state.accounts.filter((account) => account.kind !== "savings");
      content = <>{accountsToShow.map((account) => row(translateData(account.name, language), money(account.balance, language)))}{button(showSavings ? t("demo.hideSavings") : t("demo.showSavings"), () => setShowSavings((value) => !value), true)}<Text style={styles.sectionTitle}>{t("demo.addAccount")}</Text>{field(t("demo.accountName"), accountName, setAccountName)}{field(t("demo.openingBalance"), accountBalance, setAccountBalance, "numeric")}<View style={styles.choices}>{(["bank", "cash", "savings"] as const).map((kind) => choice(t(`demo.${kind}`), accountKind === kind, () => setAccountKind(kind)))}</View>{button(t("demo.addAccount"), () => { setState((s) => addDemoAccount(s, { name: accountName, kind: accountKind, balance: numericValue(accountBalance) })); setAccountName(""); setAccountBalance(""); })}<Text style={styles.sectionTitle}>{t("demo.transfer")}</Text><Text style={styles.fieldLabel}>{t("demo.transferFrom")}</Text><View style={styles.choices}>{state.accounts.map((account) => choice(translateData(account.name, language), transferFrom === account.id, () => setTransferFrom(account.id)))}</View><Text style={styles.fieldLabel}>{t("demo.transferTo")}</Text><View style={styles.choices}>{state.accounts.map((account) => choice(translateData(account.name, language), transferTo === account.id, () => setTransferTo(account.id)))}</View>{field(t("demo.amount"), transferAmount, setTransferAmount, "numeric")}{button(t("demo.transfer"), () => { setState((s) => transferDemoMoney(s, transferFrom, transferTo, numericValue(transferAmount))); setTransferAmount(""); })}</>; break;
    }
    case "plans": content = <>{field(t("demo.cycleStart"), cycleInput, setCycleInput, "numeric")}{button(t("demo.saveCycle"), () => setState((s) => setDemoCycleDay(s, numericValue(cycleInput))))}{row(t("demo.moneyIn"), money(state.transactions.filter((tx) => tx.kind === "income").reduce((sum, tx) => sum + tx.amount, 0), language))}{row(t("demo.moneyOut"), money(amountTotal, language))}{state.bills.map((bill) => <View key={bill.id} style={styles.listRow}><Text style={styles.rowTitle}>{translateData(bill.title, language)} · {money(bill.amount, language)}{bill.paid ? ` · ${t("demo.paid")}` : ""}</Text>{!bill.paid ? button(t("demo.markPaid"), () => setState((s) => payDemoBill(s, bill.id, accountId)), true) : null}</View>)}{button(t("demo.addPayment"), () => go("bill"))}{button(t("demo.goal"), () => go("goal"), true)}</>; break;
    case "bill": content = <>{field(t("demo.paymentName"), billTitle, setBillTitle)}{field(t("demo.amount"), billAmount, setBillAmount, "numeric")}{field(t("demo.paymentDate"), billDate, setBillDate)}{choice(t("demo.recurring"), billRecurring, () => setBillRecurring((value) => !value))}{choice(t("demo.reminder"), billReminder, () => setBillReminder((value) => !value))}{button(t("demo.savePayment"), () => { setState((s) => addDemoBill(s, { title: billTitle, amount: numericValue(billAmount), date: billDate, recurring: billRecurring, reminder: billReminder })); setBillTitle(""); setBillAmount(""); go("plans"); })}</>; break;
    case "goal": content = <>{row(t("demo.goal"), translateData(state.goal.name, language))}{field(t("demo.goalName"), goalName, setGoalName)}{field(t("demo.target"), goalTarget, setGoalTarget, "numeric")}{row(t("demo.saved"), money(state.goal.saved, language))}{row(t("demo.target"), money(state.goal.target, language))}{row(t("demo.transferNote"), t("demo.transferExplainer"))}{button(t("demo.saveGoal"), () => { setState((s) => updateDemoGoal(s, { name: goalName || s.goal.name, target: numericValue(goalTarget) || s.goal.target })); setGoalName(""); setGoalTarget(""); })}{field(t("demo.contribution"), goalContribution, setGoalContribution, "numeric")}{button(t("demo.moveMoney"), () => { setState((s) => contributeToDemoGoal(s, numericValue(goalContribution))); setGoalContribution(""); })}{button(t("demo.viewAccounts"), () => go("accounts"), true)}</>; break;
    case "coaching": content = <>{row(t("demo.optionalTip"), t("demo.coachingPrompt"))}{button(t("demo.helpful"), () => { setState((s) => saveDemoCoachingChoice(s, "helpful")); setCoachingResponse("helpful"); })}{button(t("demo.skip"), () => { setState((s) => saveDemoCoachingChoice(s, "skip")); setCoachingResponse("skip"); }, true)}{coachingResponse ? row(t("demo.choiceSaved"), t("demo.recordedInMemory")) : null}</>; break;
    case "settings": content = <>{row(t("demo.notifications"), state.settings.notifications ? t("demo.on") : t("demo.off"))}{button(t("demo.toggleNotifications"), () => setState((s) => toggleDemoSetting(s, "notifications")))}{row(t("demo.coaching"), state.settings.coaching ? t("demo.on") : t("demo.off"))}{button(t("demo.toggleCoaching"), () => setState((s) => toggleDemoSetting(s, "coaching")), true)}{row(t("demo.language"), language === "en" ? t("demo.english") : t("demo.indonesian"))}{button(t("demo.switchLanguage"), () => setLanguage(language === "en" ? "id" : "en"), true)}{button(t("demo.reset"), reset, true)}</>; break;
    case "wellbeing": content = <>{row(t("demo.checkinPrompt"), t("demo.checkinQuestion"))}{button(t("demo.answerSteady"), () => setState((s) => saveDemoCheckIn(s, "steady")))}{button(t("demo.answerConcern"), () => setState((s) => saveDemoCheckIn(s, "concern")), true)}{state.checkIns.length > 0 ? row(t("demo.savedReflection"), t("demo.recordedInMemory")) : null}{button(t("demo.done"), () => go("home"), true)}</>; break;
  }
  const nav: Screen[] = ["home", "receipt", "plans"];
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.brand}>{t("demo.brand")}</Text>
        <Text style={styles.demoTag}>{t("demo.badge")}</Text>
      </View>
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        <Text style={styles.noticeText}>{t("demo.notice")}</Text>
      </View>
      <ScrollView horizontal style={styles.screenNavScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenNav}>
        {screens.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: screen === item }}
            onPress={() => go(item)}
            style={[styles.navChip, screen === item && styles.navSelected]}
          >
            <Text style={[styles.navText, screen === item && styles.navSelectedText]}>{t(titleKeys[item])}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t("demo.screenCount")}</Text>
        <Text accessibilityRole="header" style={styles.title}>{t(titleKeys[screen])}</Text>
        <View style={styles.card}>{content}</View>
      </ScrollView>
      <View style={styles.bottomNav}>
        {nav.map((item) => (
          <Pressable key={item} accessibilityRole="button" onPress={() => go(item)} style={styles.bottomItem}>
            <Text style={[styles.bottomText, screen === item && styles.bottomActive]}>{t(titleKeys[item])}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f3f3", maxWidth: 620, width: "100%", alignSelf: "center" },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 25, fontWeight: "800", color: "#171717", letterSpacing: -1 },
  demoTag: { fontSize: 11, fontWeight: "700", color: "#444", borderWidth: 1, borderColor: "#aaa", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  notice: { backgroundColor: "#e5e5e5", marginHorizontal: 16, padding: 10, borderRadius: 9 },
  noticeText: { color: "#333", fontSize: 12, lineHeight: 17, textAlign: "center" },
  screenNavScroll: { flexGrow: 0, flexShrink: 0, height: 48 },
  screenNav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 7 },
  navChip: { flexShrink: 0, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99 },
  navSelected: { backgroundColor: "#222", borderColor: "#222" },
  navText: { color: "#333", fontSize: 12 },
  navSelectedText: { color: "#fff", fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 13 },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1.5, fontSize: 10, color: "#777", fontWeight: "700" },
  title: { fontSize: 29, fontWeight: "700", color: "#171717", letterSpacing: -0.8, marginBottom: 5 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 17, gap: 12, borderWidth: 1, borderColor: "#e8e8e8" },
  hero: { fontSize: 27, fontWeight: "700", lineHeight: 34, color: "#171717" },
  body: { fontSize: 15, color: "#555", lineHeight: 22 },
  amount: { fontSize: 34, color: "#161616", fontWeight: "700" },
  split: { flexDirection: "row", gap: 10 },
  row: { flex: 1, gap: 5, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowTitle: { color: "#222", fontSize: 15, fontWeight: "600" },
  muted: { color: "#777", fontSize: 13 },
  button: { backgroundColor: "#222", borderRadius: 11, padding: 14, alignItems: "center" },
  secondary: { backgroundColor: "#f4f4f4", borderWidth: 1, borderColor: "#ddd" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryText: { color: "#222" },
  receiptMock: { minHeight: 130, backgroundColor: "#f4f4f4", borderStyle: "dashed", borderWidth: 1, borderColor: "#aaa", borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 8 },
  receiptText: { color: "#555", fontSize: 13 },
  receiptTotal: { color: "#111", fontSize: 22, fontWeight: "700" },
  bottomNav: { borderTopWidth: 1, borderTopColor: "#ddd", paddingVertical: 10, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#fff" },
  bottomItem: { padding: 6 },
  bottomText: { color: "#777", fontSize: 10 },
  bottomActive: { color: "#111", fontWeight: "700" },
  field: { gap: 5 },
  fieldLabel: { color: "#555", fontSize: 12, fontWeight: "600" },
  input: { borderColor: "#ccc", borderWidth: 1, borderRadius: 9, color: "#222", padding: 11, backgroundColor: "#fff", fontSize: 15 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  choiceSelected: { borderColor: "#222", backgroundColor: "#222" },
  choiceText: { color: "#333", fontSize: 12 },
  choiceTextSelected: { color: "#fff", fontSize: 12 },
  sectionTitle: { color: "#222", fontWeight: "700", fontSize: 15, paddingTop: 8 },
  listRow: { gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
});

import { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
const backTargets: Partial<Record<Screen, Screen>> = { setup: "welcome", expense: "receipt", inbox: "receipt", receiptReview: "inbox", income: "home", activity: "home", transaction: "activity", spending: "home", accounts: "home", plans: "home", bill: "plans", goal: "plans", coaching: "settings", settings: "home", wellbeing: "settings" };
const dataCopy: Record<string, string> = { "Everyday account": "demo.everyday", "Cash wallet": "demo.wallet", "Rainy day": "demo.rainy", Groceries: "demo.groceries", Coffee: "demo.coffee", Salary: "demo.salary", Food: "demo.food", Income: "demo.incomeCategory", Bills: "demo.billsCategory", "Corner Market": "demo.cornerMarket", "Market receipt": "demo.marketReceipt", Internet: "demo.internet", "Water bill": "demo.waterBill", "Weekend trip": "demo.weekendTrip", Shopping: "demo.shopping", Lunch: "demo.lunch", "Freelance work": "demo.freelance", Today: "demo.today", Yesterday: "demo.yesterday", "Nov 24": "demo.nov24", "Dec 02": "demo.decemberSecond", Bank: "demo.bank", Cash: "demo.cash", Savings: "demo.savings", transfer: "demo.transfer", Transfer: "demo.transfer" };
const translateData = (value: string, language: AppLanguage) => dataCopy[value] ? copy(dataCopy[value], language) : value;
const money = (value: number, language: AppLanguage) => `Rp${Math.round(value).toLocaleString(language === "id" ? "id-ID" : "en-US")}`;
const numericValue = (value: string) => Number(value.replace(/[^0-9.-]/g, ""));

export default function DemoRoute() {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [screen, setScreen] = useState<Screen>("home");
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
  const everydayBalance = state.accounts.filter((account) => account.kind !== "savings").reduce((sum, account) => sum + account.balance, 0);
  const incomeTotal = state.transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const pendingReceiptCount = state.receipts.filter((receipt) => receipt.status === "pending").length;
  const recentExpenses = state.transactions.filter((item) => item.kind === "expense").slice(0, 4);
  const wideLayout = Platform.OS === "web";
  const reset = () => { setState(resetDemoState()); setSelectedReceiptId(null); setSelectedTransactionId(null); setScreen("home"); };
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
    case "home": content = <>
      <View style={styles.homeGlance}>
        <Pressable accessibilityRole="button" onPress={() => { setSpendingPeriod("today"); go("spending"); }} style={styles.homeToday}>
          <Text style={styles.homeMetricLabel}>{t("demo.todaySpend")}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.homeTodayAmount}>{money(todayTotal, language)}</Text>
        </Pressable>
        <View style={styles.homeGlanceSide}>
          <Pressable accessibilityRole="button" onPress={() => { setSpendingPeriod("week"); go("spending"); }} style={styles.homeMini}>
            <Text style={styles.homeMetricLabel}>{t("demo.weekSpend")}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.homeMiniNumber}>{money(weekTotal, language)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => go("accounts")} style={[styles.homeMini, styles.homeMiniDivider]}>
            <Text style={styles.homeMetricLabel}>{t("demo.balance")}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.homeMiniNumber}>{money(everydayBalance, language)}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.homeActions}>
        <Pressable accessibilityRole="button" onPress={() => go("income")} style={styles.homeRecord}>
          <Text style={styles.homeRecordText}>{t("demo.recordIncome")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => go("expense")} style={styles.homeRecord}>
          <Text style={styles.homeRecordText}>{t("demo.addExpense")}</Text>
        </Pressable>
      </View>
      {pendingReceiptCount > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => go("inbox")} style={styles.inboxNotice}>
          <View>
            <Text style={styles.rowTitle}>{t("demo.inbox")}</Text>
            <Text style={styles.muted}>{pendingReceiptCount} · {t("demo.pending")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("demo.latestSpending")}</Text>
        <Pressable accessibilityRole="button" onPress={() => go("activity")}><Text style={styles.sectionAction}>{t("demo.viewAll")}</Text></Pressable>
      </View>
      {recentExpenses.length > 0
        ? recentExpenses.map((tx) => row(translateData(tx.title, language), `${translateData(tx.date, language)} · ${money(tx.amount, language)}`, () => selectTransaction(tx.id)))
        : <Text style={styles.body}>{t("demo.noTransaction")}</Text>}
    </>; break;
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
    case "plans": content = <>
      <View style={styles.cycleCard}>
        <Text style={styles.eyebrow}>{t("demo.cashflow")}</Text>
        <Text style={styles.cycleValue}>{t("demo.cycleStart")} {state.settings.cycleDay}</Text>
        {field(t("demo.cycleStart"), cycleInput, setCycleInput, "numeric")}
        {button(t("demo.saveCycle"), () => setState((s) => setDemoCycleDay(s, numericValue(cycleInput))), true)}
      </View>
      <View style={styles.cashMetrics}>
        <View style={styles.cashMetric}><Text style={styles.cashMetricLabel}>{t("demo.moneyIn")}</Text><Text style={styles.cashMetricValue}>{money(incomeTotal, language)}</Text></View>
        <View style={styles.cashMetric}><Text style={styles.cashMetricLabel}>{t("demo.moneyOut")}</Text><Text style={styles.cashMetricValue}>{money(amountTotal, language)}</Text></View>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("demo.upcoming")}</Text>
        <Pressable accessibilityRole="button" onPress={() => go("bill")} style={styles.sectionButton}><Text style={styles.sectionButtonText}>{t("demo.addPayment")}</Text></Pressable>
      </View>
      {state.bills.filter((bill) => !bill.paid).map((bill) => (
        <View key={bill.id} style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <Text style={styles.rowTitle}>{translateData(bill.title, language)}</Text>
            <Text style={styles.muted}>{translateData(bill.date, language)}{bill.recurring ? ` · ${t("demo.recurring")}` : ""}</Text>
          </View>
          <Text style={styles.paymentAmount}>{money(bill.amount, language)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setState((s) => payDemoBill(s, bill.id, accountId))} style={styles.markPaid}>
            <Text style={styles.markPaidText}>{t("demo.markPaid")}</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.savingsNudge}>
        <Text style={styles.sectionTitle}>{t("demo.putSomethingAside")}</Text>
        <Text style={styles.body}>{t("demo.transferExplainer")}</Text>
        {button(t("demo.goal"), () => go("goal"), true)}
      </View>
    </>; break;
    case "bill": content = <>{field(t("demo.paymentName"), billTitle, setBillTitle)}{field(t("demo.amount"), billAmount, setBillAmount, "numeric")}{field(t("demo.paymentDate"), billDate, setBillDate)}{choice(t("demo.recurring"), billRecurring, () => setBillRecurring((value) => !value))}{choice(t("demo.reminder"), billReminder, () => setBillReminder((value) => !value))}{button(t("demo.savePayment"), () => { setState((s) => addDemoBill(s, { title: billTitle, amount: numericValue(billAmount), date: billDate, recurring: billRecurring, reminder: billReminder })); setBillTitle(""); setBillAmount(""); go("plans"); })}</>; break;
    case "goal": content = <>{row(t("demo.goal"), translateData(state.goal.name, language))}{field(t("demo.goalName"), goalName, setGoalName)}{field(t("demo.target"), goalTarget, setGoalTarget, "numeric")}{row(t("demo.saved"), money(state.goal.saved, language))}{row(t("demo.target"), money(state.goal.target, language))}{row(t("demo.transferNote"), t("demo.transferExplainer"))}{button(t("demo.saveGoal"), () => { setState((s) => updateDemoGoal(s, { name: goalName || s.goal.name, target: numericValue(goalTarget) || s.goal.target })); setGoalName(""); setGoalTarget(""); })}{field(t("demo.contribution"), goalContribution, setGoalContribution, "numeric")}{button(t("demo.moveMoney"), () => { setState((s) => contributeToDemoGoal(s, numericValue(goalContribution))); setGoalContribution(""); })}{button(t("demo.viewAccounts"), () => go("accounts"), true)}</>; break;
    case "coaching": content = <>{row(t("demo.optionalTip"), t("demo.coachingPrompt"))}{button(t("demo.helpful"), () => { setState((s) => saveDemoCoachingChoice(s, "helpful")); setCoachingResponse("helpful"); })}{button(t("demo.skip"), () => { setState((s) => saveDemoCoachingChoice(s, "skip")); setCoachingResponse("skip"); }, true)}{coachingResponse ? row(t("demo.choiceSaved"), t("demo.recordedInMemory")) : null}</>; break;
    case "settings": content = <>{row(t("demo.notifications"), state.settings.notifications ? t("demo.on") : t("demo.off"))}{button(t("demo.toggleNotifications"), () => setState((s) => toggleDemoSetting(s, "notifications")))}{row(t("demo.coaching"), state.settings.coaching ? t("demo.on") : t("demo.off"))}{button(t("demo.toggleCoaching"), () => setState((s) => toggleDemoSetting(s, "coaching")), true)}{row(t("demo.language"), language === "en" ? t("demo.english") : t("demo.indonesian"))}{button(t("demo.switchLanguage"), () => setLanguage(language === "en" ? "id" : "en"), true)}{button(t("demo.reset"), reset, true)}</>; break;
    case "wellbeing": content = <>{row(t("demo.checkinPrompt"), t("demo.checkinQuestion"))}{button(t("demo.answerSteady"), () => setState((s) => saveDemoCheckIn(s, "steady")))}{button(t("demo.answerConcern"), () => setState((s) => saveDemoCheckIn(s, "concern")), true)}{state.checkIns.length > 0 ? row(t("demo.savedReflection"), t("demo.recordedInMemory")) : null}{button(t("demo.done"), () => go("home"), true)}</>; break;
  }
  const nav: Screen[] = ["home", "receipt", "plans"];
  const activeTab: Screen = ["receipt", "expense", "inbox", "receiptReview"].includes(screen) ? "receipt" : ["plans", "bill", "goal", "coaching"].includes(screen) ? "plans" : "home";
  const showBottomNav = !["welcome", "setup", "receiptReview"].includes(screen);
  const screenNav = (item: Screen, index: number) => (
    <Pressable
      key={item}
      accessibilityRole="button"
      accessibilityState={{ selected: screen === item }}
      onPress={() => go(item)}
      style={[styles.route, !wideLayout && styles.routeCompact, screen === item && styles.routeSelected]}
    >
      <Text style={styles.routeNumber}>{String(index + 1).padStart(2, "0")}</Text>
      <Text style={[styles.routeText, screen === item && styles.routeSelectedText]}>{t(titleKeys[item])}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={[styles.page, wideLayout && styles.pageWide]}>
      <View style={styles.header}>
        <Text style={styles.brand}>{t("demo.brand")}</Text>
        <Text style={styles.demoTag}>{t("demo.badge")}</Text>
      </View>
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        <Text style={styles.noticeText}>{t("demo.notice")}</Text>
      </View>
      <View style={[styles.workbench, wideLayout && styles.workbenchWide]}>
        <View style={[styles.sidebar, !wideLayout && styles.sidebarMobile]}>
          <Text style={styles.sidebarTitle}>{t("demo.screenCount")}</Text>
          <ScrollView
            horizontal={!wideLayout}
            style={[styles.routeList, !wideLayout && styles.routeListMobile]}
            contentContainerStyle={!wideLayout ? styles.routeListContentMobile : undefined}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {screens.map((item, index) => screenNav(item, index))}
          </ScrollView>
        </View>
        <View style={[styles.previewColumn, wideLayout && styles.previewColumnWide]}>
          <View style={[styles.phone, !wideLayout && styles.phoneMobile]}>
            <View style={styles.appShell}>
              {screen === "welcome" ? null : (
                <View style={styles.appHeader}>
                  {screen === "home" ? (
                    <Text style={styles.appBrand}>{t("demo.brand")}</Text>
                  ) : (
                    <View style={styles.backRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel={t(titleKeys[backTargets[screen] ?? "home"])} onPress={() => go(backTargets[screen] ?? "home")} style={styles.backButton}>
                        <Text style={styles.backText}>‹</Text>
                      </Pressable>
                      <Text accessibilityRole="header" style={styles.appTitle}>{t(titleKeys[screen])}</Text>
                    </View>
                  )}
                  {screen !== "settings" ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t("demo.settings")} onPress={() => go("settings")} style={styles.headerAction}>
                      <Text style={styles.headerActionText}>···</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {content}
              </ScrollView>
              {showBottomNav ? (
                <View style={styles.bottomNav}>
                  {nav.map((item) => (
                    <Pressable key={item} accessibilityRole="button" onPress={() => go(item)} style={styles.bottomItem}>
                      <Text style={[styles.bottomIcon, item === "receipt" && styles.captureIcon]}>{item === "home" ? "⌂" : item === "receipt" ? "⊕" : "▦"}</Text>
                      <Text style={[styles.bottomText, activeTab === item && styles.bottomActive]}>{item === "receipt" ? t("demo.captureTab") : t(titleKeys[item])}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff", width: "100%" },
  pageWide: { maxWidth: 1130, alignSelf: "center", paddingHorizontal: 22, paddingVertical: 20 },
  header: { minHeight: 48, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 22, lineHeight: 28, fontWeight: "800", color: "#171717", letterSpacing: -1 },
  demoTag: { fontSize: 10, fontWeight: "700", color: "#515151", borderWidth: 1, borderColor: "#dedede", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  notice: { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 9, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9 },
  noticeText: { color: "#555", fontSize: 11, lineHeight: 16, textAlign: "center" },
  workbench: { flex: 1, minHeight: 0 },
  workbenchWide: { flexDirection: "row", gap: 28 },
  sidebar: { width: 235, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14 },
  sidebarMobile: { width: "100%", borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 4 },
  sidebarTitle: { color: "#171717", fontSize: 14, lineHeight: 20, fontWeight: "600", marginBottom: 9 },
  routeList: { flex: 1 },
  routeListMobile: { flexGrow: 0, flexShrink: 0, height: 46 },
  routeListContentMobile: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 7 },
  route: { width: "100%", minHeight: 34, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeCompact: { width: "auto", maxWidth: 160, minHeight: 34, flexShrink: 0, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", borderRadius: 7 },
  routeSelected: { backgroundColor: "#f1f1f1" },
  routeNumber: { color: "#929292", fontSize: 11, lineHeight: 16, fontVariant: ["tabular-nums"] },
  routeText: { flex: 1, color: "#333", fontSize: 11, lineHeight: 16 },
  routeSelectedText: { color: "#171717", fontWeight: "600" },
  previewColumn: { flex: 1, minWidth: 0, minHeight: 0 },
  previewColumnWide: { alignItems: "center", justifyContent: "center" },
  phone: { width: 400, height: "100%", maxWidth: "100%", maxHeight: 715, borderWidth: 1, borderColor: "#dcdcdc", borderRadius: 17, backgroundColor: "#fff", overflow: "hidden" },
  phoneMobile: { width: "100%", maxWidth: "100%", borderWidth: 0, borderRadius: 0 },
  appShell: { flex: 1, minHeight: 0, backgroundColor: "#fff" },
  appHeader: { minHeight: 58, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  appBrand: { color: "#171717", fontSize: 22, lineHeight: 29, fontWeight: "800", letterSpacing: -1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  backButton: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
  backText: { color: "#171717", fontSize: 26, lineHeight: 28 },
  appTitle: { color: "#171717", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  headerAction: { minWidth: 34, minHeight: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#dedede", borderRadius: 7 },
  headerActionText: { color: "#515151", fontSize: 16, lineHeight: 20 },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 5, paddingBottom: 22, gap: 12 },
  eyebrow: { color: "#6f6f6f", fontSize: 11, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: "600" },
  hero: { color: "#171717", fontSize: 27, lineHeight: 34, fontWeight: "700" },
  body: { color: "#555", fontSize: 13, lineHeight: 20 },
  homeGlance: { flexDirection: "row", alignItems: "stretch", gap: 9, marginTop: 8, marginBottom: 12 },
  homeToday: { flex: 1.09, minWidth: 0, minHeight: 166, borderRadius: 16, backgroundColor: "#f3f3f3", padding: 14, justifyContent: "space-between" },
  homeMetricLabel: { color: "#171717", fontSize: 13, lineHeight: 17, fontWeight: "600" },
  homeTodayAmount: { color: "#171717", fontSize: 27, lineHeight: 30, fontWeight: "700", letterSpacing: -1.2 },
  homeGlanceSide: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: "#ececec", borderRadius: 16, overflow: "hidden", backgroundColor: "#fff" },
  homeMini: { flex: 1, minHeight: 82, justifyContent: "space-between", padding: 12 },
  homeMiniDivider: { borderTopWidth: 1, borderTopColor: "#e9e9e9" },
  homeMiniNumber: { color: "#171717", fontSize: 19, lineHeight: 24, fontWeight: "700", letterSpacing: -0.6 },
  homeActions: { flexDirection: "row", gap: 9, marginBottom: 18 },
  homeRecord: { flex: 1, minWidth: 0, minHeight: 45, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#dedede", borderRadius: 11, backgroundColor: "#fff", paddingHorizontal: 8 },
  homeRecordText: { color: "#171717", fontSize: 12, lineHeight: 16, fontWeight: "600", textAlign: "center" },
  inboxNotice: { width: "100%", minHeight: 58, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 9, backgroundColor: "#fafafa", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chevron: { color: "#6f6f6f", fontSize: 21, lineHeight: 25 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 6 },
  sectionTitle: { color: "#171717", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  sectionAction: { color: "#666", fontSize: 12, lineHeight: 18 },
  sectionButton: { minHeight: 32, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", paddingHorizontal: 9 },
  sectionButtonText: { color: "#171717", fontSize: 11, lineHeight: 16, fontWeight: "600" },
  row: { width: "100%", minHeight: 50, borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTitle: { flex: 1, color: "#222", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  muted: { maxWidth: "58%", color: "#6f6f6f", fontSize: 11, lineHeight: 16, textAlign: "right" },
  button: { minHeight: 43, borderWidth: 1, borderColor: "#1d1d1d", borderRadius: 7, backgroundColor: "#1d1d1d", paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  secondary: { borderColor: "#dedede", backgroundColor: "#fff" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 13, lineHeight: 18, textAlign: "center" },
  secondaryText: { color: "#171717" },
  receiptMock: { minHeight: 250, borderRadius: 12, backgroundColor: "#202020", alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  receiptText: { color: "#fff", fontSize: 13, lineHeight: 19 },
  receiptTotal: { color: "#fff", fontSize: 22, lineHeight: 28, fontWeight: "700" },
  bottomNav: { height: 61, borderTopWidth: 1, borderTopColor: "#e5e5e5", paddingHorizontal: 10, paddingTop: 5, paddingBottom: 7, flexDirection: "row", justifyContent: "space-around", backgroundColor: "#fff" },
  bottomItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  bottomIcon: { width: 34, height: 29, textAlign: "center", textAlignVertical: "center", color: "#6f6f6f", fontSize: 20, lineHeight: 25 },
  captureIcon: { borderRadius: 10, overflow: "hidden", backgroundColor: "#242424", color: "#fff" },
  bottomText: { color: "#6f6f6f", fontSize: 10, lineHeight: 13, textAlign: "center" },
  bottomActive: { color: "#171717", fontWeight: "600" },
  field: { width: "100%", gap: 5, marginBottom: 1 },
  fieldLabel: { color: "#555", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  input: { minHeight: 42, borderColor: "#d9d9d9", borderWidth: 1, borderRadius: 7, color: "#222", paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#fff", fontSize: 15 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  choiceSelected: { borderColor: "#aaa", backgroundColor: "#f1f1f1" },
  choiceText: { color: "#333", fontSize: 12, lineHeight: 16 },
  choiceTextSelected: { color: "#171717", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  cycleCard: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 13, gap: 10 },
  cycleValue: { color: "#171717", fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.5 },
  cashMetrics: { flexDirection: "row", gap: 10 },
  cashMetric: { flex: 1, minWidth: 0, borderRadius: 12, backgroundColor: "#f5f5f5", padding: 13, gap: 6 },
  cashMetricLabel: { color: "#555", fontSize: 11, lineHeight: 16 },
  cashMetricValue: { color: "#171717", fontSize: 19, lineHeight: 25, fontWeight: "700", letterSpacing: -0.5 },
  paymentRow: { width: "100%", minHeight: 55, borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  paymentInfo: { flex: 1, minWidth: 0, gap: 3 },
  paymentAmount: { color: "#171717", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  markPaid: { minHeight: 30, borderWidth: 1, borderColor: "#ddd", borderRadius: 7, justifyContent: "center", paddingHorizontal: 7 },
  markPaidText: { color: "#333", fontSize: 10, lineHeight: 14 },
  savingsNudge: { marginTop: 10, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 13, gap: 9 },
});


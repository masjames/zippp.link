export type DemoAccount = { id: string; name: string; kind: "bank" | "cash" | "savings"; balance: number };
export type DemoTransaction = { id: string; title: string; category: string; amount: number; kind: "expense" | "income" | "transfer"; date: string; accountId: string; toAccountId?: string };
export type DemoReceipt = { id: string; title: string; amount: number; status: "pending" | "approved"; date: string; accountId: string };
export type DemoBill = { id: string; title: string; amount: number; date: string; recurring: boolean; reminder: boolean; paid: boolean };
export type DemoState = {
  accounts: DemoAccount[];
  transactions: DemoTransaction[];
  receipts: DemoReceipt[];
  bills: DemoBill[];
  goal: { name: string; target: number; saved: number };
  settings: { notifications: boolean; coaching: boolean; cycleDay: number };
  checkIns: string[];
  coachingChoices: string[];
};

export function createDemoState(): DemoState {
  return {
    accounts: [
      { id: "daily", name: "Everyday account", kind: "bank", balance: 2850000 },
      { id: "cash", name: "Cash wallet", kind: "cash", balance: 180000 },
      { id: "savings", name: "Rainy day", kind: "savings", balance: 1200000 },
    ],
    transactions: [
      { id: "tx-1", title: "Groceries", category: "Food", amount: 145000, kind: "expense", date: "Today", accountId: "daily" },
      { id: "tx-2", title: "Coffee", category: "Food", amount: 38000, kind: "expense", date: "Today", accountId: "cash" },
      { id: "tx-3", title: "Salary", category: "Income", amount: 6500000, kind: "income", date: "Yesterday", accountId: "daily" },
    ],
    receipts: [{ id: "receipt-1", title: "Corner Market", amount: 86500, status: "pending", date: "Today", accountId: "daily" }],
    bills: [{ id: "bill-1", title: "Internet", amount: 350000, date: "Nov 24", recurring: true, reminder: true, paid: false }],
    goal: { name: "Weekend trip", target: 3000000, saved: 1200000 },
    settings: { notifications: true, coaching: false, cycleDay: 1 },
    checkIns: [],
    coachingChoices: [],
  };
}

export function resetDemoState(): DemoState { return createDemoState(); }
function nextId(prefix: string, ids: string[]): string {
  const marker = `${prefix}-`;
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(marker)) continue;
    const value = Number(id.slice(marker.length));
    if (Number.isSafeInteger(value) && value > max) max = value;
  }
  return `${marker}${max + 1}`;
}

export function addDemoAccount(state: DemoState, input: { name: string; kind: DemoAccount["kind"]; balance: number }): DemoState {
  if (!input.name.trim() || !Number.isFinite(input.balance) || input.balance < 0) return state;
  const id = nextId("account", state.accounts.map((account) => account.id));
  return { ...state, accounts: [...state.accounts, { ...input, name: input.name.trim(), id }] };
}

export function addDemoTransaction(state: DemoState, input: { title: string; category: string; amount: number; kind: "expense" | "income"; accountId: string }): DemoState {
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!account || !input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0) return state;
  const transaction = { ...input, title: input.title.trim(), id: nextId("tx", state.transactions.map((item) => item.id)), date: "Today" };
  return {
    ...state,
    accounts: state.accounts.map((item) => item.id === account.id ? { ...item, balance: item.balance + (input.kind === "income" ? input.amount : -input.amount) } : item),
    transactions: [transaction, ...state.transactions],
  };
}

export function editDemoTransaction(state: DemoState, id: string, input: { title: string; category: string; amount: number; accountId: string }): DemoState {
  const current = state.transactions.find((item) => item.id === id);
  const target = state.accounts.find((item) => item.id === input.accountId);
  if (!current || current.kind === "transfer" || !target || !input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0) return state;
  const accounts = state.accounts.map((account) => {
    let balance = account.balance;
    if (account.id === current.accountId) balance += current.kind === "expense" ? current.amount : -current.amount;
    if (account.id === target.id) balance += current.kind === "expense" ? -input.amount : input.amount;
    return { ...account, balance };
  });
  return { ...state, accounts, transactions: state.transactions.map((item) => item.id === id ? { ...item, ...input, title: input.title.trim(), accountId: target.id } : item) };
}

export function reverseDemoTransaction(state: DemoState, id: string): DemoState {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return state;
  return {
    ...state,
    transactions: state.transactions.filter((item) => item.id !== id),
    accounts: state.accounts.map((account) => {
      if (transaction.kind === "transfer") {
        if (account.id === transaction.accountId) return { ...account, balance: account.balance + transaction.amount };
        if (account.id === transaction.toAccountId) return { ...account, balance: account.balance - transaction.amount };
        return account;
      }
      if (account.id === transaction.accountId) return { ...account, balance: account.balance + (transaction.kind === "expense" ? transaction.amount : -transaction.amount) };
      return account;
    }),
  };
}

export function captureDemoReceipt(state: DemoState, input: { title: string; amount: number; date: string; accountId: string }): DemoState {
  if (!input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || !state.accounts.some((account) => account.id === input.accountId)) return state;
  const id = nextId("receipt", state.receipts.map((item) => item.id));
  return { ...state, receipts: [{ ...input, id, title: input.title.trim(), status: "pending", accountId: input.accountId }, ...state.receipts] };
}

export function editDemoReceipt(state: DemoState, id: string, input: { title: string; amount: number; date: string; accountId: string }): DemoState {
  if (!input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || !state.accounts.some((account) => account.id === input.accountId)) return state;
  return { ...state, receipts: state.receipts.map((receipt) => receipt.id === id && receipt.status === "pending" ? { ...receipt, ...input, title: input.title.trim() } : receipt) };
}

export function approveDemoReceipt(state: DemoState, id: string): DemoState {
  const receipt = state.receipts.find((item) => item.id === id && item.status === "pending");
  if (!receipt) return state;
  const next = { ...state, receipts: state.receipts.map((item) => item.id === id ? { ...item, status: "approved" as const } : item) };
  return addDemoTransaction(next, { title: receipt.title, category: "Shopping", amount: receipt.amount, kind: "expense", accountId: receipt.accountId });
}

export function addDemoBill(state: DemoState, input: Omit<DemoBill, "id" | "paid">): DemoState {
  if (!input.title.trim() || !Number.isFinite(input.amount) || input.amount <= 0) return state;
  const id = nextId("bill", state.bills.map((item) => item.id));
  return { ...state, bills: [{ ...input, title: input.title.trim(), id, paid: false }, ...state.bills] };
}

export function payDemoBill(state: DemoState, id: string, accountId: string): DemoState {
  const bill = state.bills.find((item) => item.id === id && !item.paid);
  if (!bill || !state.accounts.some((account) => account.id === accountId)) return state;
  const next = { ...state, bills: state.bills.map((item) => item.id === id ? { ...item, paid: true } : item) };
  return addDemoTransaction(next, { title: bill.title, category: "Bills", amount: bill.amount, kind: "expense", accountId });
}

export function transferDemoMoney(state: DemoState, fromId: string, toId: string, amount: number): DemoState {
  const from = state.accounts.find((account) => account.id === fromId);
  const to = state.accounts.find((account) => account.id === toId);
  if (!from || !to || from.id === to.id || !Number.isFinite(amount) || amount <= 0 || from.balance < amount) return state;
  const transaction: DemoTransaction = { id: nextId("tx", state.transactions.map((item) => item.id)), title: "transfer", category: "transfer", amount, kind: "transfer", date: "Today", accountId: from.id, toAccountId: to.id };
  return {
    ...state,
    accounts: state.accounts.map((account) => account.id === from.id ? { ...account, balance: account.balance - amount } : account.id === to.id ? { ...account, balance: account.balance + amount } : account),
    transactions: [transaction, ...state.transactions],
  };
}

export function updateDemoGoal(state: DemoState, input: { name: string; target: number }): DemoState {
  if (!input.name.trim() || !Number.isFinite(input.target) || input.target <= 0) return state;
  return { ...state, goal: { ...state.goal, name: input.name.trim(), target: input.target } };
}

export function contributeToDemoGoal(state: DemoState, amount: number): DemoState {
  const daily = state.accounts.find((account) => account.id === "daily");
  const savings = state.accounts.find((account) => account.id === "savings");
  if (!daily || !savings || !Number.isFinite(amount) || amount <= 0 || daily.balance < amount) return state;
  return { ...state, goal: { ...state.goal, saved: state.goal.saved + amount }, accounts: state.accounts.map((account) => account.id === daily.id ? { ...account, balance: account.balance - amount } : account.id === savings.id ? { ...account, balance: account.balance + amount } : account) };
}

export function toggleDemoSetting(state: DemoState, setting: "notifications" | "coaching"): DemoState {
  return { ...state, settings: { ...state.settings, [setting]: !state.settings[setting] } };
}
export function setDemoCycleDay(state: DemoState, day: number): DemoState {
  if (!Number.isFinite(day)) return state;
  return { ...state, settings: { ...state.settings, cycleDay: Math.max(1, Math.min(28, Math.floor(day))) } };
}
export function saveDemoCheckIn(state: DemoState, answer: string): DemoState {
  return { ...state, checkIns: [...state.checkIns, answer] };
}
export function saveDemoCoachingChoice(state: DemoState, choice: string): DemoState {
  return { ...state, coachingChoices: [...state.coachingChoices, choice] };
}

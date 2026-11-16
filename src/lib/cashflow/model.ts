export type ISODate = `${number}-${number}-${number}`;
export type MoneyMinor = string;

export interface Money {
  currency: string;
  minor: MoneyMinor;
}

export type AccountKind = "bank" | "ewallet" | "cash" | "savings" | "other_liquid";

export interface Account {
  id: string;
  label: string;
  currency: string;
  kind: AccountKind;
  includedInEverydayBalance: boolean;
  archived?: boolean;
}

export type LedgerEntryKind = "expense" | "income" | "transfer" | "adjustment";
export type SyncState = "local_pending" | "server_accepted" | "sheet_committed" | "conflict";

export interface LedgerEntry {
  id: string;
  kind: LedgerEntryKind;
  occurredOn: ISODate;
  createdAt: string;
  accountId: string;
  amount: Money;
  description?: string;
  categoryId?: string;
  sourceDraftId?: string;
  idempotencyKey: string;
  correctionOf?: string;
  syncState: SyncState;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  occurredOn: ISODate;
  idempotencyKey: string;
}

export type ReceiptDraftState =
  | "captured"
  | "processing"
  | "ready"
  | "needs_attention"
  | "approved_pending"
  | "committed"
  | "discarded";

export interface ReceiptDraft {
  id: string;
  imageLocalRef?: string;
  driveFileId?: string;
  state: ReceiptDraftState;
  candidate?: Partial<LedgerEntry>;
  captureAt: string;
  extractedAt?: string;
  approvedAt?: string;
}

export interface CashFlowCycle {
  startDay: number;
  timezone: string;
}

const MONEY_MINOR_PATTERN = /^-?(?:0|[1-9][0-9]*)$/;

export function isMoneyMinor(value: unknown): value is MoneyMinor {
  if (typeof value !== "string") return false;
  const match = MONEY_MINOR_PATTERN.exec(value);
  return match?.[0] === value && value !== "-0";
}

export function isMoney(value: unknown): value is Money {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("currency" in value) ||
    !("minor" in value)
  ) {
    return false;
  }
  const candidate = value as { currency?: unknown; minor?: unknown };
  return (
    typeof candidate.currency === "string" &&
    candidate.currency.trim().length > 0 &&
    isMoneyMinor(candidate.minor)
  );
}

export function isReceiptDraftState(value: unknown): value is ReceiptDraftState {
  switch (value) {
    case "captured":
    case "processing":
    case "ready":
    case "needs_attention":
    case "approved_pending":
    case "committed":
    case "discarded":
      return true;
    default:
      return false;
  }
}

export function isCashFlowCycle(value: unknown): value is CashFlowCycle {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("startDay" in value) ||
    !("timezone" in value)
  ) {
    return false;
  }
  const candidate = value as { startDay?: unknown; timezone?: unknown };
  if (
    typeof candidate.startDay !== "number" ||
    !Number.isInteger(candidate.startDay) ||
    candidate.startDay < 1 ||
    candidate.startDay > 31
  ) {
    return false;
  }
  if (typeof candidate.timezone !== "string" || candidate.timezone.trim().length === 0) {
    return false;
  }
  return true;

}

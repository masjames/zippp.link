import { isMoney } from "./model";
import type { Account, LedgerEntry, Money, SyncState, Transfer } from "./model";

export interface OpeningAccount {
  account: Account;
  openingBalance: Money | null;
}

export interface TransferMovement {
  transfer: Transfer;
  syncState: SyncState;
}

export interface ProjectedAccountBalance {
  accountId: string;
  currency: string;
  minor: string | null;
}

export interface ProjectedCurrencyBalance {
  currency: string;
  minor: string | null;
}

export interface BalanceProjection {
  accounts: ProjectedAccountBalance[];
  everydayBalances: ProjectedCurrencyBalance[];
}

/**
 * Project committed movements since the caller's opening-balance cutoff.
 * Unknown opening balances remain unknown. No currencies are combined.
 */
export function projectBalances(
  opening: readonly OpeningAccount[],
  entries: readonly LedgerEntry[],
  transfers: readonly TransferMovement[],
): BalanceProjection {
  const accounts = new Map<string, { account: Account; minor: bigint | null }>();
  for (const { account, openingBalance } of opening) {
    if (!account.id || !account.currency.trim() || accounts.has(account.id)) {
      throw new Error("Invalid or duplicate account");
    }
    if (openingBalance !== null && (!isMoney(openingBalance) || openingBalance.currency !== account.currency)) {
      throw new Error("Invalid opening balance");
    }
    accounts.set(account.id, { account, minor: openingBalance === null ? null : BigInt(openingBalance.minor) });
  }

  const seen = new Set<string>();
  function claim(id: string): void {
    if (!id || seen.has(id)) throw new Error("Missing or duplicate movement ID");
    seen.add(id);
  }
  function accountFor(id: string, amount: Money): { account: Account; minor: bigint | null } {
    const target = accounts.get(id);
    if (!target || !isMoney(amount) || amount.currency !== target.account.currency || amount.minor.startsWith("-")) {
      throw new Error("Invalid movement account or amount");
    }
    return target;
  }
  function apply(target: { minor: bigint | null }, amount: bigint): void {
    if (target.minor !== null) target.minor += amount;
  }

  for (const entry of entries) {
    if (entry.syncState !== "sheet_committed") continue;
    claim(entry.id);
    if ((entry.kind !== "income" && entry.kind !== "expense") || entry.correctionOf) {
      throw new Error("Unsupported ledger movement");
    }
    const target = accountFor(entry.accountId, entry.amount);
    const amount = BigInt(entry.amount.minor);
    apply(target, entry.kind === "income" ? amount : -amount);
  }
  for (const { transfer, syncState } of transfers) {
    if (syncState !== "sheet_committed") continue;
    claim(transfer.id);
    if (transfer.fromAccountId === transfer.toAccountId) throw new Error("Transfer accounts must differ");
    const from = accountFor(transfer.fromAccountId, transfer.amount);
    const to = accountFor(transfer.toAccountId, transfer.amount);
    const amount = BigInt(transfer.amount.minor);
    apply(from, -amount);
    apply(to, amount);
  }

  const projected: ProjectedAccountBalance[] = [];
  const everyday = new Map<string, bigint | null>();
  for (const { account, minor } of accounts.values()) {
    projected.push({ accountId: account.id, currency: account.currency, minor: minor === null ? null : minor.toString() });
    if (account.includedInEverydayBalance) {
      const previous = everyday.get(account.currency);
      if (minor === null || previous === null) everyday.set(account.currency, null);
      else everyday.set(account.currency, (previous ?? BigInt(0)) + minor);
    }
  }
  return {
    accounts: projected,
    everydayBalances: Array.from(everyday, ([currency, minor]) => ({ currency, minor: minor === null ? null : minor.toString() })),
  };
}

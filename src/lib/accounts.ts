import type { Account, Transaction } from '../types';

export interface AccountBalance {
  /** Solde initial saisi à la création du compte. */
  opening: number;
  income: number;
  expenses: number;
  count: number;
  /** Solde actuel = solde initial + revenus − dépenses des transactions rattachées au compte. */
  current: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeAccountBalances(accounts: Account[], transactions: Transaction[]): Record<string, AccountBalance> {
  const result: Record<string, AccountBalance> = {};
  accounts.forEach(a => {
    result[a.id] = { opening: a.balance || 0, income: 0, expenses: 0, count: 0, current: a.balance || 0 };
  });
  transactions.forEach(tx => {
    if (!tx.account_id || !result[tx.account_id]) return;
    const r = result[tx.account_id];
    if (tx.type === 'income') r.income += tx.amount;
    else r.expenses += tx.amount;
    r.count += 1;
  });
  Object.values(result).forEach(r => {
    r.income = round2(r.income);
    r.expenses = round2(r.expenses);
    r.current = round2(r.opening + r.income - r.expenses);
  });
  return result;
}

/** Totaux par devise : on n'additionne jamais des devises différentes. */
export function totalsByCurrency(
  accounts: Account[],
  balances: Record<string, AccountBalance>,
): { currency: string; total: number }[] {
  const map = new Map<string, number>();
  accounts.forEach(a => {
    map.set(a.currency, (map.get(a.currency) || 0) + (balances[a.id]?.current ?? 0));
  });
  return [...map.entries()].map(([currency, total]) => ({ currency, total: round2(total) }));
}

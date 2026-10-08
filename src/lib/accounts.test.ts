import { describe, it, expect } from 'vitest';
import { computeAccountBalances, totalsByCurrency } from './accounts';
import type { Account, Transaction } from '../types';

const account = (id: string, balance: number, currency = 'XAF'): Account => ({
  id, user_id: 'u', name: id, type: 'checking', balance, currency, color: '#000', created_at: '',
});
const tx = (account_id: string | null, type: 'income' | 'expense', amount: number): Transaction => ({
  id: Math.random().toString(), user_id: 'u', account_id, type, category: 'x', amount, description: '', date: '2026-01-01',
  tags: [], family_member_id: null, is_recurring: false, recurrence_frequency: null, recurrence_parent_id: null,
  next_recurrence_date: null, created_at: '',
});

describe('soldes de comptes', () => {
  it('solde actuel = solde initial + revenus − dépenses du compte', () => {
    const balances = computeAccountBalances(
      [account('a', 1000), account('b', 0)],
      [tx('a', 'income', 500), tx('a', 'expense', 200), tx('b', 'expense', 50), tx(null, 'expense', 999)],
    );
    expect(balances.a).toMatchObject({ opening: 1000, income: 500, expenses: 200, count: 2, current: 1300 });
    expect(balances.b.current).toBe(-50);
  });

  it("n'additionne jamais des devises différentes", () => {
    const accounts = [account('a', 100, 'XAF'), account('b', 40, 'EUR'), account('c', 60, 'XAF')];
    const totals = totalsByCurrency(accounts, computeAccountBalances(accounts, []));
    expect(totals).toEqual([{ currency: 'XAF', total: 160 }, { currency: 'EUR', total: 40 }]);
  });
});

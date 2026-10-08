// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { FakeDb } from '../test/fakeSupabase';

const db = new FakeDb();

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => db.from(table) },
  isSupabaseConfigured: true,
}));

import { TransactionsProvider, useTransactions } from './useTransactions';

const Count: React.FC = () => {
  const { transactions, loading } = useTransactions();
  return <div data-testid="count">{loading ? 'loading' : transactions.length}</div>;
};

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 4, 10, 0, 30)); // 10 mai 2026, 00h30 heure locale (cas limite UTC)
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('transactions récurrentes', () => {
  const seedTemplate = () =>
    db.seed('transactions', {
      type: 'expense', amount: 100000, category: 'Logement', description: 'Loyer', date: '2026-01-31',
      is_recurring: true, recurrence_frequency: 'monthly', next_recurrence_date: '2026-02-28',
    });

  it('génère une seule fois chaque occurrence manquante, même en mode strict, et avance le modèle', async () => {
    const template = seedTemplate();
    render(
      <React.StrictMode>
        <TransactionsProvider>
          <Count />
        </TransactionsProvider>
      </React.StrictMode>,
    );

    // 1 modèle + 3 occurrences (28 fév., 31 mars, 30 avr.)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
    const children = db.tables.transactions.filter(t => t.recurrence_parent_id === template.id);
    expect(children.map(c => c.date).sort()).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(db.tables.transactions.find(t => t.id === template.id)!.next_recurrence_date).toBe('2026-05-31');
  });

  it('un second chargement ne crée aucun doublon', async () => {
    seedTemplate();
    const first = render(<TransactionsProvider><Count /></TransactionsProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
    first.unmount();

    render(<TransactionsProvider><Count /></TransactionsProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('4'));
    expect(db.tables.transactions).toHaveLength(4);
  });
});

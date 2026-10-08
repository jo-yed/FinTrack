import { describe, it, expect } from 'vitest';
import { summarizeBudget, buildJournal, buildTimeline, usageStatus } from './budgets';
import type { ProjectCategory, ProjectTransaction } from '../types';

const cat = (id: string, name: string, allocated: number, order = 0): ProjectCategory => ({
  id, project_id: 'p', user_id: 'u', name, allocated_amount: allocated, color: '#000', sort_order: order,
  created_at: `2026-01-0${order + 1}T00:00:00Z`,
});

let n = 0;
const entry = (type: 'income' | 'expense', amount: number, date: string, category_id: string | null = null): ProjectTransaction => ({
  id: `e${n++}`, project_id: 'p', user_id: 'u', category_id, type, label: 'x', amount, date,
  payee: '', reference: '', payment_method: '', note: '', source_transaction_id: null,
  status: 'approved', approved_by: null, approved_at: null, rejection_reason: '', created_by_email: '',
  created_at: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
});

describe('summarizeBudget', () => {
  const cats = [cat('c1', 'Transport', 100000, 0), cat('c2', 'Fournitures', 50000, 1)];

  it('calcule fonds, dépensé, reste et solde de caisse', () => {
    const s = summarizeBudget({ target_amount: 200000 }, cats, [
      entry('income', 150000, '2026-01-02'),
      entry('expense', 40000, '2026-01-03', 'c1'),
      entry('expense', 60000, '2026-01-04', 'c2'),
      entry('expense', 5000, '2026-01-05', null),
    ]);
    expect(s.funds).toBe(150000);
    expect(s.spent).toBe(105000);
    expect(s.remainingToSpend).toBe(95000);
    expect(s.cashBalance).toBe(45000);
    expect(s.allocatedTotal).toBe(150000);
    expect(s.unallocated).toBe(50000);
    expect(s.categories[0]).toMatchObject({ name: 'Transport', spent: 40000, remaining: 60000, status: 'ok' });
    expect(s.categories[1]).toMatchObject({ name: 'Fournitures', spent: 60000, remaining: -10000, status: 'over' });
    expect(s.uncategorized.spent).toBe(5000);
  });

  it('utilise les fonds reçus comme base quand aucun budget prévu', () => {
    const s = summarizeBudget({ target_amount: 0 }, [], [entry('income', 1000, '2026-01-01'), entry('expense', 900, '2026-01-02')]);
    expect(s.base).toBe(1000);
    expect(s.status).toBe('warning');
  });

  it('range une dépense dont la catégorie a été supprimée dans « sans catégorie »', () => {
    const s = summarizeBudget({ target_amount: 10 }, cats, [entry('expense', 5, '2026-01-02', 'inconnue')]);
    expect(s.uncategorized.spent).toBe(5);
  });

  it("évite les erreurs d'arrondi flottant", () => {
    const s = summarizeBudget({ target_amount: 1 }, [], [entry('expense', 0.1, '2026-01-01'), entry('expense', 0.2, '2026-01-01')]);
    expect(s.spent).toBe(0.3);
  });
});

describe('validation des dépenses', () => {
  const pendingEntry = (amount: number, status: 'pending' | 'rejected') => ({ ...entry('expense', amount, '2026-01-05'), status });

  it('ne compte que les écritures approuvées, et signale celles en attente', () => {
    const s = summarizeBudget({ target_amount: 1000 }, [], [
      entry('income', 800, '2026-01-01'),
      entry('expense', 100, '2026-01-02'),
      pendingEntry(300, 'pending'),
      pendingEntry(50, 'rejected'),
    ]);
    expect(s.spent).toBe(100);
    expect(s.cashBalance).toBe(700);
    expect(s.pendingCount).toBe(1);
    expect(s.pendingAmount).toBe(300);
    expect(s.rejectedCount).toBe(1);
  });

  it("le solde du journal ignore les écritures non approuvées, et la courbe aussi", () => {
    const entries = [entry('income', 100, '2026-01-01'), pendingEntry(40, 'pending'), entry('expense', 10, '2026-01-06')];
    expect(buildJournal(entries).map(l => l.balance)).toEqual([100, 100, 90]);
    expect(buildTimeline(entries).map(p => p.spent)).toEqual([0, 10]);
  });

  it('un statut absent (anciennes données) est traité comme approuvé', () => {
    const legacy = { ...entry('expense', 70, '2026-01-02') } as any;
    delete legacy.status;
    expect(summarizeBudget({ target_amount: 100 }, [], [legacy]).spent).toBe(70);
  });
});

describe('journal et courbe', () => {
  it('cumule le solde chronologiquement', () => {
    const lines = buildJournal([
      entry('expense', 30, '2026-01-03'),
      entry('income', 100, '2026-01-01'),
      entry('expense', 20, '2026-01-02'),
    ]);
    expect(lines.map(l => l.balance)).toEqual([100, 80, 50]);
  });

  it('construit la courbe cumulée', () => {
    const pts = buildTimeline([
      entry('income', 100, '2026-01-01'),
      entry('expense', 40, '2026-01-02'),
      entry('expense', 10, '2026-01-02'),
    ]);
    expect(pts).toEqual([
      { date: '2026-01-01', spent: 0, funds: 100, balance: 100 },
      { date: '2026-01-02', spent: 50, funds: 100, balance: 50 },
    ]);
  });
});

describe('usageStatus', () => {
  it('seuils', () => {
    expect(usageStatus(0, 0)).toBe('none');
    expect(usageStatus(10, 0)).toBe('over');
    expect(usageStatus(79, 100)).toBe('ok');
    expect(usageStatus(80, 100)).toBe('warning');
    expect(usageStatus(100, 100)).toBe('warning');
    expect(usageStatus(101, 100)).toBe('over');
  });
});

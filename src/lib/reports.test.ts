import { describe, it, expect } from 'vitest';
import { buildPeriodReport, periodRange, previousRange, variationPercent } from './reports';
import type { Project, ProjectCategory, ProjectTransaction } from '../types';

const project = (id: string, over: Partial<Project> = {}): Project => ({
  id, user_id: 'u', name: id, description: '', scope: 'professional', target_amount: 1000, color: '#000', icon: 'x',
  status: 'active', start_date: null, end_date: null, code: '', responsible: '', requires_approval: false, owner_email: '', created_at: '', ...over,
});
const cat = (id: string, project_id: string, name: string): ProjectCategory => ({
  id, project_id, user_id: 'u', name, allocated_amount: 0, color: '#000', sort_order: 0, created_at: '',
});
let n = 0;
const entry = (project_id: string, type: 'income' | 'expense', amount: number, date: string, category_id: string | null = null, status: 'approved' | 'pending' = 'approved'): ProjectTransaction => ({
  id: `e${n++}`, project_id, user_id: 'u', category_id, type, label: 'x', amount, date, payee: '', reference: '', payment_method: '',
  note: '', source_transaction_id: null, status, approved_by: null, approved_at: null, rejection_reason: '', created_by_email: '', created_at: '',
});

describe('périodes', () => {
  const now = new Date(2026, 4, 15); // 15 mai 2026
  it('bornes des périodes prédéfinies', () => {
    expect(periodRange('thisMonth', now)).toEqual({ from: '2026-05-01', to: '2026-05-31' });
    expect(periodRange('lastMonth', now)).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(periodRange('thisQuarter', now)).toEqual({ from: '2026-04-01', to: '2026-06-30' });
    expect(periodRange('thisYear', now)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(periodRange('lastYear', now)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(periodRange('lastMonth', new Date(2026, 0, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('la période précédente a la même durée', () => {
    expect(previousRange({ from: '2026-05-01', to: '2026-05-31' })).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(previousRange({ from: '2026-03-01', to: '2026-03-10' })).toEqual({ from: '2026-02-19', to: '2026-02-28' });
    expect(previousRange({ from: '2026-04-01', to: '2026-06-30' })).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(previousRange({ from: '2026-01-01', to: '2026-12-31' })).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('variation en pourcentage', () => {
    expect(variationPercent(150, 100)).toBe(50);
    expect(variationPercent(50, 100)).toBe(-50);
    expect(variationPercent(10, 0)).toBeNull();
  });
});

describe('rapport de période', () => {
  const projects = [project('p1', { target_amount: 1000 }), project('p2', { scope: 'personal', target_amount: 500 })];
  const categories = [cat('c1', 'p1', 'Transport'), cat('c2', 'p2', 'transport')];
  const entries = [
    entry('p1', 'income', 900, '2026-05-02'),
    entry('p1', 'expense', 100, '2026-05-05', 'c1'),
    entry('p1', 'expense', 40, '2026-04-20', 'c1'),
    entry('p1', 'expense', 300, '2026-05-06', 'c1', 'pending'),
    entry('p2', 'expense', 60, '2026-05-10', 'c2'),
    entry('p2', 'expense', 25, '2026-03-01'),
  ];
  const report = buildPeriodReport({ projects, categories, entries, range: { from: '2026-05-01', to: '2026-05-31' } });

  it('calcule la période, le cumul et la comparaison pour chaque budget', () => {
    const p1 = report.rows.find(r => r.projectId === 'p1')!;
    expect(p1).toMatchObject({ planned: 1000, funds: 900, spent: 100, spentPrev: 40, spentTotal: 140, remaining: 860, pending: 300 });
    const p2 = report.rows.find(r => r.projectId === 'p2')!;
    expect(p2).toMatchObject({ spent: 60, spentTotal: 85 });
  });

  it('les écritures en attente ne comptent pas dans les dépenses', () => {
    expect(report.totals.spent).toBe(160);
    expect(report.totals.pending).toBe(300);
  });

  it('regroupe les catégories de même nom (insensible à la casse) entre budgets', () => {
    const transport = report.categories.find(c => c.name.toLowerCase() === 'transport')!;
    expect(transport).toMatchObject({ spent: 160, spentPrev: 40, count: 2 });
  });

  it('totaux', () => {
    expect(report.totals).toMatchObject({ planned: 1500, funds: 900, spentTotal: 225, spentPrev: 40 });
  });
});

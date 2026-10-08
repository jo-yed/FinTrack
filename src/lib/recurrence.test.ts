import { describe, it, expect } from 'vitest';
import { planRecurrences, MAX_OCCURRENCES_PER_TEMPLATE } from './recurrence';
import type { Transaction } from '../types';

const template = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1', user_id: 'u', account_id: 'a1', type: 'expense', category: 'Logement', amount: 100000,
  description: 'Loyer', date: '2026-01-31', tags: [], family_member_id: null, is_recurring: true,
  recurrence_frequency: 'monthly', recurrence_parent_id: null, next_recurrence_date: '2026-02-28',
  created_at: '2026-01-31T00:00:00Z', ...over,
});

describe('planRecurrences', () => {
  it('rattrape toutes les échéances manquantes et garde le jour 31 comme ancrage', () => {
    const { children, advances } = planRecurrences([template()], '2026-05-10');
    expect(children.map(c => c.date)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(advances).toEqual([{ id: 't1', next: '2026-05-31' }]);
    expect(children.every(c => c.recurrence_parent_id === 't1' && c.is_recurring === false)).toBe(true);
  });

  it("ne crée rien si l'échéance est dans le futur", () => {
    const { children, advances } = planRecurrences([template({ next_recurrence_date: '2026-06-01' })], '2026-05-10');
    expect(children).toEqual([]);
    expect(advances).toEqual([]);
  });

  it('ignore les modèles incomplets ou désactivés', () => {
    const plan = planRecurrences([
      template({ recurrence_frequency: null }),
      template({ is_recurring: false }),
      template({ next_recurrence_date: null }),
    ], '2026-12-31');
    expect(plan.children).toEqual([]);
  });

  it('est plafonné pour une série très ancienne', () => {
    const { children } = planRecurrences([template({ recurrence_frequency: 'weekly', next_recurrence_date: '2000-01-01', date: '2000-01-01' })], '2026-12-31');
    expect(children).toHaveLength(MAX_OCCURRENCES_PER_TEMPLATE);
  });

  it('génère la même séquence si on rejoue (idempotence côté calcul)', () => {
    const a = planRecurrences([template()], '2026-05-10');
    const b = planRecurrences([template()], '2026-05-10');
    expect(a).toEqual(b);
  });
});

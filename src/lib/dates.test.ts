import { describe, it, expect } from 'vitest';
import { addPeriod, toLocalISO, parseLocalDate, monthKey } from './dates';

describe('dates', () => {
  it('toLocalISO ne décale pas le jour (pas de passage par UTC)', () => {
    expect(toLocalISO(new Date(2026, 9, 7, 0, 30))).toBe('2026-10-07');
    expect(toLocalISO(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  });

  it('parseLocalDate interprète la date à minuit local', () => {
    const d = parseLocalDate('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 1]);
  });

  it('addPeriod borne le jour au dernier jour du mois (31 janv. + 1 mois = 28 févr.)', () => {
    expect(addPeriod('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addPeriod('2028-01-31', 'monthly')).toBe('2028-02-29');
  });

  it('addPeriod conserve le jour d\'ancrage de la série', () => {
    expect(addPeriod('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
  });

  it('addPeriod hebdomadaire et annuel', () => {
    expect(addPeriod('2026-12-28', 'weekly')).toBe('2027-01-04');
    expect(addPeriod('2028-02-29', 'yearly')).toBe('2029-02-28');
  });

  it('monthKey', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01');
  });
});

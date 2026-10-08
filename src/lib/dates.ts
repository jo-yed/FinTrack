import type { RecurrenceFrequency } from '../types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date locale au format YYYY-MM-DD (sans décalage UTC, contrairement à toISOString). */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toLocalISO(new Date());
}

/** Clé de mois locale au format YYYY-MM. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Interprète une date YYYY-MM-DD comme minuit LOCAL (et non UTC). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Date de la prochaine échéance. Le jour du mois est borné au dernier jour du mois cible
 * (31 janvier + 1 mois = 28/29 février, jamais début mars).
 * `anchorDay` permet de conserver le jour d'origine d'une série (ex. le 31) après un mois court.
 */
export function addPeriod(fromISO: string, frequency: RecurrenceFrequency, anchorDay?: number): string {
  const d = parseLocalDate(fromISO);
  const day = anchorDay ?? d.getDate();

  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return toLocalISO(d);
  }

  if (frequency === 'monthly') {
    const target = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
    return toLocalISO(target);
  }

  const target = new Date(d.getFullYear() + 1, d.getMonth(), 1);
  target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
  return toLocalISO(target);
}

export function formatDateShort(iso: string, locale: string): string {
  return parseLocalDate(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

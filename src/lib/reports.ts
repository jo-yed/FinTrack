import { isCounted, round2, summarizeBudget } from './budgets';
import { parseLocalDate, toLocalISO } from './dates';
import type { Project, ProjectCategory, ProjectTransaction } from '../types';

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

export function periodRange(preset: Exclude<PeriodPreset, 'custom'>, now: Date = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'thisMonth':
      return { from: toLocalISO(new Date(y, m, 1)), to: toLocalISO(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: toLocalISO(new Date(y, m - 1, 1)), to: toLocalISO(new Date(y, m, 0)) };
    case 'thisQuarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: toLocalISO(new Date(y, q, 1)), to: toLocalISO(new Date(y, q + 3, 0)) };
    }
    case 'thisYear':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'lastYear':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
}

/**
 * Période précédente à comparer : pour des mois entiers (un mois, un trimestre, une année…),
 * les mêmes mois juste avant ; sinon une période de même durée.
 */
export function previousRange(range: DateRange): DateRange {
  const from = parseLocalDate(range.from);
  const to = parseLocalDate(range.to);
  const endOfMonth = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();

  if (from.getDate() === 1 && to.getDate() === endOfMonth) {
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
    const prevFrom = new Date(from.getFullYear(), from.getMonth() - months, 1);
    const prevTo = new Date(from.getFullYear(), from.getMonth(), 0);
    return { from: toLocalISO(prevFrom), to: toLocalISO(prevTo) };
  }

  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: toLocalISO(prevFrom), to: toLocalISO(prevTo) };
}

const inRange = (date: string, r: DateRange) => date >= r.from && date <= r.to;

export interface BudgetPeriodRow {
  projectId: string;
  name: string;
  scope: Project['scope'];
  code: string;
  status: Project['status'];
  /** Budget prévu (total du budget). */
  planned: number;
  funds: number;
  spent: number;
  spentPrev: number;
  /** Dépensé depuis l'ouverture du budget. */
  spentTotal: number;
  /** Reste à dépenser (cumul) par rapport à la base du budget. */
  remaining: number;
  progress: number;
  pending: number;
}

export interface CategoryPeriodRow {
  name: string;
  spent: number;
  spentPrev: number;
  count: number;
}

export interface PeriodReport {
  range: DateRange;
  previous: DateRange;
  rows: BudgetPeriodRow[];
  categories: CategoryPeriodRow[];
  totals: { planned: number; funds: number; spent: number; spentPrev: number; spentTotal: number; remaining: number; pending: number };
}

interface ReportInput {
  projects: Project[];
  categories: ProjectCategory[];
  entries: ProjectTransaction[];
  range: DateRange;
}

export function buildPeriodReport({ projects, categories, entries, range }: ReportInput): PeriodReport {
  const previous = previousRange(range);
  const catById = new Map(categories.map(c => [c.id, c]));
  const catAgg = new Map<string, CategoryPeriodRow>();

  const rows: BudgetPeriodRow[] = projects.map(project => {
    const own = entries.filter(e => e.project_id === project.id);
    const counted = own.filter(isCounted);
    const sum = (list: ProjectTransaction[], type: 'income' | 'expense', r: DateRange) =>
      round2(list.filter(e => e.type === type && inRange(e.date, r)).reduce((s, e) => s + e.amount, 0));

    const summary = summarizeBudget(project, categories.filter(c => c.project_id === project.id), own);

    counted.filter(e => e.type === 'expense').forEach(e => {
      const name = (e.category_id && catById.get(e.category_id)?.name) || '';
      const key = name.toLowerCase();
      const cur = catAgg.get(key) || { name, spent: 0, spentPrev: 0, count: 0 };
      if (inRange(e.date, range)) { cur.spent += e.amount; cur.count += 1; }
      if (inRange(e.date, previous)) cur.spentPrev += e.amount;
      catAgg.set(key, cur);
    });

    return {
      projectId: project.id,
      name: project.name,
      scope: project.scope,
      code: project.code,
      status: project.status,
      planned: summary.target,
      funds: sum(counted, 'income', range),
      spent: sum(counted, 'expense', range),
      spentPrev: sum(counted, 'expense', previous),
      spentTotal: summary.spent,
      remaining: summary.remainingToSpend,
      progress: summary.progress,
      pending: summary.pendingAmount,
    };
  });

  const total = (pick: (r: BudgetPeriodRow) => number) => round2(rows.reduce((s, r) => s + pick(r), 0));

  return {
    range,
    previous,
    rows,
    categories: [...catAgg.values()]
      .filter(c => c.spent > 0 || c.spentPrev > 0)
      .map(c => ({ ...c, spent: round2(c.spent), spentPrev: round2(c.spentPrev) }))
      .sort((a, b) => b.spent - a.spent),
    totals: {
      planned: total(r => r.planned),
      funds: total(r => r.funds),
      spent: total(r => r.spent),
      spentPrev: total(r => r.spentPrev),
      spentTotal: total(r => r.spentTotal),
      remaining: total(r => r.remaining),
      pending: total(r => r.pending),
    },
  };
}

/** Variation en % entre deux montants ; null si la base de comparaison est nulle. */
export function variationPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

import type { Project, ProjectCategory, ProjectTransaction } from '../types';

export const WARNING_THRESHOLD = 80;

/** Catégorie de la transaction « principale » générée quand on décaisse depuis un compte vers un budget. */
export const BUDGET_TX_CATEGORY = 'Budgets activités';

export type UsageStatus = 'none' | 'ok' | 'warning' | 'over';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function usageStatus(spent: number, allocated: number): UsageStatus {
  if (allocated <= 0) return spent > 0 ? 'over' : 'none';
  const progress = (spent / allocated) * 100;
  if (progress > 100) return 'over';
  if (progress >= WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

export interface CategorySummary {
  /** null = lignes sans catégorie */
  id: string | null;
  name: string;
  color: string;
  allocated: number;
  spent: number;
  remaining: number;
  progress: number;
  count: number;
  status: UsageStatus;
}

export interface BudgetSummary {
  /** Fonds réellement reçus dans le budget (décaissements). */
  funds: number;
  /** Total dépensé. */
  spent: number;
  /** Budget prévu (plafond que l'on s'est fixé). */
  target: number;
  /** Base de référence de la jauge : budget prévu, ou à défaut les fonds reçus. */
  base: number;
  /** Reste à dépenser par rapport à la base. */
  remainingToSpend: number;
  /** Argent encore disponible en caisse = fonds reçus − dépenses. */
  cashBalance: number;
  /** Pourcentage de la base consommé. */
  progress: number;
  /** Somme des montants prévus par catégorie. */
  allocatedTotal: number;
  /** Budget prévu non encore réparti entre les catégories (négatif = sur-réparti). */
  unallocated: number;
  status: UsageStatus;
  categories: CategorySummary[];
  uncategorized: CategorySummary;
  expenseCount: number;
  fundingCount: number;
}

export function summarizeBudget(
  project: Pick<Project, 'target_amount'>,
  categories: ProjectCategory[],
  entries: ProjectTransaction[],
): BudgetSummary {
  const funds = round2(entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0));
  const expenses = entries.filter(e => e.type === 'expense');
  const spent = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const target = round2(project.target_amount || 0);
  const base = target > 0 ? target : funds;

  const spentByCat = new Map<string | null, { spent: number; count: number }>();
  expenses.forEach(e => {
    const key = e.category_id && categories.some(c => c.id === e.category_id) ? e.category_id : null;
    const cur = spentByCat.get(key) || { spent: 0, count: 0 };
    cur.spent += e.amount;
    cur.count += 1;
    spentByCat.set(key, cur);
  });

  const catSummaries: CategorySummary[] = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map(c => {
      const agg = spentByCat.get(c.id) || { spent: 0, count: 0 };
      const catSpent = round2(agg.spent);
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        allocated: c.allocated_amount,
        spent: catSpent,
        remaining: round2(c.allocated_amount - catSpent),
        progress: c.allocated_amount > 0 ? (catSpent / c.allocated_amount) * 100 : catSpent > 0 ? 100 : 0,
        count: agg.count,
        status: usageStatus(catSpent, c.allocated_amount),
      };
    });

  const unc = spentByCat.get(null) || { spent: 0, count: 0 };
  const uncategorized: CategorySummary = {
    id: null,
    name: '',
    color: '#9CA3AF',
    allocated: 0,
    spent: round2(unc.spent),
    remaining: round2(-unc.spent),
    progress: 0,
    count: unc.count,
    status: 'none',
  };

  const allocatedTotal = round2(categories.reduce((s, c) => s + c.allocated_amount, 0));

  return {
    funds,
    spent,
    target,
    base,
    remainingToSpend: round2(base - spent),
    cashBalance: round2(funds - spent),
    progress: base > 0 ? (spent / base) * 100 : spent > 0 ? 100 : 0,
    allocatedTotal,
    unallocated: round2(target - allocatedTotal),
    status: base > 0 ? usageStatus(spent, base) : spent > 0 ? 'over' : 'none',
    categories: catSummaries,
    uncategorized,
    expenseCount: expenses.length,
    fundingCount: entries.length - expenses.length,
  };
}

export interface JournalLine {
  entry: ProjectTransaction;
  /** Solde de caisse après cette écriture. */
  balance: number;
}

/** Journal de caisse chronologique avec solde cumulé (utile pour le comptable). */
export function buildJournal(entries: ProjectTransaction[]): JournalLine[] {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
  );
  let balance = 0;
  return sorted.map(entry => {
    balance = round2(balance + (entry.type === 'income' ? entry.amount : -entry.amount));
    return { entry, balance };
  });
}

export interface TimelinePoint {
  date: string;
  spent: number;
  funds: number;
  balance: number;
}

/** Courbe cumulée dépenses / fonds par jour. */
export function buildTimeline(entries: ProjectTransaction[]): TimelinePoint[] {
  const byDate = new Map<string, { spent: number; funds: number }>();
  entries.forEach(e => {
    const cur = byDate.get(e.date) || { spent: 0, funds: 0 };
    if (e.type === 'expense') cur.spent += e.amount;
    else cur.funds += e.amount;
    byDate.set(e.date, cur);
  });
  let spent = 0;
  let funds = 0;
  return [...byDate.keys()].sort().map(date => {
    const d = byDate.get(date)!;
    spent += d.spent;
    funds += d.funds;
    return { date, spent: round2(spent), funds: round2(funds), balance: round2(funds - spent) };
  });
}

/** Suggestions de catégories pour démarrer vite (modifiables ensuite). */
export const SUGGESTED_CATEGORIES: Record<'personal' | 'professional' | 'family', { fr: string[]; en: string[] }> = {
  personal: {
    fr: ['Transport', 'Alimentation', 'Santé', 'Loisirs', 'Vêtements', 'Imprévus'],
    en: ['Transport', 'Food', 'Health', 'Leisure', 'Clothing', 'Contingency'],
  },
  professional: {
    fr: ['Déplacements', 'Fournitures', 'Honoraires', 'Communication', 'Équipement', 'Hébergement', 'Imprévus'],
    en: ['Travel', 'Supplies', 'Fees', 'Communication', 'Equipment', 'Accommodation', 'Contingency'],
  },
  family: {
    fr: ['Logistique', 'Cadeaux', 'Restauration', 'Imprévus'],
    en: ['Logistics', 'Gifts', 'Catering', 'Contingency'],
  },
};

export const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

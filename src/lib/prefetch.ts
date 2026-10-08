import { allowedPages } from './navigation';
import type { Profile } from './navigation';
import type { PageId } from '../types';

/** Chargeurs des pages (mêmes modules que les import() paresseux de l'application : le navigateur les réutilise). */
const LOADERS: Partial<Record<PageId, () => Promise<unknown>>> = {
  dashboard: () => import('../components/Dashboard/Dashboard'),
  transactions: () => import('../components/Transactions/TransactionList'),
  accounts: () => import('../components/Accounts/AccountList'),
  reports: () => import('../components/Reports/Reports'),
  goals: () => import('../components/Goals/GoalList'),
  activities: () => import('../components/Activities/ActivityBudgets'),
  family: () => import('../components/Family/FamilyList'),
  budgets: () => import('../components/Budgets/BudgetList'),
  vault: () => import('../components/Vault/VaultList'),
  settings: () => import('../components/Settings/Settings'),
  myspace: () => import('../components/Member/MySpace'),
  admin: () => import('../components/Admin/AdminConsole'),
};

interface NetworkInformation { saveData?: boolean; effectiveType?: string }

/** Pas de préchargement en mode économie de données ou sur une connexion très lente. */
function connectionIsPoor(): boolean {
  const c = (navigator as unknown as { connection?: NetworkInformation }).connection;
  return Boolean(c && (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g'));
}

/**
 * Charge discrètement les pages autorisées, une par une, quand le navigateur est au repos.
 * Renvoie une fonction qui annule les chargements restants.
 */
export function prefetchPages(profile: Profile): () => void {
  if (typeof window === 'undefined' || connectionIsPoor()) return () => undefined;
  const queue = allowedPages(profile).filter(p => LOADERS[p]);
  let cancelled = false;
  let timer = 0;

  const idle = (cb: () => void) => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(cb, { timeout: 4000 });
    else window.setTimeout(cb, 1200);
  };

  const next = () => {
    if (cancelled) return;
    const page = queue.shift();
    if (!page) return;
    LOADERS[page]!().catch(() => undefined).finally(() => idle(next));
  };
  timer = window.setTimeout(() => idle(next), 1500);

  return () => { cancelled = true; window.clearTimeout(timer); };
}

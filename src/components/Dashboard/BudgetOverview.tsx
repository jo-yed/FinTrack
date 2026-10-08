import React, { useMemo } from 'react';
import { Briefcase, Users, ArrowRight, Plus } from 'lucide-react';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useTransactions } from '../../hooks/useTransactions';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import { monthKey } from '../../lib/dates';
import { round2 } from '../../lib/budgets';
import type { PageId } from '../../types';
import { ProgressBar } from '../Activities/shared';
import type { UsageStatus } from '../../lib/budgets';

interface Props {
  onNavigate: (page: PageId, param?: string | null) => void;
}

function status(progress: number, hasBase: boolean, spent: number): UsageStatus {
  if (!hasBase) return spent > 0 ? 'over' : 'none';
  if (progress > 100) return 'over';
  if (progress >= 80) return 'warning';
  return 'ok';
}

/** Les deux familles de budgets côte à côte : Famille (rose) et Perso & Pro (violet). */
export const BudgetOverview: React.FC<Props> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { members } = useFamilyMembers();
  const { transactions } = useTransactions();
  const { projects, summaries } = useActivityBudgets();

  const family = useMemo(() => {
    const month = monthKey();
    const ids = new Set(members.map(m => m.id));
    const spent = transactions
      .filter(tx => tx.type === 'expense' && tx.family_member_id && ids.has(tx.family_member_id) && tx.date.startsWith(month))
      .reduce((s, tx) => s + tx.amount, 0);
    const allocated = members.reduce((s, m) => s + (m.monthly_allowance || 0), 0);
    const progress = allocated > 0 ? (spent / allocated) * 100 : 0;
    return { spent: round2(spent), allocated: round2(allocated), left: round2(allocated - spent), progress };
  }, [members, transactions]);

  const activities = useMemo(() => {
    const active = projects.filter(p => p.status === 'active' && p.scope !== 'family');
    const sum = (scope: 'personal' | 'professional') => {
      const list = active.filter(p => p.scope === scope);
      return {
        count: list.length,
        spent: round2(list.reduce((s, p) => s + (summaries[p.id]?.spent ?? 0), 0)),
        left: round2(list.reduce((s, p) => s + (summaries[p.id]?.remainingToSpend ?? 0), 0)),
      };
    };
    const base = round2(active.reduce((s, p) => s + (summaries[p.id]?.base ?? 0), 0));
    const spent = round2(active.reduce((s, p) => s + (summaries[p.id]?.spent ?? 0), 0));
    return {
      count: active.length,
      base,
      spent,
      left: round2(base - spent),
      progress: base > 0 ? (spent / base) * 100 : 0,
      personal: sum('personal'),
      professional: sum('professional'),
    };
  }, [projects, summaries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Budget Famille */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 p-6 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('activities.dashboard.family')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('activities.dashboard.familyDesc')}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{members.length} {t('activities.dashboard.familyMembers')}</span>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">{t('activities.dashboard.familyEmpty')}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Figure label={t('activities.dashboard.familyAllocated')} value={formatCurrency(family.allocated)} />
                <Figure label={t('activities.dashboard.familySpent')} value={formatCurrency(family.spent)} tone="text-rose-600 dark:text-rose-400" />
                <Figure label={t('activities.dashboard.familyLeft')} value={formatCurrency(family.left)} tone={family.left < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
              </div>
              {family.allocated > 0 && <ProgressBar progress={family.progress} status={status(family.progress, true, family.spent)} />}
            </>
          )}

          <button onClick={() => onNavigate('family')} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline">
            {t('activities.dashboard.openFamily')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Budgets Perso & Pro */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-violet-200/70 dark:border-violet-900/40 p-6 relative overflow-hidden animate-slide-up" style={{ animationDelay: '60ms' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('activities.dashboard.activities')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('activities.dashboard.activitiesDesc')}</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{activities.count} {t('activities.dashboard.activeCount')}</span>
          </div>

          {activities.count === 0 ? (
            <div className="py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('activities.dashboard.activitiesEmpty')}</p>
              <button onClick={() => onNavigate('activities')} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/20">
                <Plus className="w-4 h-4" /> {t('activities.add')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Figure label={t('activities.planned')} value={formatCurrency(activities.base)} />
                <Figure label={t('activities.spent')} value={formatCurrency(activities.spent)} tone="text-violet-600 dark:text-violet-400" />
                <Figure label={t('activities.remaining')} value={formatCurrency(activities.left)} tone={activities.left < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
              </div>
              {activities.base > 0 && <ProgressBar progress={activities.progress} status={status(activities.progress, true, activities.spent)} />}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Line dot="bg-blue-500" label={`${t('activities.dashboard.personalLine')} (${activities.personal.count})`} spent={formatCurrency(activities.personal.spent)} />
                <Line dot="bg-violet-500" label={`${t('activities.dashboard.professionalLine')} (${activities.professional.count})`} spent={formatCurrency(activities.professional.spent)} />
              </div>
            </>
          )}

          {activities.count > 0 && (
            <button onClick={() => onNavigate('activities')} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
              {t('activities.dashboard.openActivities')} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Figure: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-gray-900 dark:text-white' }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
    <p className={`text-base sm:text-lg font-bold ${tone} break-words`}>{value}</p>
  </div>
);

const Line: React.FC<{ dot: string; label: string; spent: string }> = ({ dot, label, spent }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
    <span className={`w-2 h-2 rounded-full ${dot}`} />
    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">{label}</span>
    <span className="text-xs font-semibold text-gray-900 dark:text-white">{spent}</span>
  </div>
);

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, AlertTriangle } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { TransactionChart } from './TransactionChart';
import { CategoryChart } from './CategoryChart';
import { RecentTransactions } from './RecentTransactions';
import { FinancialGoals } from './FinancialGoals';
import { BudgetOverview } from './BudgetOverview';
import { useTransactions } from '../../hooks/useTransactions';
import { useGoals } from '../../hooks/useGoals';
import { useBudgets } from '../../hooks/useBudgets';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { monthKey } from '../../lib/dates';
import { getBudgetAlertsEnabled } from '../../lib/prefs';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { PageId } from '../../types';

interface DashboardProps {
  onNavigate: (page: PageId, param?: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { transactions, loading } = useTransactions();
  const { goals } = useGoals();
  const { budgets } = useBudgets();
  const { projects, summaries } = useActivityBudgets();

  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [transactions]);

  const budgetAlerts = useMemo(() => {
    const monthStr = monthKey();
    const spending: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr))
      .forEach(tx => { spending[tx.category] = (spending[tx.category] || 0) + tx.amount; });

    const alerts: { key: string; label: string; spent: number; limit: number; progress: number; page: PageId; param?: string }[] = [];
    budgets.forEach(b => {
      const spent = spending[b.category] || 0;
      const progress = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
      if (progress >= 80) {
        alerts.push({ key: `m-${b.id}`, label: b.category, spent, limit: b.limit_amount, progress, page: 'budgets' });
      }
    });

    // Catégories des budgets Perso & Pro proches de leur plafond ou dépassées
    projects.filter(p => p.status === 'active' && p.scope !== 'family').forEach(p => {
      summaries[p.id]?.categories.forEach(c => {
        if (c.allocated > 0 && c.progress >= 80) {
          alerts.push({ key: `a-${c.id}`, label: `${p.name} › ${c.name}`, spent: c.spent, limit: c.allocated, progress: c.progress, page: 'activities', param: p.id });
        }
      });
    });
    return getBudgetAlertsEnabled() ? alerts.sort((a, b) => b.progress - a.progress) : [];
  }, [transactions, budgets, projects, summaries]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl shimmer-bg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl shimmer-bg" />
          <div className="h-80 rounded-2xl shimmer-bg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.overview')}</p>
        </div>
        <button
          onClick={() => onNavigate('transactions')}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('transactions.add')}
        </button>
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2 animate-slide-up">
          {budgetAlerts.map(alert => {
            const isOver = alert.progress > 100;
            return (
              <button
                key={alert.key}
                onClick={() => onNavigate(alert.page, alert.param)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  isOver
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOver ? 'bg-red-500' : 'bg-amber-500'}`}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isOver
                      ? `${alert.label} — ${t('dashboard.budgetOverrun')}`
                      : `${alert.label} — ${t('dashboard.budgetWarning')}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatCurrency(alert.spent)} / {formatCurrency(alert.limit)} • {Math.round(alert.progress)}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Budget Famille & Budgets Perso/Pro, côte à côte */}
      <BudgetOverview onNavigate={onNavigate} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('dashboard.totalIncome')}
          value={formatCurrency(stats.totalIncome)}
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          delay={0}
        />
        <StatsCard
          title={t('dashboard.totalExpenses')}
          value={formatCurrency(stats.totalExpenses)}
          icon={<TrendingDown className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          delay={50}
        />
        <StatsCard
          title={t('dashboard.balance')}
          value={formatCurrency(stats.balance)}
          icon={<Wallet className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={100}
        />
        <StatsCard
          title={t('dashboard.savingsRate')}
          value={`${stats.savingsRate.toFixed(1)}%`}
          icon={<PiggyBank className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          delay={150}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionChart transactions={transactions} />
        </div>
        <div>
          <CategoryChart transactions={transactions} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={transactions} onViewAll={() => onNavigate('transactions')} />
        </div>
        <div>
          <FinancialGoals goals={goals} />
        </div>
      </div>
    </div>
  );
};

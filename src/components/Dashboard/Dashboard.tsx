import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { TransactionChart } from './TransactionChart';
import { CategoryChart } from './CategoryChart';
import { RecentTransactions } from './RecentTransactions';
import { FinancialGoals } from './FinancialGoals';
import { useTransactions } from '../../hooks/useTransactions';
import { useGoals } from '../../hooks/useGoals';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { PageId } from '../../types';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { transactions, loading } = useTransactions();
  const { goals } = useGoals();

  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [transactions]);

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

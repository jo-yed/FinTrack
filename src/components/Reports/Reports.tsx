import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar, DollarSign, Activity, PieChart as PieIcon } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';

type Period = 'month' | 'quarter' | 'year';

export const Reports: React.FC = () => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { transactions, loading } = useTransactions();
  const [period, setPeriod] = useState<Period>('month');

  const now = new Date();

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (period === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        return txDate.getMonth() >= qStart && txDate.getMonth() <= qStart + 2 && txDate.getFullYear() === now.getFullYear();
      }
      return txDate.getFullYear() === now.getFullYear();
    });
  }, [transactions, period]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const txCount = filteredTransactions.length;
    const avgTx = txCount > 0 ? (income + expenses) / txCount : 0;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    return { income, expenses, balance, txCount, avgTx, savingsRate };
  }, [filteredTransactions]);

  const previousStats = useMemo(() => {
    let prevTransactions: typeof transactions;
    if (period === 'month') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      prevTransactions = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    } else if (period === 'quarter') {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      const prevQStart = qStart - 3;
      prevTransactions = transactions.filter(tx => {
        const d = new Date(tx.date);
        const m = d.getMonth();
        return prevQStart >= 0
          ? m >= prevQStart && m <= prevQStart + 2 && d.getFullYear() === now.getFullYear()
          : m >= 9 && d.getFullYear() === now.getFullYear() - 1;
      });
    } else {
      prevTransactions = transactions.filter(tx => new Date(tx.date).getFullYear() === now.getFullYear() - 1);
    }
    const income = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses };
  }, [transactions, period]);

  const incomeChange = previousStats.income > 0 ? ((stats.income - previousStats.income) / previousStats.income) * 100 : 0;
  const expenseChange = previousStats.expenses > 0 ? ((stats.expenses - previousStats.expenses) / previousStats.expenses) * 100 : 0;

  const monthlyComparison = useMemo(() => {
    const months = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
    const labels = lang === 'fr'
      ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data: { month: string; income: number; expenses: number; balance: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTx = transactions.filter(tx => tx.date.startsWith(monthKey));
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      data.push({ month: labels[d.getMonth()], income, expenses, balance: income - expenses });
    }
    return data;
  }, [transactions, period, lang]);

  const categoryRadar = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    const maxVal = Math.max(...Object.values(totals), 1);
    return Object.entries(totals).map(([category, amount]) => ({
      category,
      amount,
      percent: Math.round((amount / maxVal) * 100),
    }));
  }, [filteredTransactions]);

  const dailyFlow = useMemo(() => {
    const days = period === 'month' ? now.getDate() : period === 'quarter' ? 90 : 365;
    const data: { day: string; flow: number; cumulative: number }[] = [];
    let cumulative = 0;
    const step = days > 30 ? Math.ceil(days / 30) : 1;
    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayTx = transactions.filter(tx => tx.date === dateKey);
      const flow = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
      cumulative += flow;
      data.push({
        day: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: period === 'year' ? 'short' : undefined }),
        flow,
        cumulative,
      });
    }
    return data;
  }, [transactions, period, lang]);

  const topTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [filteredTransactions]);

  const periodLabels = lang === 'fr'
    ? { month: 'Ce Mois', quarter: 'Ce Trimestre', year: 'Cette Année' }
    : { month: 'This Month', quarter: 'This Quarter', year: 'This Year' };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 rounded-xl shimmer-bg w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl shimmer-bg" />)}
        </div>
        <div className="h-96 rounded-2xl shimmer-bg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('reports.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {(['month', 'quarter', 'year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${period === p ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards with comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportStatCard
          title={t('reports.income')}
          value={formatCurrency(stats.income)}
          change={incomeChange}
          icon={<ArrowDownRight className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          delay={0}
        />
        <ReportStatCard
          title={t('reports.expenses')}
          value={formatCurrency(stats.expenses)}
          change={expenseChange}
          icon={<ArrowUpRight className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          delay={50}
          invertChange
        />
        <ReportStatCard
          title={t('reports.balance')}
          value={formatCurrency(stats.balance)}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={100}
        />
        <ReportStatCard
          title={t('reports.avgTransaction')}
          value={formatCurrency(stats.avgTx)}
          icon={<Activity className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          delay={150}
        />
      </div>

      {/* Cash flow chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('reports.cashFlow')}</h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-500 dark:text-gray-400">{t('reports.cumulative')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-500 dark:text-gray-400">{t('reports.dailyFlow')}</span>
            </div>
          </div>
        </div>
        {dailyFlow.length > 0 && dailyFlow.some(d => d.flow !== 0 || d.cumulative !== 0) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyFlow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorCumulative)" />
                <Area type="monotone" dataKey="flow" stroke="#10B981" strokeWidth={2} fill="url(#colorFlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">{t('common.noData')}</div>
        )}
      </div>

      {/* Two column: Monthly comparison + Category radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">{t('reports.monthlyComparison')}</h3>
          {monthlyComparison.some(m => m.income > 0 || m.expenses > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} name={t('reports.income')} />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[6, 6, 0, 0]} name={t('reports.expenses')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">{t('common.noData')}</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">{t('reports.categoryRadar')}</h3>
          {categoryRadar.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryRadar}>
                  <PolarGrid stroke="#e5e7eb" strokeOpacity={0.3} />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Radar name="Expenses" dataKey="amount" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </div>

      {/* Top transactions + Savings rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('reports.topTransactions')}</h3>
          {topTransactions.length > 0 ? (
            <div className="space-y-2">
              {topTransactions.map((tx, i) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{tx.category} • {new Date(tx.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-600">{t('common.noData')}</div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white animate-slide-up overflow-hidden relative" style={{ animationDelay: '300ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-5 h-5" />
              <h3 className="text-base font-semibold">{t('reports.savingsRate')}</h3>
            </div>
            <div className="flex items-center justify-center my-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.max(stats.savingsRate, 0) / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold">{Math.round(stats.savingsRate)}%</span>
                  <span className="text-xs text-blue-200">{t('reports.saved')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-200">{t('reports.income')}</span>
                <span className="font-semibold">{formatCurrency(stats.income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">{t('reports.expenses')}</span>
                <span className="font-semibold">{formatCurrency(stats.expenses)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/20">
                <span className="text-blue-200">{t('reports.savedAmount')}</span>
                <span className="font-bold text-lg">{formatCurrency(stats.balance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReportStatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
  invertChange?: boolean;
}

const ReportStatCard: React.FC<ReportStatCardProps> = ({ title, value, change, icon, gradient, delay = 0, invertChange }) => {
  const isPositive = change !== undefined && change > 0;
  const isGood = invertChange ? !isPositive : isPositive;

  return (
    <div
      className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${gradient}`} />
      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient} shadow-md`}>
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isGood ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="relative">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
};

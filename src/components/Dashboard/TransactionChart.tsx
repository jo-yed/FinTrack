import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRegion } from '../../hooks/useRegion';
import type { Transaction } from '../../types';

interface TransactionChartProps {
  transactions: Transaction[];
}

export const TransactionChart: React.FC<TransactionChartProps> = ({ transactions }) => {
  const { formatCurrency } = useRegion();

  const monthlyData = useMemo(() => {
    const months: { label: string; key: string }[] = [
      { label: 'Jan', key: '01' },
      { label: 'Fév', key: '02' },
      { label: 'Mar', key: '03' },
      { label: 'Avr', key: '04' },
      { label: 'Mai', key: '05' },
      { label: 'Juin', key: '06' },
      { label: 'Juil', key: '07' },
      { label: 'Août', key: '08' },
      { label: 'Sep', key: '09' },
      { label: 'Oct', key: '10' },
      { label: 'Nov', key: '11' },
      { label: 'Déc', key: '12' },
    ];

    return months.map(({ label, key }) => {
      const monthTransactions = transactions.filter(t => {
        const month = t.date.substring(5, 7);
        return month === key;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return { month: label, income, expenses };
    });
  }, [transactions]);

  const hasData = transactions.length > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Évolution Mensuelle</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-500 dark:text-gray-400">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-500 dark:text-gray-400">Dépenses</span>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2.5} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
          Aucune donnée à afficher
        </div>
      )}
    </div>
  );
};

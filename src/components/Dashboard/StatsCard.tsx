import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon, gradient, delay = 0 }) => {
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
        {change && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
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

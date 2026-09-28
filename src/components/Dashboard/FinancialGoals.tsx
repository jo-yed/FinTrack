import React from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Goal } from '../../types';

interface FinancialGoalsProps {
  goals: Goal[];
}

export const FinancialGoals: React.FC<FinancialGoalsProps> = ({ goals }) => {
  const { formatCurrency } = useRegion();
  const { t, lang } = useLanguage();

  if (goals.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('dashboard.financialGoals')}</h3>
        </div>
        <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-600">
          {t('dashboard.noGoals')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('dashboard.financialGoals')}</h3>
      </div>

      <div className="space-y-4">
        {goals.slice(0, 3).map((goal) => {
          const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={goal.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{goal.category}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${goal.color || '#3B82F6'}, ${goal.color || '#10B981'})`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </span>
                {daysLeft !== null && (
                  <span className={`font-medium ${daysLeft > 0 ? 'text-gray-400 dark:text-gray-500' : 'text-red-500'}`}>
                    {daysLeft > 0 ? `${daysLeft} ${t('dashboard.daysLeft')}` : t('dashboard.overdue')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

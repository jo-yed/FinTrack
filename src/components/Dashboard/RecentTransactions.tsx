import React from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Transaction } from '../../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, onViewAll }) => {
  const { formatCurrency } = useRegion();
  const { lang } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up" style={{ animationDelay: '150ms' }}>
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Transactions Récentes</h3>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:gap-2 transition-all font-medium"
        >
          Voir tout
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-600">
            Aucune transaction pour le moment
          </div>
        ) : (
          transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'income'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {tx.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{tx.category}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${
                  tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(tx.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

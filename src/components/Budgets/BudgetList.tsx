import React, { useState, useMemo } from 'react';
import { Wallet, Plus, Edit, Trash2, X, AlertCircle, TrendingDown, Check } from 'lucide-react';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { useRegion } from '../../hooks/useRegion';
import { useCategories } from '../../hooks/useCategories';
import { monthKey } from '../../lib/dates';
import { useLanguage } from '../../i18n';
import type { Budget } from '../../types';

export const BudgetList: React.FC = () => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { budgets, loading, addBudget, updateBudget, deleteBudget } = useBudgets();
  const { transactions } = useTransactions();

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMonthStr = useMemo(() => monthKey(), []);

  const spendingByCategory = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(currentMonthStr))
      .forEach(tx => {
        spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
      });
    return spending;
  }, [transactions, currentMonthStr]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (spendingByCategory[b.category] || 0), 0);
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('budgets.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('budgets.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingBudget(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('budgets.add')}
        </button>
      </div>

      {/* Overall progress card */}
      {budgets.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 text-white animate-slide-up overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">{t('budgets.totalBudget')}</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">{t('budgets.totalSpent')}</p>
              <p className={`text-3xl font-bold ${totalProgress > 100 ? 'text-red-400' : 'text-amber-400'}`}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${totalProgress > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
                style={{ width: `${Math.min(totalProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{Math.round(totalProgress)}% {t('budgets.used')}</span>
              <span>{formatCurrency(Math.max(totalBudget - totalSpent, 0))} {t('budgets.remaining')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-48 rounded-2xl shimmer-bg" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('budgets.empty')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('budgets.emptyDesc')}</p>
          <button
            onClick={() => { setEditingBudget(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('budgets.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, index) => {
            const spent = spendingByCategory[budget.category] || 0;
            const progress = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
            const isOver = progress > 100;
            const isWarning = progress > 80 && progress <= 100;
            const remaining = budget.limit_amount - spent;

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover group animate-slide-up overflow-hidden relative"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                      {isOver ? <TrendingDown className="w-5 h-5 text-white" /> : <Wallet className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{budget.category}</h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{t('budgets.monthlyLimit')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingBudget(budget); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(budget.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative mb-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(spent)}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">/ {formatCurrency(budget.limit_amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isWarning ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="relative flex items-center justify-between text-xs">
                  <span className={`font-medium ${isOver ? 'text-red-500' : remaining < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {isOver
                      ? `${formatCurrency(Math.abs(remaining))} ${t('budgets.overdraft')}`
                      : `${formatCurrency(remaining)} ${t('budgets.remaining')}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${isOver ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : isWarning ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BudgetModal
          editingBudget={editingBudget}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingBudget) {
                await updateBudget(editingBudget.id, data);
              } else {
                await addBudget(data);
              }
              setShowModal(false);
            } catch (err: any) {
              setError(err.message);
            }
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-1">{t('budgets.deleteConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (deleteId) {
                    try { await deleteBudget(deleteId); } catch (err: any) { setError(err.message); }
                  }
                  setDeleteId(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 right-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-lg animate-slide-up max-w-sm z-50">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

interface BudgetModalProps {
  editingBudget: Budget | null;
  onClose: () => void;
  onSave: (data: { category: string; limit_amount: number }) => Promise<void>;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ editingBudget, onClose, onSave }) => {
  const { t } = useLanguage();
  const { namesFor } = useCategories();
  const categoryNames = namesFor('expense').filter(n => n !== 'Budgets activités');
  const [category, setCategory] = useState(editingBudget?.category || categoryNames[0] || 'Alimentation');
  const [limitAmount, setLimitAmount] = useState(editingBudget?.limit_amount.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitAmount);
    if (Number.isNaN(limit) || limit < 0) return;
    setSaving(true);
    await onSave({ category, limit_amount: limit });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingBudget ? t('budgets.edit') : t('budgets.add')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('budgets.category')}</label>
            <div className="flex flex-wrap gap-2">
              {(categoryNames.includes(category) ? categoryNames : [category, ...categoryNames]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${category === cat ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('budgets.limitAmount')}</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="0"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all">
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

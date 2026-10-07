import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Plus, Download, Eye, Edit, Trash2, X, AlertCircle, Tag, CreditCard, Repeat } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useAccounts } from '../../hooks/useAccounts';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Transaction, FamilyMember, Account } from '../../types';

const CATEGORIES = [
  { name: 'Salaire', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Alimentation', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Santé', type: 'expense' },
  { name: 'Logement', type: 'expense' },
  { name: 'Loisirs', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Autre', type: 'expense' },
];

interface TransactionListProps {
  quickAddSignal?: boolean;
  onQuickAddConsumed?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ quickAddSignal, onQuickAddConsumed }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { members } = useFamilyMembers();
  const { accounts } = useAccounts();

  const memberMap = useMemo(() => {
    const map: Record<string, FamilyMember> = {};
    members.forEach(m => { map[m.id] = m; });
    return map;
  }, [members]);

  const accountMap = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach(a => { map[a.id] = a; });
    return map;
  }, [accounts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quickAddSignal) {
      setEditingTx(null);
      setShowModal(true);
      onQuickAddConsumed?.();
    }
  }, [quickAddSignal]);

  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const totals = {
    income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expenses: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  };
  const balance = totals.income - totals.expenses;

  const handleAdd = () => {
    setEditingTx(null);
    setShowModal(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const exportCSV = () => {
    const headers = ['Date,Type,Category,Description,Amount,Tags\n'];
    const rows = filtered.map(tx =>
      `${tx.date},${tx.type},${tx.category},"${tx.description}",${tx.amount},"${tx.tags.join(', ')}"`
    );
    const csv = headers.join('') + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('transactions.totalIncome')}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.income)}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('transactions.totalExpenses')}</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totals.expenses)}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">€</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('transactions.balance')}</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('transactions.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-all"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">{t('transactions.allTypes')}</option>
                <option value="income">{t('transactions.income')}</option>
                <option value="expense">{t('transactions.expense')}</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">{t('transactions.allCategories')}</option>
                {CATEGORIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('transactions.add')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('transactions.noTransactions')}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-600">{t('transactions.noTransactionsDesc')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((tx, index) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tx.category}</span>
                      <span>•</span>
                      <span>{new Date(tx.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {tx.is_recurring && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                            <Repeat className="w-3 h-3" />
                            {t(`transactions.frequency.${tx.recurrence_frequency}`)}
                          </span>
                        </>
                      )}
                      {tx.account_id && accountMap[tx.account_id] && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: accountMap[tx.account_id].color }}>
                              <CreditCard className="w-2 h-2" />
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{accountMap[tx.account_id].name}</span>
                          </span>
                        </>
                      )}
                      {tx.family_member_id && memberMap[tx.family_member_id] && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: memberMap[tx.family_member_id].avatar_color }}>
                              {memberMap[tx.family_member_id].name.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{memberMap[tx.family_member_id].name}</span>
                          </span>
                        </>
                      )}
                      {tx.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {tx.tags.map((tag, i) => (
                              <span key={i} className="text-blue-500 dark:text-blue-400">#{tag}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(tx.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <TransactionModal
          editingTx={editingTx}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingTx) {
                await updateTransaction(editingTx.id, data);
              } else {
                await addTransaction(data);
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
        <ConfirmDialog
          title={t('transactions.deleteConfirm')}
          message={t('transactions.deleteConfirmDesc')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
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

// --- Transaction Modal ---
interface TransactionModalProps {
  editingTx: Transaction | null;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ editingTx, onClose, onSave }) => {
  const { t } = useLanguage();
  const { members } = useFamilyMembers();
  const { accounts } = useAccounts();
  const [type, setType] = useState<'income' | 'expense'>(editingTx?.type || 'expense');
  const [category, setCategory] = useState(editingTx?.category || 'Alimentation');
  const [amount, setAmount] = useState(editingTx?.amount.toString() || '');
  const [description, setDescription] = useState(editingTx?.description || '');
  const [date, setDate] = useState(editingTx?.date || new Date().toISOString().split('T')[0]);
  const [tagsInput, setTagsInput] = useState(editingTx?.tags.join(', ') || '');
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(editingTx?.family_member_id || null);
  const [accountId, setAccountId] = useState<string | null>(editingTx?.account_id || null);
  const [isRecurring, setIsRecurring] = useState(editingTx?.is_recurring || false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'weekly' | 'monthly' | 'yearly' | null>(editingTx?.recurrence_frequency || 'monthly');
  const [saving, setSaving] = useState(false);

  const availableCategories = CATEGORIES.filter(c => c.type === type || c.name === 'Autre');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    await onSave({
      type,
      category,
      amount: parseFloat(amount),
      description,
      date,
      tags,
      account_id: accountId,
      family_member_id: familyMemberId,
      is_recurring: isRecurring,
      recurrence_frequency: isRecurring ? recurrenceFreq : null,
      recurrence_parent_id: null,
      next_recurrence_date: null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingTx ? t('transactions.edit') : t('transactions.add')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory('Alimentation'); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t('transactions.expense')}
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory('Salaire'); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t('transactions.income')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.description')}</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="Ex: Courses au marché"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.amount')}</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.date')}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.category')}</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    category === cat.name
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.account')}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAccountId(null)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${!accountId ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {t('accounts.none')}
                </button>
                {accounts.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${accountId === a.id ? 'text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={accountId === a.id ? { backgroundColor: a.color } : {}}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.familyMember')}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFamilyMemberId(null)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${!familyMemberId ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {t('family.none')}
                </button>
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFamilyMemberId(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${familyMemberId === m.id ? 'text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={familyMemberId === m.id ? { backgroundColor: m.avatar_color } : {}}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: m.avatar_color }}>
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setIsRecurring(!isRecurring); if (!isRecurring && !recurrenceFreq) setRecurrenceFreq('monthly'); }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isRecurring
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRecurring ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Repeat className={`w-5 h-5 ${isRecurring ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('transactions.recurring')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('transactions.recurringDesc')}</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-all relative ${isRecurring ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isRecurring ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>
            {isRecurring && (
              <div className="flex gap-2 pl-2">
                {(['weekly', 'monthly', 'yearly'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setRecurrenceFreq(freq)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      recurrenceFreq === freq
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t(`transactions.frequency.${freq}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('transactions.tags')}</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('transactions.tagsPlaceholder')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Confirm Dialog ---
interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, onConfirm, onCancel }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

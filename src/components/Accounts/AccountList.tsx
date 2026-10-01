import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Wallet, CreditCard, PiggyBank, Smartphone, Banknote, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { useTransactions } from '../../hooks/useTransactions';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Account } from '../../types';

const ACCOUNT_TYPES = ['checking', 'savings', 'mobile_money', 'cash', 'credit', 'investment'];

const ACCOUNT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const TYPE_ICONS: Record<string, React.FC<any>> = {
  checking: CreditCard,
  savings: PiggyBank,
  mobile_money: Smartphone,
  cash: Banknote,
  credit: CreditCard,
  investment: Landmark,
};

export const AccountList: React.FC = () => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { transactions } = useTransactions();

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountStats = useMemo(() => {
    const stats: Record<string, { income: number; expenses: number; count: number }> = {};
    accounts.forEach(a => { stats[a.id] = { income: 0, expenses: 0, count: 0 }; });
    transactions.forEach(tx => {
      if (tx.account_id && stats[tx.account_id]) {
        if (tx.type === 'income') stats[tx.account_id].income += tx.amount;
        else stats[tx.account_id].expenses += tx.amount;
        stats[tx.account_id].count++;
      }
    });
    return stats;
  }, [accounts, transactions]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleAdd = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAccount(deleteId);
      setDeleteId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('accounts.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('accounts.subtitle')}</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('accounts.add')}
        </button>
      </div>

      {/* Total balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl p-6 text-white animate-slide-up shadow-lg shadow-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">{t('accounts.totalBalance')}</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-white/70 mt-2">
              {accounts.length} {t('accounts.accounts')}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-40 rounded-2xl shimmer-bg" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('accounts.empty')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('accounts.emptyDesc')}</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('accounts.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account, index) => {
            const Icon = TYPE_ICONS[account.type] || CreditCard;
            const stats = accountStats[account.id] || { income: 0, expenses: 0, count: 0 };
            const netFlow = stats.income - stats.expenses;

            return (
              <div
                key={account.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: account.color }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{account.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t(`accounts.types.${account.type}`)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(account.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {formatCurrency(account.balance)}
                </p>

                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {formatCurrency(stats.income)}
                  </span>
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {formatCurrency(stats.expenses)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 ml-auto">
                    {stats.count} {t('accounts.transactions')}
                  </span>
                </div>

                {netFlow !== 0 && (
                  <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-medium ${netFlow > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {netFlow > 0 ? '+' : ''}{formatCurrency(netFlow)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AccountModal
          editingAccount={editingAccount}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingAccount) {
                await updateAccount(editingAccount.id, data);
              } else {
                await addAccount(data);
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
          title={t('accounts.deleteConfirm')}
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

// --- Account Modal ---
interface AccountModalProps {
  editingAccount: Account | null;
  onClose: () => void;
  onSave: (data: Omit<Account, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

const AccountModal: React.FC<AccountModalProps> = ({ editingAccount, onClose, onSave }) => {
  const { t } = useLanguage();
  const { region } = useRegion();
  const [name, setName] = useState(editingAccount?.name || '');
  const [type, setType] = useState(editingAccount?.type || 'checking');
  const [balance, setBalance] = useState(editingAccount?.balance.toString() || '0');
  const [currency, setCurrency] = useState(editingAccount?.currency || region.currency);
  const [color, setColor] = useState(editingAccount?.color || ACCOUNT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      type,
      balance: parseFloat(balance) || 0,
      currency,
      color,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingAccount ? t('accounts.edit') : t('accounts.add')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('accounts.name')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('accounts.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('accounts.type')}</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map(at => {
                const Icon = TYPE_ICONS[at] || CreditCard;
                return (
                  <button
                    key={at}
                    type="button"
                    onClick={() => setType(at)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      type === at
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(`accounts.types.${at}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('accounts.balance')}</label>
              <input
                type="number"
                required
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('accounts.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="XAF">FCFA</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('accounts.color')}</label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, onConfirm, onCancel }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-2">{title}</h3>
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

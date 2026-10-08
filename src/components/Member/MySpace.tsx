import React, { useMemo, useState } from 'react';
import { Briefcase, Eye, Plus, Receipt, Users, Wallet, X, Loader2, ArrowRight } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useCategories } from '../../hooks/useCategories';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useRegion } from '../../hooks/useRegion';
import { useTransactions } from '../../hooks/useTransactions';
import { useLanguage } from '../../i18n';
import { formatDateShort, monthKey, todayISO } from '../../lib/dates';
import { round2 } from '../../lib/budgets';
import type { PageId } from '../../types';
import { ProgressBar, ModalShell, inputCls, labelCls, parseAmount } from '../Activities/shared';

interface Props {
  onNavigate: (page: PageId, param?: string | null) => void;
}

/** « Mon espace » : ce qu'un membre de famille voit et peut faire, selon les droits donnés par son administrateur. */
export const MySpace: React.FC<Props> = ({ onNavigate }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { access, canAddExpenses, canViewFamily } = useAccess();
  const { transactions, loading } = useTransactions();
  const { members } = useFamilyMembers();
  const { projects } = useActivityBudgets();
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const memberId = access?.family_member_id ?? null;
  const me = members.find(m => m.id === memberId) ?? null;
  const mine = useMemo(
    () => transactions.filter(tx => memberId && tx.family_member_id === memberId).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, memberId],
  );

  const month = monthKey();
  const spentThisMonth = round2(mine.filter(tx => tx.type === 'expense' && tx.date.startsWith(month)).reduce((s, tx) => s + tx.amount, 0));
  const allowance = me?.monthly_allowance ?? 0;
  const progress = allowance > 0 ? (spentThisMonth / allowance) * 100 : 0;
  const status = allowance <= 0 ? 'none' : progress > 100 ? 'over' : progress >= 80 ? 'warning' : 'ok';
  const firstName = (access?.full_name ?? '').split(' ')[0];

  const family = useMemo(() => {
    if (!canViewFamily) return [];
    return members.map(m => ({
      member: m,
      spent: round2(transactions.filter(tx => tx.family_member_id === m.id && tx.type === 'expense' && tx.date.startsWith(month)).reduce((s, tx) => s + tx.amount, 0)),
    }));
  }, [canViewFamily, members, transactions, month]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('member.space.hello').replace('{name}', firstName)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('member.space.subtitle')}</p>
      </div>

      {/* Mon argent du mois */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Wallet className="w-4 h-4" /> {t('member.space.thisMonth')}
        </div>
        {allowance > 0 ? (
          <>
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(Math.max(allowance - spentThisMonth, 0))}</p>
              <p className="text-sm text-gray-400">{t('member.space.left')} / {formatCurrency(allowance)}</p>
            </div>
            <ProgressBar progress={progress} status={status} height="h-3" />
            <p className={`text-xs mt-2 ${status === 'over' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {status === 'over'
                ? t('member.space.over').replace('{amount}', formatCurrency(spentThisMonth - allowance))
                : t('member.space.spent').replace('{amount}', formatCurrency(spentThisMonth))}
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(spentThisMonth)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('member.space.noAllowance')}</p>
          </>
        )}

        <div className="mt-5">
          {canAddExpenses ? (
            <button onClick={() => setShowModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20">
              <Plus className="w-5 h-5" /> {t('member.space.addExpense')}
            </button>
          ) : (
            <p className="text-xs text-gray-400 flex items-start gap-1.5"><Eye className="w-4 h-4 flex-shrink-0" /> {t('member.space.readOnly')}</p>
          )}
        </div>
      </section>

      {/* Mes dépenses */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white p-5 border-b border-gray-100 dark:border-gray-800">
          <Receipt className="w-5 h-5 text-blue-500" /> {t('member.space.myExpenses')}
        </h2>
        {loading ? (
          <div className="p-6 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl shimmer-bg" />)}</div>
        ) : mine.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('member.space.noExpenses')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {mine.slice(0, 60).map(tx => (
              <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.category} · {formatDateShort(tx.date, lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Budget de la famille (si autorisé) */}
      {canViewFamily && family.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 p-5 animate-slide-up">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-3">
            <Users className="w-5 h-5 text-rose-500" /> {t('member.space.family')}
          </h2>
          <ul className="space-y-3">
            {family.map(({ member, spent }) => {
              const pct = member.monthly_allowance > 0 ? (spent / member.monthly_allowance) * 100 : 0;
              return (
                <li key={member.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                    <span className="text-gray-500">{formatCurrency(spent)}{member.monthly_allowance > 0 ? ` / ${formatCurrency(member.monthly_allowance)}` : ''}</span>
                  </div>
                  {member.monthly_allowance > 0 && <ProgressBar progress={pct} status={pct > 100 ? 'over' : pct >= 80 ? 'warning' : 'ok'} />}
                </li>
              );
            })}
          </ul>
          <button onClick={() => onNavigate('family')} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline">
            {t('member.space.openFamily')} <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* Budgets partagés avec moi */}
      {projects.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-violet-200/70 dark:border-violet-900/40 p-5 animate-slide-up">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-3">
            <Briefcase className="w-5 h-5 text-violet-500" /> {t('member.space.sharedBudgets')}
          </h2>
          <ul className="space-y-2">
            {projects.slice(0, 5).map(p => (
              <li key={p.id}>
                <button onClick={() => onNavigate('activities', p.id)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mes droits */}
      <section className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-5 text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
        <p className="font-semibold text-gray-900 dark:text-white">{t('member.space.rights')}</p>
        <p>✓ {t('member.space.rightOwn')}</p>
        <p>{canAddExpenses ? '✓' : '✗'} {t('member.space.rightAdd')}</p>
        <p>{canViewFamily ? '✓' : '✗'} {t('member.space.rightFamily')}</p>
      </section>

      {showModal && (
        <MemberExpenseModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setNotice(t('member.space.saved')); }}
        />
      )}
      {notice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-lg z-[70] flex items-center gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label={t('common.close')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

const MemberExpenseModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const { t } = useLanguage();
  const { access } = useAccess();
  const { addTransaction } = useTransactions();
  const { namesFor } = useCategories();
  const categories = namesFor('expense').filter(c => c !== 'Budgets activités');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories.includes('Alimentation') ? 'Alimentation' : categories[0]);
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return setError(t('activities.entry.invalidAmount'));
    if (!description.trim()) return setError(t('common2.required'));
    if (!access?.family_member_id) return setError(t('member.space.notLinked'));
    setSaving(true);
    setError(null);
    try {
      await addTransaction({
        type: 'expense',
        category,
        amount: value,
        description: description.trim(),
        date,
        tags: [],
        account_id: null,
        family_member_id: access.family_member_id,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_parent_id: null,
        next_recurrence_date: null,
      });
      onSaved();
    } catch {
      setError(t('member.space.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <ModalShell title={t('member.space.addExpense')} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={submit} className="p-6 space-y-4">
        <div>
          <label className={labelCls} htmlFor="m-amount">{t('transactions.amount')} *</label>
          <input id="m-amount" className={inputCls} type="number" inputMode="decimal" min="0" step="any" autoFocus required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls} htmlFor="m-desc">{t('transactions.description')} *</label>
          <input id="m-desc" className={inputCls} required value={description} onChange={e => setDescription(e.target.value)} placeholder={t('member.space.descPlaceholder')} maxLength={120} />
        </div>
        <div>
          <label className={labelCls}>{t('transactions.category')}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${category === c ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="m-date">{t('transactions.date')}</label>
          <input id="m-date" className={inputCls} type="date" required value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl">{t('common.cancel')}</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};


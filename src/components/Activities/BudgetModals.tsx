import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, X, Link2 } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { useRegion } from '../../hooks/useRegion';
import { todayISO } from '../../lib/dates';
import { CATEGORY_COLORS, SUGGESTED_CATEGORIES } from '../../lib/budgets';
import type { BudgetSummary } from '../../lib/budgets';
import { DUPLICATE_CATEGORY } from '../../hooks/useActivityBudgets';
import type { CreateProjectOptions, NewCategory, NewEntry, NewProject } from '../../hooks/useActivityBudgets';
import type {
  Account, PaymentMethod, Project, ProjectCategory, ProjectScope, ProjectStatus, ProjectTransaction,
} from '../../types';
import {
  BUDGET_ICONS, ModalShell, SCOPE_STYLE, fill, inputCls, labelCls, parseAmount,
} from './shared';

const PAYMENT_METHODS: Exclude<PaymentMethod, ''>[] = ['cash', 'transfer', 'cheque', 'mobile_money', 'card'];

export function describeError(err: unknown, t: (k: string) => string): string {
  const message = err instanceof Error ? err.message : String(err);
  return message === DUPLICATE_CATEGORY ? t('activities.duplicateCategory') : message;
}

const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
      {message}
    </div>
  ) : null;

const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {CATEGORY_COLORS.map(c => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        aria-label={c}
        className={`w-7 h-7 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : 'hover:scale-110'}`}
        style={{ backgroundColor: c }}
      />
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Création / modification d'un budget                                 */
/* ------------------------------------------------------------------ */

interface ProjectModalProps {
  editing: Project | null;
  defaultScope: ProjectScope;
  accounts: Account[];
  onClose: () => void;
  onSave: (data: NewProject, options?: CreateProjectOptions) => Promise<void>;
}

interface CatRow {
  name: string;
  amount: string;
  color: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ editing, defaultScope, accounts, onClose, onSave }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();

  const [scope, setScope] = useState<ProjectScope>(editing?.scope ?? defaultScope);
  const [name, setName] = useState(editing?.name ?? '');
  const [code, setCode] = useState(editing?.code ?? '');
  const [responsible, setResponsible] = useState(editing?.responsible ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [target, setTarget] = useState(editing ? String(editing.target_amount || '') : '');
  const [startDate, setStartDate] = useState(editing?.start_date ?? '');
  const [endDate, setEndDate] = useState(editing?.end_date ?? '');
  const [color, setColor] = useState(editing?.color ?? (defaultScope === 'professional' ? '#8B5CF6' : '#3B82F6'));
  const [icon, setIcon] = useState(editing?.icon ?? (defaultScope === 'professional' ? 'Briefcase' : 'FolderOpen'));
  const [status, setStatus] = useState<ProjectStatus>(editing?.status ?? 'active');

  const [cats, setCats] = useState<CatRow[]>([]);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsDate, setFundsDate] = useState(todayISO());
  const [fundsAccount, setFundsAccount] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = SUGGESTED_CATEGORIES[scope === 'family' ? 'family' : scope][lang];
  const targetNum = target.trim() === '' ? 0 : parseAmount(target);
  const allocated = cats.reduce((s, c) => s + (parseAmount(c.amount) || 0), 0);

  const toggleSuggestion = (label: string) => {
    setCats(prev => {
      const exists = prev.findIndex(c => c.name.toLowerCase() === label.toLowerCase());
      if (exists >= 0) return prev.filter((_, i) => i !== exists);
      return [...prev, { name: label, amount: '', color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length] }];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError(t('common2.required'));
    if (Number.isNaN(targetNum) || targetNum < 0) return setError(t('activities.entry.invalidAmount'));
    if (startDate && endDate && endDate < startDate) return setError(`${t('activities.endDate')} < ${t('activities.startDate')}`);

    const cleanCats: NewCategory[] = [];
    for (const row of cats) {
      if (!row.name.trim()) continue;
      const amount = row.amount.trim() === '' ? 0 : parseAmount(row.amount);
      if (Number.isNaN(amount) || amount < 0) return setError(t('activities.entry.invalidAmount'));
      if (cleanCats.some(c => c.name.toLowerCase() === row.name.trim().toLowerCase())) {
        return setError(t('activities.duplicateCategory'));
      }
      cleanCats.push({ name: row.name.trim(), allocated_amount: amount, color: row.color });
    }

    const funds = fundsAmount.trim() === '' ? 0 : parseAmount(fundsAmount);
    if (Number.isNaN(funds) || funds < 0) return setError(t('activities.entry.invalidAmount'));

    const data: NewProject = {
      name: name.trim(),
      description: description.trim(),
      scope,
      target_amount: targetNum,
      color,
      icon,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      code: code.trim(),
      responsible: responsible.trim(),
    };

    setSaving(true);
    try {
      await onSave(
        data,
        editing
          ? undefined
          : {
              categories: cleanCats,
              initialFunds: funds > 0
                ? {
                    amount: funds,
                    date: fundsDate || todayISO(),
                    sourceAccountId: fundsAccount || null,
                    label: t('activities.initialFundsLabel'),
                  }
                : undefined,
            },
      );
    } catch (err) {
      setError(describeError(err, t));
      setSaving(false);
    }
  };

  const scopes: ProjectScope[] = editing?.scope === 'family' ? ['family'] : ['personal', 'professional'];

  return (
    <ModalShell title={editing ? t('activities.edit') : t('activities.add')} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="p-6 space-y-5">
        {/* Type de budget */}
        <div>
          <label className={labelCls}>{t('activities.scopeLabel')}</label>
          <div className="grid grid-cols-2 gap-3">
            {scopes.map(s => {
              const st = SCOPE_STYLE[s];
              const Icon = st.icon;
              const active = scope === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setScope(s);
                    if (!editing) {
                      setColor(s === 'professional' ? '#8B5CF6' : '#3B82F6');
                      setIcon(s === 'professional' ? 'Briefcase' : 'FolderOpen');
                    }
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    active
                      ? `${st.soft} border-current ${st.text}`
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">
                      {s === 'family' ? t('activities.family') : t(`activities.${s}`)}
                    </span>
                    <span className="block text-xs opacity-80">
                      {s === 'personal' ? t('activities.scopeHintPersonal') : s === 'professional' ? t('activities.scopeHintProfessional') : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>{t('activities.nameLabel')} *</label>
            <input className={inputCls} required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('activities.namePlaceholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('activities.codeLabel')}</label>
            <input className={inputCls} value={code} onChange={e => setCode(e.target.value)} placeholder={t('activities.codePlaceholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('activities.responsibleLabel')}</label>
            <input className={inputCls} value={responsible} onChange={e => setResponsible(e.target.value)} placeholder={t('activities.responsiblePlaceholder')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{t('activities.descriptionLabel')}</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('activities.descriptionPlaceholder')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{t('activities.targetLabel')}</label>
            <input className={inputCls} type="number" inputMode="decimal" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
            <p className="text-xs text-gray-400 mt-1">{t('activities.targetHint')}</p>
          </div>
          <div>
            <label className={labelCls}>{t('activities.startDate')}</label>
            <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t('activities.endDate')}</label>
            <input className={inputCls} type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Apparence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('activities.colorLabel')}</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div>
            <label className={labelCls}>{t('activities.iconLabel')}</label>
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_ICONS.map(({ name: iconName, icon: Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    icon === iconName ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={icon === iconName ? { backgroundColor: color } : undefined}
                  aria-label={iconName}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {editing && (
          <div>
            <label className={labelCls}>{t('activities.statusLabel')}</label>
            <div className="flex gap-2">
              {(['active', 'completed', 'archived'] as ProjectStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    status === s ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(`activities.status.${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Catégories (création uniquement : ensuite gérées depuis le détail) */}
        {!editing && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('activities.categoriesSection')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('activities.categoriesHint')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-400 mr-1">{t('activities.suggestions')} :</span>
              {suggestions.map(s => {
                const on = cats.some(c => c.name.toLowerCase() === s.toLowerCase());
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSuggestion(s)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                      on ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {on ? '✓ ' : '+ '}{s}
                  </button>
                );
              })}
            </div>

            {cats.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                <input
                  className={`${inputCls} flex-1`}
                  value={row.name}
                  onChange={e => setCats(prev => prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))}
                  placeholder={t('activities.categoryName')}
                />
                <input
                  className={`${inputCls} w-36`}
                  type="number" inputMode="decimal" min="0" step="any"
                  value={row.amount}
                  onChange={e => setCats(prev => prev.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))}
                  placeholder={t('activities.categoryAmount')}
                />
                <button
                  type="button"
                  onClick={() => setCats(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  aria-label="Retirer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setCats(prev => [...prev, { name: '', amount: '', color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length] }])}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              <Plus className="w-4 h-4" /> {t('activities.addCategory')}
            </button>

            {cats.length > 0 && targetNum > 0 && (
              <p className={`text-xs ${allocated > targetNum ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {t('activities.allocatedTotal')} : {formatCurrency(allocated)} / {formatCurrency(targetNum)}
                {allocated > targetNum && ` — ${t('activities.overAllocated')} ${formatCurrency(allocated - targetNum)}`}
              </p>
            )}
          </div>
        )}

        {/* Fonds initiaux */}
        {!editing && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('activities.initialFunds')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('activities.initialFundsHint')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} type="number" inputMode="decimal" min="0" step="any" value={fundsAmount} onChange={e => setFundsAmount(e.target.value)} placeholder={t('activities.entry.amount')} />
              <input className={inputCls} type="date" value={fundsDate} onChange={e => setFundsDate(e.target.value)} />
            </div>
            {accounts.length > 0 && parseAmount(fundsAmount) > 0 && (
              <div>
                <label className={labelCls}>{t('activities.sourceAccount')}</label>
                <select className={inputCls} value={fundsAccount} onChange={e => setFundsAccount(e.target.value)}>
                  <option value="">{t('activities.noSourceAccount')}</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {fundsAccount && <p className="text-xs text-gray-400 mt-1 flex items-start gap-1"><Link2 className="w-3 h-3 mt-0.5 flex-shrink-0" />{t('activities.sourceAccountHint')}</p>}
              </div>
            )}
          </div>
        )}

        <FormError message={error} />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className={`flex-1 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg disabled:opacity-50 transition-all ${SCOPE_STYLE[scope].gradient} ${SCOPE_STYLE[scope].shadow}`}>
            {saving ? t('common2.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Catégorie                                                           */
/* ------------------------------------------------------------------ */

interface CategoryModalProps {
  editing: ProjectCategory | null;
  nextColor: string;
  onClose: () => void;
  onSave: (data: NewCategory) => Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ editing, nextColor, onClose, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.allocated_amount || '') : '');
  const [color, setColor] = useState(editing?.color ?? nextColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = amount.trim() === '' ? 0 : parseAmount(amount);
    if (!name.trim()) return setError(t('common2.required'));
    if (Number.isNaN(value) || value < 0) return setError(t('activities.entry.invalidAmount'));
    setSaving(true);
    try {
      await onSave({ name: name.trim(), allocated_amount: value, color });
    } catch (err) {
      setError(describeError(err, t));
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? t('activities.categoryActions.edit') : t('activities.addCategory')} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={submit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{t('activities.categoryName')} *</label>
          <input className={inputCls} autoFocus required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>{t('activities.categoryAmount')}</label>
          <input className={inputCls} type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>{t('activities.colorLabel')}</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50">
            {saving ? t('common2.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Écriture du journal : dépense ou fonds reçus                        */
/* ------------------------------------------------------------------ */

interface EntryModalProps {
  project: Project;
  categories: ProjectCategory[];
  summary: BudgetSummary;
  accounts: Account[];
  editing: ProjectTransaction | null;
  defaultType: 'income' | 'expense';
  defaultCategoryId?: string | null;
  onClose: () => void;
  onSave: (data: NewEntry) => Promise<void>;
  onCreateCategory: (name: string) => Promise<ProjectCategory>;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  project, categories, summary, accounts, editing, defaultType, defaultCategoryId, onClose, onSave, onCreateCategory,
}) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();

  const [type, setType] = useState<'income' | 'expense'>(editing?.type ?? defaultType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [label, setLabel] = useState(editing?.label ?? '');
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? defaultCategoryId ?? '');
  const [payee, setPayee] = useState(editing?.payee ?? '');
  const [reference, setReference] = useState(editing?.reference ?? '');
  const [method, setMethod] = useState<PaymentMethod>(editing?.payment_method ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [sourceAccount, setSourceAccount] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linked = Boolean(editing?.source_transaction_id);
  const amountNum = parseAmount(amount);

  // Alertes non bloquantes (on retire l'ancien montant en cas de modification)
  const warnings = useMemo(() => {
    const out: string[] = [];
    if (type !== 'expense' || !(amountNum > 0)) return out;
    const old = editing && editing.type === 'expense' ? editing.amount : 0;

    const cat = summary.categories.find(c => c.id === categoryId);
    if (cat && cat.allocated > 0) {
      const oldInCat = editing && editing.type === 'expense' && editing.category_id === cat.id ? editing.amount : 0;
      const over = cat.spent - oldInCat + amountNum - cat.allocated;
      if (over > 0) out.push(fill(t('activities.entry.warnOverCategory'), { name: cat.name, amount: formatCurrency(over) }));
    }
    if (summary.target > 0) {
      const over = summary.spent - old + amountNum - summary.target;
      if (over > 0) out.push(fill(t('activities.entry.warnOverBudget'), { amount: formatCurrency(over) }));
    }
    if (summary.funds > 0) {
      const cashAfter = summary.cashBalance + old - amountNum;
      if (cashAfter < 0) out.push(fill(t('activities.entry.warnOverCash'), { amount: formatCurrency(summary.cashBalance + old) }));
    }
    return out;
  }, [type, amountNum, categoryId, editing, summary, t, formatCurrency]);

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await onCreateCategory(newCatName.trim());
      setCategoryId(created.id);
      setNewCatName('');
      setCreatingCat(false);
    } catch (err) {
      setError(describeError(err, t));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(amountNum > 0)) return setError(t('activities.entry.invalidAmount'));
    if (!label.trim()) return setError(t('common2.required'));

    setSaving(true);
    try {
      await onSave({
        project_id: project.id,
        category_id: type === 'expense' && categoryId ? categoryId : null,
        type,
        label: label.trim(),
        amount: amountNum,
        date: date || todayISO(),
        payee: payee.trim(),
        reference: reference.trim(),
        payment_method: method,
        note: note.trim(),
        sourceAccountId: !editing && type === 'income' ? sourceAccount || null : null,
      });
    } catch (err) {
      setError(describeError(err, t));
      setSaving(false);
    }
  };

  const title = editing ? t('activities.entry.edit') : type === 'expense' ? t('activities.entry.addExpense') : t('activities.entry.addFunds');

  return (
    <ModalShell title={title} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['expense', 'income'] as const).map(tp => (
            <button
              key={tp}
              type="button"
              disabled={linked}
              onClick={() => setType(tp)}
              className={`py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                type === tp
                  ? tp === 'expense' ? 'bg-red-500 text-white shadow' : 'bg-emerald-500 text-white shadow'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tp === 'expense' ? t('activities.entry.expense') : t('activities.entry.funds')}
            </button>
          ))}
        </div>
        {linked && <p className="text-xs text-gray-400 flex items-start gap-1"><Link2 className="w-3 h-3 mt-0.5 flex-shrink-0" />{t('activities.entry.linkedLocked')}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('activities.entry.amount')} *</label>
            <input className={inputCls} type="number" inputMode="decimal" min="0" step="any" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>{t('activities.entry.date')}</label>
            <input className={inputCls} type="date" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('activities.entry.label')} *</label>
          <input className={inputCls} required value={label} onChange={e => setLabel(e.target.value)} placeholder={type === 'expense' ? t('activities.entry.labelExpense') : t('activities.entry.labelFunds')} />
        </div>

        {type === 'expense' && (
          <div>
            <label className={labelCls}>{t('activities.entry.category')}</label>
            {creatingCat ? (
              <div className="flex gap-2">
                <input className={inputCls} autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder={t('activities.entry.newCategoryName')}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }} />
                <button type="button" onClick={createCategory} className="px-4 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-xl">{t('activities.entry.create')}</button>
                <button type="button" onClick={() => setCreatingCat(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategoryId('')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${categoryId === '' ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {t('activities.entry.noCategory')}
                </button>
                {categories.map(c => (
                  <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${categoryId === c.id ? 'text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={categoryId === c.id ? { backgroundColor: c.color } : undefined}>
                    {categoryId !== c.id && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />}
                    {c.name}
                  </button>
                ))}
                <button type="button" onClick={() => setCreatingCat(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                  <Plus className="w-3.5 h-3.5" /> {t('activities.entry.newCategory')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {type === 'expense' && (
            <div>
              <label className={labelCls}>{t('activities.entry.payee')}</label>
              <input className={inputCls} value={payee} onChange={e => setPayee(e.target.value)} placeholder={t('activities.entry.payeePlaceholder')} />
            </div>
          )}
          <div>
            <label className={labelCls}>{t('activities.entry.reference')}</label>
            <input className={inputCls} value={reference} onChange={e => setReference(e.target.value)} placeholder={t('activities.entry.referencePlaceholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('activities.entry.method')}</label>
            <select className={inputCls} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
              <option value="">{t('activities.methods.none')}</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`activities.methods.${m}`)}</option>)}
            </select>
          </div>
        </div>

        {type === 'income' && !editing && accounts.length > 0 && (
          <div>
            <label className={labelCls}>{t('activities.sourceAccount')}</label>
            <select className={inputCls} value={sourceAccount} onChange={e => setSourceAccount(e.target.value)}>
              <option value="">{t('activities.noSourceAccount')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {sourceAccount && <p className="text-xs text-gray-400 mt-1 flex items-start gap-1"><Link2 className="w-3 h-3 mt-0.5 flex-shrink-0" />{t('activities.sourceAccountHint')}</p>}
          </div>
        )}

        <div>
          <label className={labelCls}>{t('activities.entry.note')} <span className="text-gray-400 font-normal">({t('common2.optional')})</span></label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {warnings.map((w, i) => <Warning key={i}>{w}</Warning>)}
        <FormError message={error} />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving}
            className={`flex-1 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg disabled:opacity-50 transition-all ${type === 'expense' ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20'}`}>
            {saving ? t('common2.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

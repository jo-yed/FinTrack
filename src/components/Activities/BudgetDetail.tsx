import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Edit, Trash2, Download, Printer, TrendingDown, ArrowDownToLine, PiggyBank, Wallet,
  CheckCircle2, RotateCcw, Archive, Search, Link2, AlertTriangle,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useAccounts } from '../../hooks/useAccounts';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import { CATEGORY_COLORS, buildJournal, buildTimeline } from '../../lib/budgets';
import { downloadCsv, slugify } from '../../lib/csv';
import { formatDateShort, todayISO } from '../../lib/dates';
import type { PageId, ProjectCategory, ProjectStatus, ProjectTransaction } from '../../types';
import { BudgetReport } from './BudgetReport';
import { CategoryModal, EntryModal, ProjectModal, describeError } from './BudgetModals';
import {
  ConfirmDialog, ErrorToast, ProgressBar, SCOPE_STYLE, STATUS_PILL, STATUS_TEXT, getBudgetIcon, inputCls,
} from './shared';

interface Props {
  budgetId: string;
  onNavigate: (page: PageId, param?: string | null) => void;
}

type EntryModalState =
  | { mode: 'new'; type: 'income' | 'expense'; categoryId?: string | null }
  | { mode: 'edit'; entry: ProjectTransaction }
  | null;

const tooltipStyle = { backgroundColor: '#111827', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 };

export const BudgetDetail: React.FC<Props> = ({ budgetId, onNavigate }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { accounts } = useAccounts();
  const {
    projects, categories, entries, summaries, loading,
    updateProject, addCategory, updateCategory, deleteCategory, addEntry, updateEntry, deleteEntry,
  } = useActivityBudgets();

  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const project = projects.find(p => p.id === budgetId);
  const projectCategories = useMemo(() => categories.filter(c => c.project_id === budgetId), [categories, budgetId]);
  const projectEntries = useMemo(() => entries.filter(e => e.project_id === budgetId), [entries, budgetId]);
  const summary = summaries[budgetId];
  const journal = useMemo(() => buildJournal(projectEntries), [projectEntries]);
  const timeline = useMemo(() => buildTimeline(projectEntries), [projectEntries]);

  const [entryModal, setEntryModal] = useState<EntryModalState>(null);
  const [categoryModal, setCategoryModal] = useState<{ editing: ProjectCategory | null } | null>(null);
  const [editProject, setEditProject] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<ProjectTransaction | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ProjectCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres du journal
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const catById = useMemo(() => new Map(projectCategories.map(c => [c.id, c])), [projectCategories]);

  const filteredJournal = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journal.filter(({ entry }) => {
      if (filterType !== 'all' && entry.type !== filterType) return false;
      if (filterCategory === 'none' && (entry.type !== 'expense' || entry.category_id)) return false;
      if (filterCategory !== 'all' && filterCategory !== 'none' && entry.category_id !== filterCategory) return false;
      if (from && entry.date < from) return false;
      if (to && entry.date > to) return false;
      if (q && !`${entry.label} ${entry.payee} ${entry.reference} ${entry.note}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [journal, search, filterType, filterCategory, from, to]);

  const filtersActive = Boolean(search || filterType !== 'all' || filterCategory !== 'all' || from || to);
  const resetFilters = () => { setSearch(''); setFilterType('all'); setFilterCategory('all'); setFrom(''); setTo(''); };

  if (!project || !summary) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        {loading ? (
          <div className="h-40 rounded-2xl shimmer-bg" />
        ) : (
          <>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('activities.notFound')}</p>
            <button onClick={() => onNavigate('activities')} className="px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl">
              {t('activities.backToList')}
            </button>
          </>
        )}
      </div>
    );
  }

  const Icon = getBudgetIcon(project.icon);
  const st = SCOPE_STYLE[project.scope];
  const readOnly = project.status !== 'active';
  const nextColor = CATEGORY_COLORS[projectCategories.length % CATEGORY_COLORS.length];

  const setStatus = async (status: ProjectStatus) => {
    try { await updateProject(project.id, { status }); } catch (err) { setError(describeError(err, t)); }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    try { await deleteEntry(deleteEntryTarget.id); } catch (err) { setError(describeError(err, t)); }
    setDeleteEntryTarget(null);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    try { await deleteCategory(deleteCategoryTarget.id); } catch (err) { setError(describeError(err, t)); }
    setDeleteCategoryTarget(null);
  };

  const exportCsv = () => {
    const methodLabel = (m: string) => (m ? t(`activities.methods.${m}`) : '');
    const rows: unknown[][] = [
      [t('activities.reportTitle'), project.name],
      [t('activities.scopeLabel'), project.scope === 'family' ? t('activities.family') : t(`activities.${project.scope}`)],
      [t('activities.codeLabel'), project.code],
      [t('activities.responsibleLabel'), project.responsible],
      [t('activities.startDate'), project.start_date ?? ''],
      [t('activities.endDate'), project.end_date ?? ''],
      [t('activities.generatedOn'), todayISO()],
      [],
      [t('activities.planned'), summary.target],
      [t('activities.funds'), summary.funds],
      [t('activities.spent'), summary.spent],
      [t('activities.remaining'), summary.remainingToSpend],
      [t('activities.cash'), summary.cashBalance],
      [],
      [t('activities.categoriesTable')],
      [t('activities.category'), t('activities.plannedShort'), t('activities.spentShort'), t('activities.remainingShort'), '%', t('activities.entriesCount')],
      ...summary.categories.map(c => [c.name, c.allocated, c.spent, c.remaining, c.allocated > 0 ? Math.round(c.progress) : '', c.count]),
      ...(summary.uncategorized.count > 0
        ? [[t('activities.uncategorized'), '', summary.uncategorized.spent, '', '', summary.uncategorized.count]]
        : []),
      [],
      [t('activities.journal')],
      [t('activities.date'), t('activities.label'), t('activities.category'), t('activities.payee'), t('activities.reference'), t('activities.method'), t('activities.inColumn'), t('activities.outColumn'), t('activities.balance'), t('activities.entry.note')],
      ...journal.map(({ entry, balance }) => [
        entry.date,
        entry.label,
        entry.type === 'expense' ? catById.get(entry.category_id ?? '')?.name ?? t('activities.uncategorized') : '',
        entry.payee,
        entry.reference,
        methodLabel(entry.payment_method),
        entry.type === 'income' ? entry.amount : '',
        entry.type === 'expense' ? entry.amount : '',
        balance,
        entry.note,
      ]),
      ['', t('activities.total'), '', '', '', '', summary.funds, summary.spent, summary.cashBalance],
    ];
    downloadCsv(`budget-${slugify(project.name)}-${todayISO()}.csv`, rows);
  };

  const chartData = summary.categories.map(c => ({ name: c.name, planned: c.allocated, spent: c.spent, color: c.color }));
  if (summary.uncategorized.count > 0) {
    chartData.push({ name: t('activities.uncategorized'), planned: 0, spent: summary.uncategorized.spent, color: '#9CA3AF' });
  }

  const overAllocated = summary.target > 0 && summary.allocatedTotal > summary.target;

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto print:hidden">
        {/* En-tête */}
        <div className="animate-fade-in">
          <button onClick={() => onNavigate('activities')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('activities.backToList')}
          </button>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ backgroundColor: project.color }}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight break-words">{project.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1">
                  <span className={`inline-flex items-center gap-1 font-semibold ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {project.scope === 'family' ? t('activities.family') : t(`activities.${project.scope}`)}
                  </span>
                  <span className={`font-medium ${STATUS_TEXT[project.status]}`}>{t(`activities.status.${project.status}`)}</span>
                  {project.code && <span className="text-gray-500 dark:text-gray-400">#{project.code}</span>}
                  {project.responsible && <span className="text-gray-500 dark:text-gray-400">{project.responsible}</span>}
                  {(project.start_date || project.end_date) && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {project.start_date && formatDateShort(project.start_date, locale)}
                      {project.start_date && project.end_date && ' → '}
                      {project.end_date && formatDateShort(project.end_date, locale)}
                    </span>
                  )}
                </div>
                {project.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-2xl">{project.description}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!readOnly && (
                <>
                  <button onClick={() => setEntryModal({ mode: 'new', type: 'expense' })} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-500/20 hover:opacity-95 transition-all">
                    <TrendingDown className="w-4 h-4" /> {t('activities.addExpense')}
                  </button>
                  <button onClick={() => setEntryModal({ mode: 'new', type: 'income' })} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all">
                    <ArrowDownToLine className="w-4 h-4" /> {t('activities.addFunds')}
                  </button>
                </>
              )}
              <button onClick={exportCsv} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('activities.exportCsv')}</span>
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">{t('activities.print')}</span>
              </button>
              <button onClick={() => setEditProject(true)} aria-label={t('common.edit')} className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              {project.status === 'active' ? (
                <button onClick={() => setStatus('completed')} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> <span className="hidden md:inline">{t('activities.closeBudget')}</span>
                </button>
              ) : (
                <>
                  <button onClick={() => setStatus('active')} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
                    <RotateCcw className="w-4 h-4" /> <span className="hidden md:inline">{t('activities.reopen')}</span>
                  </button>
                  {project.status === 'completed' && (
                    <button onClick={() => setStatus('archived')} className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
                      <Archive className="w-4 h-4" /> <span className="hidden md:inline">{t('activities.archive')}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <Kpi icon={<Wallet className="w-4 h-4" />} label={t('activities.planned')} value={summary.target > 0 ? formatCurrency(summary.target) : '—'} tone="text-gray-900 dark:text-white" />
          <Kpi icon={<TrendingDown className="w-4 h-4" />} label={t('activities.spent')} value={formatCurrency(summary.spent)} tone="text-red-600 dark:text-red-400" />
          <Kpi icon={<PiggyBank className="w-4 h-4" />} label={t('activities.remaining')} value={formatCurrency(summary.remainingToSpend)} tone={summary.remainingToSpend < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} sub={summary.remainingToSpend < 0 ? `${t('activities.overBy')} ${formatCurrency(-summary.remainingToSpend)}` : undefined} />
          <Kpi icon={<ArrowDownToLine className="w-4 h-4" />} label={t('activities.cash')} value={formatCurrency(summary.cashBalance)} tone={summary.cashBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'} sub={`${t('activities.funds')} : ${formatCurrency(summary.funds)}`} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 animate-slide-up">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">{formatCurrency(summary.spent)} / {formatCurrency(summary.base)}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_PILL[summary.status]}`}>{Math.round(summary.progress)}% {t('activities.used')}</span>
          </div>
          <ProgressBar progress={summary.progress} status={summary.status} height="h-3" />
        </div>

        {/* Catégories */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('activities.categoriesTable')}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('activities.categoriesHint')}</p>
            </div>
            <button onClick={() => setCategoryModal({ editing: null })} className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium rounded-xl transition-colors flex-shrink-0">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('activities.addCategory')}</span>
            </button>
          </div>

          {summary.categories.length === 0 && summary.uncategorized.count === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('activities.noCategories')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left font-medium px-5 py-2.5">{t('activities.category')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.plannedShort')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.spentShort')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.remainingShort')}</th>
                    <th className="font-medium px-3 py-2.5 w-44 text-left">{t('activities.usage')}</th>
                    <th className="px-3 py-2.5 w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.categories.map(c => {
                    const cat = catById.get(c.id!)!;
                    return (
                      <tr key={c.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                            <span className="text-xs text-gray-400">{c.count}</span>
                            {c.status === 'over' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{formatCurrency(c.allocated)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(c.spent)}</td>
                        <td className={`px-3 py-3 text-right tabular-nums font-medium ${c.remaining < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(c.remaining)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar progress={c.progress} status={c.status} height="h-2" /></div>
                            <span className="text-xs text-gray-500 w-9 text-right">{c.allocated > 0 ? `${Math.round(c.progress)}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            {!readOnly && (
                              <button onClick={() => setEntryModal({ mode: 'new', type: 'expense', categoryId: c.id })} aria-label={t('activities.addExpense')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Plus className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => setCategoryModal({ editing: cat })} aria-label={t('common.edit')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteCategoryTarget(cat)} aria-label={t('common.delete')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {summary.uncategorized.count > 0 && (
                    <tr>
                      <td className="px-5 py-3 text-gray-500 italic">{t('activities.uncategorized')} <span className="text-xs text-gray-400 not-italic">{summary.uncategorized.count}</span></td>
                      <td className="px-3 py-3 text-right text-gray-400">—</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(summary.uncategorized.spent)}</td>
                      <td colSpan={3} />
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold text-gray-900 dark:text-white">
                    <td className="px-5 py-3">{t('activities.total')}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(summary.allocatedTotal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(summary.spent)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${summary.remainingToSpend < 0 ? 'text-red-500' : ''}`}>{formatCurrency(summary.remainingToSpend)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {summary.target > 0 && summary.categories.length > 0 && (
            <div className={`px-5 py-3 text-xs border-t border-gray-100 dark:border-gray-800 ${overAllocated ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {overAllocated
                ? `${t('activities.overAllocated')} ${formatCurrency(summary.allocatedTotal - summary.target)}`
                : `${t('activities.unallocated')} : ${formatCurrency(summary.unallocated)}`}
            </div>
          )}
        </section>

        {/* Graphiques */}
        {projectEntries.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t('activities.spendingByCategory')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#9CA3AF33" />
                    <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => formatCompact(v)} />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'planned' ? t('activities.plannedShort') : t('activities.spentShort')]} cursor={{ fill: '#9CA3AF22' }} />
                    <Bar dataKey="planned" fill="#9CA3AF55" radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={10}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t('activities.timeline')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ left: 0, right: 12 }}>
                    <defs>
                      <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF33" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={d => formatDateShort(d, locale).replace(/\s\d{4}$/, '')} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => formatCompact(v)} width={48} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={d => formatDateShort(String(d), locale)} formatter={(v: number, name: string) => [formatCurrency(v), name === 'spent' ? t('activities.cumulativeSpent') : t('activities.fundsLine')]} />
                    {summary.base > 0 && <ReferenceLine y={summary.base} stroke="#8B5CF6" strokeDasharray="6 4" label={{ value: t('activities.budgetLine'), fill: '#8B5CF6', fontSize: 11, position: 'insideTopLeft' }} />}
                    <Area type="stepAfter" dataKey="funds" stroke="#10B981" fill="none" strokeWidth={2} />
                    <Area type="stepAfter" dataKey="spent" stroke="#EF4444" fill="url(#spentGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Journal de caisse */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 space-y-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('activities.journal')}</h2>
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className={`${inputCls} pl-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('activities.search')} />
              </div>
              <select className={`${inputCls} lg:w-44`} value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
                <option value="all">{t('activities.allTypes')}</option>
                <option value="expense">{t('activities.onlyExpenses')}</option>
                <option value="income">{t('activities.onlyFunds')}</option>
              </select>
              <select className={`${inputCls} lg:w-48`} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">{t('activities.allCategories')}</option>
                {projectCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="none">{t('activities.uncategorized')}</option>
              </select>
              <input type="date" className={`${inputCls} lg:w-40`} value={from} onChange={e => setFrom(e.target.value)} aria-label={t('activities.from')} title={t('activities.from')} />
              <input type="date" className={`${inputCls} lg:w-40`} value={to} onChange={e => setTo(e.target.value)} aria-label={t('activities.to')} title={t('activities.to')} />
              {filtersActive && (
                <button onClick={resetFilters} className="px-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">{t('activities.resetFilters')}</button>
              )}
            </div>
          </div>

          {journal.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('activities.emptyJournal')}</div>
          ) : filteredJournal.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('activities.noMatch')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/40">
                    <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap">{t('activities.date')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('activities.label')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('activities.category')}</th>
                    <th className="text-left font-medium px-3 py-2.5 hidden xl:table-cell">{t('activities.payee')}</th>
                    <th className="text-left font-medium px-3 py-2.5 hidden xl:table-cell">{t('activities.reference')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.inColumn')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.outColumn')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('activities.balance')}</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredJournal.map(({ entry, balance }) => {
                    const cat = entry.category_id ? catById.get(entry.category_id) : undefined;
                    return (
                      <tr key={entry.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateShort(entry.date, locale)}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {entry.label}
                            {entry.source_transaction_id && <span title={t('activities.entry.linkedBadge')}><Link2 className="w-3 h-3 text-blue-500" /></span>}
                          </div>
                          {(entry.payment_method || entry.note) && (
                            <div className="text-xs text-gray-400">
                              {entry.payment_method && t(`activities.methods.${entry.payment_method}`)}
                              {entry.payment_method && entry.note && ' · '}
                              {entry.note}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {entry.type === 'expense' ? (
                            cat ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}
                              </span>
                            ) : <span className="text-xs text-gray-400 italic">{t('activities.uncategorized')}</span>
                          ) : <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('activities.entry.funds')}</span>}
                        </td>
                        <td className="px-3 py-3 hidden xl:table-cell text-gray-600 dark:text-gray-300">{entry.payee}</td>
                        <td className="px-3 py-3 hidden xl:table-cell text-gray-600 dark:text-gray-300">{entry.reference}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{entry.type === 'income' ? formatCurrency(entry.amount) : ''}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-red-600 dark:text-red-400">{entry.type === 'expense' ? formatCurrency(entry.amount) : ''}</td>
                        <td className={`px-3 py-3 text-right tabular-nums font-semibold ${balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(balance)}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEntryModal({ mode: 'edit', entry })} aria-label={t('common.edit')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteEntryTarget(entry)} aria-label={t('common.delete')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Rapport imprimable */}
      <BudgetReport project={project} summary={summary} journal={journal} categories={projectCategories} t={t} locale={locale} money={formatCurrency} />

      {/* Fenêtres */}
      {entryModal && (
        <EntryModal
          project={project}
          categories={projectCategories}
          summary={summary}
          accounts={accounts}
          editing={entryModal.mode === 'edit' ? entryModal.entry : null}
          defaultType={entryModal.mode === 'new' ? entryModal.type : entryModal.entry.type}
          defaultCategoryId={entryModal.mode === 'new' ? entryModal.categoryId : undefined}
          onClose={() => setEntryModal(null)}
          onCreateCategory={name => addCategory(project.id, { name, allocated_amount: 0, color: nextColor })}
          onSave={async data => {
            if (entryModal.mode === 'edit') {
              const { sourceAccountId: _s, projectName: _p, ...rest } = data;
              await updateEntry(entryModal.entry.id, rest);
            } else {
              await addEntry(data);
            }
            setEntryModal(null);
          }}
        />
      )}

      {categoryModal && (
        <CategoryModal
          editing={categoryModal.editing}
          nextColor={nextColor}
          onClose={() => setCategoryModal(null)}
          onSave={async data => {
            if (categoryModal.editing) await updateCategory(categoryModal.editing.id, data);
            else await addCategory(project.id, data);
            setCategoryModal(null);
          }}
        />
      )}

      {editProject && (
        <ProjectModal
          editing={project}
          defaultScope={project.scope}
          accounts={accounts}
          onClose={() => setEditProject(false)}
          onSave={async data => {
            await updateProject(project.id, data);
            setEditProject(false);
          }}
        />
      )}

      {deleteEntryTarget && (
        <ConfirmDialog
          message={t('activities.deleteEntryConfirm')}
          detail={deleteEntryTarget.source_transaction_id ? t('activities.deleteEntryLinked') : undefined}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmDeleteEntry}
          onCancel={() => setDeleteEntryTarget(null)}
        />
      )}

      {deleteCategoryTarget && (
        <ConfirmDialog
          message={`« ${deleteCategoryTarget.name} »`}
          detail={t('activities.categoryActions.deleteConfirm')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={confirmDeleteCategory}
          onCancel={() => setDeleteCategoryTarget(null)}
        />
      )}

      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </>
  );
};

function formatCompact(n: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; tone: string }> = ({ icon, label, value, sub, tone }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">{icon}{label}</div>
    <p className={`text-xl lg:text-2xl font-bold ${tone}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

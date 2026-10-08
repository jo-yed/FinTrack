import React, { useMemo, useState } from 'react';
import { Plus, Edit, Trash2, ChevronRight, Briefcase, AlertTriangle, Users, Wallet, ArrowDownToLine, PiggyBank, BarChart3, Clock, Share2 } from 'lucide-react';
import { useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useAccounts } from '../../hooks/useAccounts';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import { round2 } from '../../lib/budgets';
import type { PageId, Project, ProjectScope } from '../../types';
import { ProjectModal, describeError } from './BudgetModals';
import {
  ConfirmDialog, ErrorToast, ProgressBar, SCOPE_STYLE, STATUS_PILL, STATUS_TEXT, getBudgetIcon,
} from './shared';

type Tab = 'all' | 'shared' | ProjectScope;

interface Props {
  onNavigate: (page: PageId, param?: string | null) => void;
}

export const BudgetListView: React.FC<Props> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { accounts } = useAccounts();
  const { userId, projects, summaries, loading, roleOf, addProject, updateProject, deleteProject } = useActivityBudgets();

  const [tab, setTab] = useState<Tab>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const owned = useMemo(() => projects.filter(p => p.user_id === userId), [projects, userId]);
  const shared = useMemo(() => projects.filter(p => p.user_id !== userId), [projects, userId]);
  const familyCount = owned.filter(p => p.scope === 'family').length;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: t('activities.tabAll'), count: owned.filter(p => p.scope !== 'family').length },
    { id: 'personal', label: t('activities.personal'), count: owned.filter(p => p.scope === 'personal').length },
    { id: 'professional', label: t('activities.professional'), count: owned.filter(p => p.scope === 'professional').length },
    ...(familyCount > 0 ? [{ id: 'family' as Tab, label: t('activities.family'), count: familyCount }] : []),
    ...(shared.length > 0 ? [{ id: 'shared' as Tab, label: t('share.sharedTab'), count: shared.length }] : []),
  ];

  const visible = useMemo(() => {
    const base = tab === 'shared' ? shared : owned;
    return base.filter(p => {
      if (tab === 'all' ? p.scope === 'family' : tab !== 'shared' && p.scope !== tab) return false;
      if (!showClosed && p.status !== 'active') return false;
      return true;
    });
  }, [owned, shared, tab, showClosed]);

  const closedCount = (tab === 'shared' ? shared : owned).filter(p => p.status !== 'active').length;

  const totals = useMemo(() => {
    const active = visible.filter(p => p.status === 'active');
    return {
      planned: round2(active.reduce((s, p) => s + (summaries[p.id]?.target ?? 0), 0)),
      funds: round2(active.reduce((s, p) => s + (summaries[p.id]?.funds ?? 0), 0)),
      spent: round2(active.reduce((s, p) => s + (summaries[p.id]?.spent ?? 0), 0)),
      remaining: round2(active.reduce((s, p) => s + (summaries[p.id]?.remainingToSpend ?? 0), 0)),
      cash: round2(active.reduce((s, p) => s + (summaries[p.id]?.cashBalance ?? 0), 0)),
    };
  }, [visible, summaries]);

  const defaultScope: 'personal' | 'professional' = tab === 'professional' ? 'professional' : 'personal';
  const openCreate = () => { setEditing(null); setShowModal(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProject(deleting.id);
      setDeleting(null);
    } catch (err) {
      setError(describeError(err, t));
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('activities.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('activities.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('activities', 'reports')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('periodReports.open')}</span>
          </button>
          <button
            onClick={openCreate}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg transition-all ${SCOPE_STYLE[defaultScope].gradient} ${SCOPE_STYLE[defaultScope].shadow}`}
          >
            <Plus className="w-4 h-4" />
            {t('activities.add')}
          </button>
        </div>
      </div>

      {/* Distinction avec le budget famille */}
      <button
        onClick={() => onNavigate('family')}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-left hover:bg-rose-100/60 dark:hover:bg-rose-900/20 transition-colors animate-fade-in"
      >
        <Users className="w-4 h-4 text-rose-500 flex-shrink-0" />
        <span className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex-1">{t('activities.independentNote')}</span>
        <ChevronRight className="w-4 h-4 text-rose-400" />
      </button>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 animate-slide-up">
        {tabs.map(tb => {
          const active = tab === tb.id;
          const st = tb.id === 'all' ? null : tb.id === 'shared' ? SCOPE_STYLE.professional : SCOPE_STYLE[tb.id];
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                active
                  ? `text-white shadow-lg ${st ? `${st.gradient} ${st.shadow}` : 'bg-gray-900 dark:bg-white dark:text-gray-900 shadow-gray-500/20'}`
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {st && <st.icon className="w-4 h-4" />}
              {tb.label}
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>{tb.count}</span>
            </button>
          );
        })}
      </div>

      {/* Totaux */}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <Stat icon={<Wallet className="w-4 h-4" />} label={t('activities.planned')} value={formatCurrency(totals.planned)} tone="text-gray-900 dark:text-white" />
          <Stat icon={<ArrowDownToLine className="w-4 h-4" />} label={t('activities.spent')} value={formatCurrency(totals.spent)} tone="text-red-600 dark:text-red-400" />
          <Stat icon={<PiggyBank className="w-4 h-4" />} label={t('activities.remaining')} value={formatCurrency(totals.remaining)} tone={totals.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Stat icon={<Briefcase className="w-4 h-4" />} label={t('activities.cash')} value={formatCurrency(totals.cash)} sub={`${t('activities.funds')} : ${formatCurrency(totals.funds)}`} tone={totals.cash < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'} />
        </div>
      )}

      {closedCount > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="rounded border-gray-300" />
          {t('activities.showClosed')} ({closedCount})
        </label>
      )}

      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-56 rounded-2xl shimmer-bg" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('activities.emptyTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('activities.emptyDesc')}</p>
          <div className="max-w-md mx-auto text-left text-sm text-gray-600 dark:text-gray-300 space-y-1.5 mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <p className="font-semibold text-gray-900 dark:text-white">{t('activities.howItWorks')}</p>
            <p>{t('activities.step1')}</p>
            <p>{t('activities.step2')}</p>
            <p>{t('activities.step3')}</p>
          </div>
          <button onClick={openCreate} className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg ${SCOPE_STYLE.professional.gradient} ${SCOPE_STYLE.professional.shadow}`}>
            <Plus className="w-4 h-4" />
            {t('activities.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((project, index) => {
            const s = summaries[project.id];
            const Icon = getBudgetIcon(project.icon);
            const st = SCOPE_STYLE[project.scope];
            const alerts = s ? s.categories.filter(c => c.status === 'over' || c.status === 'warning') : [];
            const isOwner = roleOf(project.id) === 'owner';
            return (
              <div
                key={project.id}
                onClick={() => onNavigate('activities', project.id)}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all animate-fade-in cursor-pointer overflow-hidden relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ backgroundColor: project.color }} />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ backgroundColor: project.color }}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{project.name}</h3>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className={`inline-flex items-center gap-1 font-medium ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {project.scope === 'family' ? t('activities.family') : t(`activities.${project.scope}`)}
                        </span>
                        <span className={STATUS_TEXT[project.status]}>• {t(`activities.status.${project.status}`)}</span>
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditing(project); setShowModal(true); }} aria-label={t('common.edit')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleting(project)} aria-label={t('common.delete')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {s && (
                  <div className="relative space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(s.spent)}</span>
                        <span className="text-xs text-gray-400">/ {formatCurrency(s.base)}</span>
                      </div>
                      <ProgressBar progress={s.progress} status={s.status} />
                      <div className="flex items-center justify-between mt-1.5 text-xs">
                        <span className={s.remainingToSpend < 0 ? 'font-medium text-red-500' : 'text-gray-500 dark:text-gray-400'}>
                          {s.remainingToSpend < 0
                            ? `${t('activities.overBy')} ${formatCurrency(-s.remainingToSpend)}`
                            : `${formatCurrency(s.remainingToSpend)} ${t('activities.remaining').toLowerCase()}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[s.status]}`}>{Math.round(s.progress)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span>{t('activities.cash')} : <strong className={s.cashBalance < 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}>{formatCurrency(s.cashBalance)}</strong></span>
                      <span>{s.categories.length} {t('activities.categoriesCount')}</span>
                    </div>

                    {(!isOwner || s.pendingCount > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {!isOwner && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">
                            <Share2 className="w-3 h-3" /> {t('share.sharedBy')} {project.owner_email || '—'}
                          </span>
                        )}
                        {s.pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">
                            <Clock className="w-3 h-3" /> {s.pendingCount} {t('approval.pending').toLowerCase()}
                          </span>
                        )}
                      </div>
                    )}

                    {alerts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {alerts.slice(0, 3).map(c => (
                          <span key={c.id} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_PILL[c.status]}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {c.name} {Math.round(c.progress)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProjectModal
          editing={editing}
          defaultScope={defaultScope}
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSave={async (data, options) => {
            if (editing) {
              await updateProject(editing.id, data);
              setShowModal(false);
            } else {
              const created = await addProject(data, options);
              setShowModal(false);
              onNavigate('activities', created.id);
            }
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message={`${t('common.delete')} « ${deleting.name} » ?`}
          detail={t('activities.deleteConfirm')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; tone: string }> = ({ icon, label, value, sub, tone }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">{icon}{label}</div>
    <p className={`text-xl font-bold ${tone}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

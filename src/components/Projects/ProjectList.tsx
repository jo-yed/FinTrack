import React, { useState, useMemo } from 'react';
import {
  Plus, Edit, Trash2, X, AlertCircle, ArrowLeft, ArrowRight,
  FolderOpen, Plane, Home, GraduationCap, Heart, Car, Gift,
  PartyPopper, Wrench, ShoppingBag, TrendingUp, TrendingDown,
  Check, Archive, ChevronRight,
} from 'lucide-react';
import { useProjects, useProjectTransactions } from '../../hooks/useProjects';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Project, ProjectTransaction, ProjectScope } from '../../types';

const PROJECT_ICONS = [
  { name: 'FolderOpen', icon: FolderOpen },
  { name: 'Plane', icon: Plane },
  { name: 'Home', icon: Home },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Heart', icon: Heart },
  { name: 'Car', icon: Car },
  { name: 'Gift', icon: Gift },
  { name: 'PartyPopper', icon: PartyPopper },
  { name: 'Wrench', icon: Wrench },
  { name: 'ShoppingBag', icon: ShoppingBag },
];

const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function getIcon(name: string): React.FC<any> {
  const found = PROJECT_ICONS.find(i => i.name === name);
  return found ? found.icon : FolderOpen;
}

export const ProjectList: React.FC = () => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects();

  const [activeScope, setActiveScope] = useState<ProjectScope>('personal');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.scope === activeScope);
  }, [projects, activeScope]);

  const stats = useMemo(() => {
    const list = filteredProjects;
    const active = list.filter(p => p.status === 'active');
    const totalBudget = active.reduce((sum, p) => sum + p.target_amount, 0);
    return { count: list.length, activeCount: active.length, totalBudget };
  }, [filteredProjects]);

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onEdit={() => { setEditingProject(selectedProject); setShowModal(true); }}
      />
    );
  }

  const handleAdd = () => {
    setEditingProject(null);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProject(deleteId);
      setDeleteId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ScopeToggle = ({ scope, label, count }: { scope: ProjectScope; label: string; count: number }) => (
    <button
      onClick={() => setActiveScope(scope)}
      className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
        activeScope === scope
          ? scope === 'personal'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {scope === 'personal' ? <Heart className="w-4 h-4" /> : <PartyPopper className="w-4 h-4" />}
      {label}
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeScope === scope ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('projects.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('projects.subtitle')}</p>
        </div>
        <button
          onClick={handleAdd}
          className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg transition-all ${
            activeScope === 'personal'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/20 hover:from-blue-700 hover:to-blue-600'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-600'
          }`}
        >
          <Plus className="w-4 h-4" />
          {t('projects.add')}
        </button>
      </div>

      {/* Scope tabs */}
      <div className="flex gap-3 animate-slide-up">
        <ScopeToggle scope="personal" label={t('projects.personal')} count={projects.filter(p => p.scope === 'personal').length} />
        <ScopeToggle scope="family" label={t('projects.family')} count={projects.filter(p => p.scope === 'family').length} />
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-48 rounded-2xl shimmer-bg" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            {activeScope === 'personal' ? t('projects.emptyPersonal') : t('projects.emptyFamily')}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('projects.emptyDesc')}</p>
          <button
            onClick={handleAdd}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl shadow-lg transition-all ${
              activeScope === 'personal'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/20'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            {t('projects.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => {
            const Icon = getIcon(project.icon);
            const accentColor = project.scope === 'personal' ? 'blue' : 'emerald';

            return (
              <div
                key={project.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all animate-fade-in cursor-pointer overflow-hidden relative"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedProject(project)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5" style={{ backgroundColor: project.color }} />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: project.color }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{project.name}</h3>
                      <span className={`text-xs ${project.status === 'active' ? 'text-emerald-500' : project.status === 'completed' ? 'text-blue-500' : 'text-gray-400'}`}>
                        {t(`projects.status.${project.status}`)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingProject(project); setShowModal(true); }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(project.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="relative text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="relative flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    {t('projects.open')}
                  </span>
                  {project.target_amount > 0 && (
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {formatCurrency(project.target_amount)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ProjectModal
          editingProject={editingProject}
          defaultScope={activeScope}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingProject) {
                await updateProject(editingProject.id, data);
              } else {
                await addProject(data);
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-2">{t('projects.deleteConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors">
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

// --- Project Detail ---
interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEdit: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack, onEdit }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const { transactions, loading, addTransaction, deleteTransaction } = useProjectTransactions(project.id);
  const [showTxModal, setShowTxModal] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const Icon = getIcon(project.icon);

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const progress = project.target_amount > 0 ? Math.min((expenses / project.target_amount) * 100, 100) : 0;
    return { income, expenses, balance, progress };
  }, [transactions, project.target_amount]);

  const handleDeleteTx = async () => {
    if (!deleteTxId) return;
    try {
      await deleteTransaction(deleteTxId);
      setDeleteTxId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const accentGradient = project.scope === 'personal'
    ? 'from-blue-600 to-blue-500'
    : 'from-emerald-600 to-emerald-500';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors animate-fade-in"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('projects.backToList')}
      </button>

      {/* Project header card */}
      <div className={`bg-gradient-to-br ${accentGradient} rounded-2xl p-6 text-white animate-slide-up shadow-lg overflow-hidden relative`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                  {project.scope === 'personal' ? t('projects.personal') : t('projects.family')}
                </span>
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                  {t(`projects.status.${project.status}`)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        </div>

        {project.description && (
          <p className="relative text-sm text-white/80 mt-4">{project.description}</p>
        )}

        {/* Balance + progress */}
        <div className="relative grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-xs text-white/70">{t('projects.totalIncome')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.income)}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">{t('projects.totalExpenses')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.expenses)}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">{t('projects.balance')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.balance)}</p>
          </div>
        </div>

        {project.target_amount > 0 && (
          <div className="relative mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>{t('projects.spent')} {formatCurrency(totals.expenses)}</span>
              <span>{t('projects.target')} {formatCurrency(project.target_amount)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-white transition-all duration-700"
                style={{ width: `${totals.progress}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1.5">{Math.round(totals.progress)}% {t('budgets.used')}</p>
          </div>
        )}
      </div>

      {/* Transactions section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('projects.transactions')}</h3>
          <button
            onClick={() => setShowTxModal(true)}
            className={`flex items-center gap-2 px-3 py-2 text-white text-sm font-medium rounded-lg transition-all ${accentGradient}`}
          >
            <Plus className="w-4 h-4" />
            {t('projects.addEntry')}
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl shimmer-bg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-600">{t('projects.noEntries')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx, index) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={() => setDeleteTxId(tx.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction modal */}
      {showTxModal && (
        <ProjectTxModal
          onClose={() => setShowTxModal(false)}
          onSave={async (data) => {
            try {
              await addTransaction({ ...data, project_id: project.id });
              setShowTxModal(false);
            } catch (err: any) {
              setError(err.message);
            }
          }}
        />
      )}

      {/* Delete tx confirmation */}
      {deleteTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTxId(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-2">{t('projects.deleteEntryConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTxId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDeleteTx} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors">
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

// --- Project Modal ---
interface ProjectModalProps {
  editingProject: Project | null;
  defaultScope: ProjectScope;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ editingProject, defaultScope, onClose, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(editingProject?.name || '');
  const [description, setDescription] = useState(editingProject?.description || '');
  const [scope, setScope] = useState<ProjectScope>(editingProject?.scope || defaultScope);
  const [targetAmount, setTargetAmount] = useState(editingProject?.target_amount.toString() || '');
  const [color, setColor] = useState(editingProject?.color || PROJECT_COLORS[0]);
  const [iconName, setIconName] = useState(editingProject?.icon || 'FolderOpen');
  const [status, setStatus] = useState(editingProject?.status || 'active');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      description,
      scope,
      target_amount: parseFloat(targetAmount) || 0,
      color,
      icon: iconName,
      status,
      start_date: editingProject?.start_date || null,
      end_date: editingProject?.end_date || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingProject ? t('projects.edit') : t('projects.add')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Scope toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.scopeLabel')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${scope === 'personal' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
              >
                <Heart className="w-4 h-4" />
                {t('projects.personal')}
              </button>
              <button
                type="button"
                onClick={() => setScope('family')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${scope === 'family' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
              >
                <PartyPopper className="w-4 h-4" />
                {t('projects.family')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.nameLabel')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('projects.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              placeholder={t('projects.descriptionPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.targetAmount')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.iconLabel')}</label>
            <div className="grid grid-cols-5 gap-2">
              {PROJECT_ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIconName(name)}
                  className={`flex items-center justify-center w-full aspect-square rounded-lg transition-all ${iconName === name ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : 'hover:scale-105'}`}
                  style={iconName === name ? { backgroundColor: color } : { backgroundColor: 'rgb(243 244 246 / 1)' }}
                >
                  <Icon className={`w-5 h-5 ${iconName === name ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.colorLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
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

          {editingProject && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.statusLabel')}</label>
              <div className="flex gap-2">
                {(['active', 'completed', 'archived'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${status === s ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                  >
                    {s === 'active' && <Check className="w-3.5 h-3.5" />}
                    {s === 'archived' && <Archive className="w-3.5 h-3.5" />}
                    {t(`projects.status.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Project Transaction Modal ---
interface ProjectTxModalProps {
  onClose: () => void;
  onSave: (data: Omit<ProjectTransaction, 'id' | 'user_id' | 'created_at' | 'project_id'>) => Promise<void>;
}

const ProjectTxModal: React.FC<ProjectTxModalProps> = ({ onClose, onSave }) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ type, label, amount: parseFloat(amount), date });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('projects.addEntry')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {t('transactions.expense')}
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {t('transactions.income')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('projects.entryLabel')}</label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('projects.entryLabelPlaceholder')}
              autoFocus
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

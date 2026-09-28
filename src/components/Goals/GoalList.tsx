import React, { useState } from 'react';
import { Target, Plus, Edit, Trash2, X, TrendingUp, Check, Calendar } from 'lucide-react';
import { useGoals } from '../../hooks/useGoals';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { Goal } from '../../types';

const GOAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316'];
const GOAL_CATEGORIES = ['Immobilier', 'Éducation', 'Épargne', 'Voyage', 'Véhicule', 'Retraite', 'Autre'];

export const GoalList: React.FC = () => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { goals, loading, addGoal, updateGoal, deleteGoal, contribute } = useGoals();

  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const handleAdd = () => {
    setEditingGoal(null);
    setShowModal(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('goals.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Suivez vos objectifs d'épargne</p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('goals.add')}
        </button>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-56 rounded-2xl shimmer-bg" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Target className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('goals.noGoals')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('goals.noGoalsDesc')}</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('goals.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal, index) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const isCompleted = progress >= 100;
            const daysLeft = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={goal.id}
                className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover group animate-slide-up overflow-hidden"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
                  style={{ backgroundColor: goal.color || '#3B82F6' }}
                />

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: goal.color || '#3B82F6' }}
                    >
                      {isCompleted ? <Check className="w-5 h-5 text-white" /> : <Target className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{goal.category}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(goal)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(goal.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative mb-3">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${goal.color || '#3B82F6'}, ${goal.color || '#10B981'})`,
                      }}
                    />
                  </div>
                  <span className="absolute right-0 -top-5 text-xs font-semibold text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
                </div>

                {/* Amounts */}
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(goal.current_amount)}</span>
                  <span className="text-gray-400 dark:text-gray-500">/ {formatCurrency(goal.target_amount)}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {goal.deadline ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
                      <Calendar className="w-3.5 h-3.5" />
                      {daysLeft !== null && (
                        <span className={isCompleted ? 'text-emerald-500' : daysLeft < 0 ? 'text-red-500 font-medium' : ''}>
                          {isCompleted
                            ? t('goals.completed')
                            : daysLeft < 0
                              ? t('goals.overdue')
                              : `${daysLeft} ${t('goals.daysLeft')}`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">Sans échéance</span>
                  )}

                  {!isCompleted && (
                    <button
                      onClick={() => setContributeGoal(goal)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:gap-1.5 transition-all"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      {t('goals.contribute')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <GoalModal
          editingGoal={editingGoal}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            if (editingGoal) {
              await updateGoal(editingGoal.id, data);
            } else {
              await addGoal(data);
            }
            setShowModal(false);
          }}
        />
      )}

      {/* Contribute modal */}
      {contributeGoal && (
        <ContributeModal
          goal={contributeGoal}
          onClose={() => setContributeGoal(null)}
          onContribute={async (amount) => {
            await contribute(contributeGoal.id, amount);
            setContributeGoal(null);
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
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('goals.deleteConfirm')}</h3>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (deleteId) await deleteGoal(deleteId);
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
    </div>
  );
};

// --- Goal Modal ---
interface GoalModalProps {
  editingGoal: Goal | null;
  onClose: () => void;
  onSave: (data: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
}

const GoalModal: React.FC<GoalModalProps> = ({ editingGoal, onClose, onSave }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState(editingGoal?.title || '');
  const [targetAmount, setTargetAmount] = useState(editingGoal?.target_amount.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(editingGoal?.current_amount.toString() || '0');
  const [deadline, setDeadline] = useState(editingGoal?.deadline || '');
  const [category, setCategory] = useState(editingGoal?.category || 'Épargne');
  const [color, setColor] = useState(editingGoal?.color || GOAL_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
      category,
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
            {editingGoal ? t('goals.edit') : t('goals.add')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.title_field')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="Ex: Achat Terrain"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.targetAmount')}</label>
              <input
                type="number"
                required
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.currentAmount')}</label>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.deadline')}</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Couleur</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
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

// --- Contribute Modal ---
interface ContributeModalProps {
  goal: Goal;
  onClose: () => void;
  onContribute: (amount: number) => Promise<void>;
}

const ContributeModal: React.FC<ContributeModalProps> = ({ goal, onClose, onContribute }) => {
  const { t } = useLanguage();
  const { formatCurrency } = useRegion();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const remaining = goal.target_amount - goal.current_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onContribute(parseFloat(amount));
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('goals.contribute')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Reste: <span className="font-semibold">{formatCurrency(remaining)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('goals.contributeAmount')}</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="0"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all">
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

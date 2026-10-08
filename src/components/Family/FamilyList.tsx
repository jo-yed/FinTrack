import React, { useState, useMemo } from 'react';
import { Users, Briefcase, Plus, Edit, Trash2, X, AlertCircle, User, Wallet, TrendingDown, TrendingUp, Crown, Heart, GraduationCap, Baby } from 'lucide-react';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useTransactions } from '../../hooks/useTransactions';
import { useRegion } from '../../hooks/useRegion';
import { useLanguage } from '../../i18n';
import type { FamilyMember } from '../../types';

const ROLES = [
  { id: 'Père', icon: Crown },
  { id: 'Mère', icon: Heart },
  { id: 'Fils', icon: GraduationCap },
  { id: 'Fille', icon: GraduationCap },
  { id: 'Enfant', icon: Baby },
  { id: 'Autre', icon: User },
];

const AVATAR_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#F97316', '#84CC16'];

function getRoleIcon(role: string) {
  return ROLES.find(r => r.id === role)?.icon || User;
}

export const FamilyList: React.FC = () => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { members, loading, addMember, updateMember, deleteMember } = useFamilyMembers();
  const { transactions } = useTransactions();

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const memberStats = useMemo(() => {
    const stats: Record<string, { income: number; expenses: number; txCount: number }> = {};
    members.forEach(m => { stats[m.id] = { income: 0, expenses: 0, txCount: 0 }; });
    transactions.forEach(tx => {
      if (tx.family_member_id && stats[tx.family_member_id]) {
        if (tx.type === 'income') stats[tx.family_member_id].income += tx.amount;
        else stats[tx.family_member_id].expenses += tx.amount;
        stats[tx.family_member_id].txCount++;
      }
    });
    return stats;
  }, [members, transactions]);

  const memberTransactions = useMemo(() => {
    if (!selectedMember) return [];
    return transactions.filter(tx => tx.family_member_id === selectedMember).slice(0, 10);
  }, [transactions, selectedMember]);

  const selectedMemberData = members.find(m => m.id === selectedMember);
  const selectedStats = selectedMember ? memberStats[selectedMember] : null;
  const selectedMonthlyExpenses = useMemo(() => {
    if (!selectedMember) return 0;
    return transactions
      .filter(tx => tx.family_member_id === selectedMember && tx.type === 'expense' && tx.date.startsWith(currentMonthStr))
      .reduce((s, tx) => s + tx.amount, 0);
  }, [transactions, selectedMember, currentMonthStr]);

  const totalFamilyExpenses = useMemo(() => {
    return Object.values(memberStats).reduce((s, st) => s + st.expenses, 0);
  }, [memberStats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('family.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('family.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingMember(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-pink-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('family.addMember')}
        </button>
      </div>

      <a
        href="#/activities"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 hover:bg-violet-100/60 dark:hover:bg-violet-900/20 transition-colors animate-fade-in"
      >
        <Briefcase className="w-4 h-4 text-violet-500 flex-shrink-0" />
        <span className="text-xs sm:text-sm text-violet-700 dark:text-violet-300">
          {t('activities.familyNote')} <strong>{t('activities.title')}</strong>.
        </span>
      </a>

      {/* Overview card */}
      {members.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 text-white animate-slide-up overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">{t('family.members')}</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">{t('family.totalExpenses')}</p>
              <p className="text-2xl font-bold text-pink-400">{formatCurrency(totalFamilyExpenses)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">{t('family.totalTransactions')}</p>
              <p className="text-2xl font-bold">{Object.values(memberStats).reduce((s, st) => s + st.txCount, 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">{t('family.avgPerMember')}</p>
              <p className="text-2xl font-bold text-blue-400">
                {members.length > 0 ? formatCurrency(totalFamilyExpenses / members.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Member cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-48 rounded-2xl shimmer-bg" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('family.empty')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('family.emptyDesc')}</p>
          <button
            onClick={() => { setEditingMember(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('family.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, index) => {
            const stats = memberStats[member.id] || { income: 0, expenses: 0, txCount: 0 };
            const balance = stats.income - stats.expenses;
            const monthlyExpenses = transactions
              .filter(tx => tx.family_member_id === member.id && tx.type === 'expense' && tx.date.startsWith(currentMonthStr))
              .reduce((s, tx) => s + tx.amount, 0);
            const allowanceProgress = member.monthly_allowance > 0 ? (monthlyExpenses / member.monthly_allowance) * 100 : 0;
            const Icon = getRoleIcon(member.role);

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover group animate-slide-up overflow-hidden relative cursor-pointer"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => setSelectedMember(member.id)}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: member.avatar_color }} />
                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white text-lg font-bold" style={{ backgroundColor: member.avatar_color }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        <Icon className="w-3 h-3" />
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingMember(member); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(member.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.income)}</p>
                    <p className="text-[10px] text-gray-400">{t('family.income')}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">{formatCurrency(stats.expenses)}</p>
                    <p className="text-[10px] text-gray-400">{t('family.spent')}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Wallet className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                    <p className={`text-xs font-semibold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(balance)}</p>
                    <p className="text-[10px] text-gray-400">{t('family.balance')}</p>
                  </div>
                </div>

                {member.monthly_allowance > 0 && (
                  <div className="relative">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-400 dark:text-gray-500">{t('family.allowance')}</span>
                      <span className={`font-medium ${allowanceProgress > 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatCurrency(monthlyExpenses)} / {formatCurrency(member.monthly_allowance)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-700 ${allowanceProgress > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-pink-400 to-rose-400'}`} style={{ width: `${Math.min(allowanceProgress, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="relative mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-between">
                  <span>{stats.txCount} {t('family.transactions')}</span>
                  <span className="text-pink-500 font-medium group-hover:translate-x-0.5 transition-transform">{t('family.viewDetails')} →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selectedMember && selectedMemberData && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setSelectedMember(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 z-50 shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white text-lg font-bold" style={{ backgroundColor: selectedMemberData.avatar_color }}>
                  {selectedMemberData.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMemberData.name}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{selectedMemberData.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedStats?.income || 0)}</p>
                  <p className="text-xs text-gray-400">{t('family.income')}</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedStats?.expenses || 0)}</p>
                  <p className="text-xs text-gray-400">{t('family.spent')}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Wallet className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className={`text-sm font-bold ${(selectedStats?.income || 0) - (selectedStats?.expenses || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency((selectedStats?.income || 0) - (selectedStats?.expenses || 0))}
                  </p>
                  <p className="text-xs text-gray-400">{t('family.balance')}</p>
                </div>
              </div>

              {selectedMemberData.monthly_allowance > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">{t('family.thisMonth')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedMonthlyExpenses)} / {formatCurrency(selectedMemberData.monthly_allowance)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${selectedMonthlyExpenses > selectedMemberData.monthly_allowance ? 'bg-red-500' : 'bg-gradient-to-r from-pink-400 to-rose-400'}`} style={{ width: `${Math.min((selectedMonthlyExpenses / selectedMemberData.monthly_allowance) * 100, 100)}%` }} />
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('family.recentActivity')}</h3>
                {memberTransactions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-600">{t('family.noActivity')}</div>
                ) : (
                  <div className="space-y-2">
                    {memberTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{tx.category} • {new Date(tx.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <FamilyModal
          editingMember={editingMember}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingMember) { await updateMember(editingMember.id, data); }
              else { await addMember(data); }
              setShowModal(false);
            } catch (err: any) { setError(err.message); }
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-1">{t('family.deleteConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t('common.cancel')}</button>
              <button onClick={async () => { if (deleteId) { try { await deleteMember(deleteId); } catch (err: any) { setError(err.message); } } setDeleteId(null); }} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-lg animate-slide-up max-w-sm z-50">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

interface FamilyModalProps {
  editingMember: FamilyMember | null;
  onClose: () => void;
  onSave: (data: { name: string; role: string; avatar_color: string; monthly_allowance: number }) => Promise<void>;
}

const FamilyModal: React.FC<FamilyModalProps> = ({ editingMember, onClose, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(editingMember?.name || '');
  const [role, setRole] = useState(editingMember?.role || 'Père');
  const [color, setColor] = useState(editingMember?.avatar_color || AVATAR_COLORS[0]);
  const [allowance, setAllowance] = useState(editingMember?.monthly_allowance.toString() || '0');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, role, avatar_color: color, monthly_allowance: parseFloat(allowance) || 0 });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingMember ? t('family.editMember') : t('family.addMember')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white text-2xl font-bold" style={{ backgroundColor: color }}>
              {name.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('family.name')}</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" placeholder={t('family.namePlaceholder')} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('family.role')}</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${role === r.id ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    <Icon className="w-4 h-4" />
                    {r.id}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('family.color')}</label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-900 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('family.allowanceLabel')}</label>
            <input type="number" min="0" step="0.01" value={allowance} onChange={(e) => setAllowance(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm" placeholder="0" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('family.allowanceHint')}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-pink-500/20 disabled:opacity-50 transition-all">{saving ? '...' : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

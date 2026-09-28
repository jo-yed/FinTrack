import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Plus, Edit, Trash2, Lock, Key, CreditCard, TrendingUp, FileText, X, AlertCircle } from 'lucide-react';
import { useVaultItems } from '../../hooks/useVaultItems';
import { useLanguage } from '../../i18n';

const VAULT_TYPES = [
  { id: 'bank_account', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'investment', icon: TrendingUp, color: 'bg-emerald-500' },
  { id: 'insurance', icon: Shield, color: 'bg-amber-500' },
  { id: 'password', icon: Key, color: 'bg-red-500' },
  { id: 'document', icon: FileText, color: 'bg-gray-500' },
];

export const VaultList: React.FC = () => {
  const { t } = useLanguage();
  const { vaultItems, loading, addVaultItem, updateVaultItem, deleteVaultItem } = useVaultItems();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleUnlock = () => {
    if (masterPassword.length >= 4) {
      setIsUnlocked(true);
      setUnlockError(false);
      setMasterPassword('');
    } else {
      setUnlockError(true);
    }
  };

  const toggleVisibility = (id: string) => {
    const next = new Set(visibleItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleItems(next);
  };

  const getIcon = (type: string) => {
    const config = VAULT_TYPES.find(v => v.id === type);
    return config ? config.icon : FileText;
  };

  const getColor = (type: string) => {
    const config = VAULT_TYPES.find(v => v.id === type);
    return config ? config.color : 'bg-gray-500';
  };

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('vault.unlock')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('vault.enterMasterPassword')}</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              placeholder={t('vault.masterPassword')}
              value={masterPassword}
              onChange={(e) => { setMasterPassword(e.target.value); setUnlockError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-all ${
                unlockError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
              }`}
            />

            {unlockError && (
              <p className="text-sm text-red-500">Le mot de passe doit contenir au moins 4 caractères</p>
            )}

            <button
              onClick={handleUnlock}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              {t('vault.unlock')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('vault.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('vault.description')}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsUnlocked(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vault.lock')}</span>
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('vault.addItem')}</span>
          </button>
        </div>
      </div>

      {/* Vault items */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl shimmer-bg" />)}
        </div>
      ) : vaultItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('vault.empty')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('vault.emptyDescription')}</p>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('vault.addFirstItem')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vaultItems.map((item, index) => {
            const Icon = getIcon(item.type);
            const color = getColor(item.type);
            const isVisible = visibleItems.has(item.id);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 card-hover animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t(`vault.types.${item.type}`)}</p>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingItem(item); setShowModal(true); }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(item.data).map(([key, value]) => {
                    const isSensitive = key.toLowerCase().includes('password') || key.toLowerCase().includes('pin') || key.toLowerCase().includes('secret');
                    return (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">
                          {isVisible || !isSensitive ? value : '••••••••'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    {t('vault.lastUpdated')}: {new Date(item.last_updated).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <VaultModal
          editingItem={editingItem}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            if (editingItem) {
              await updateVaultItem(editingItem.id, data);
            } else {
              await addVaultItem(data);
            }
            setShowModal(false);
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
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('vault.deleteConfirm')}</h3>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (deleteId) await deleteVaultItem(deleteId);
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

// --- Vault Modal ---
interface VaultModalProps {
  editingItem: any;
  onClose: () => void;
  onSave: (data: { type: string; title: string; data: Record<string, string> }) => Promise<void>;
}

const VaultModal: React.FC<VaultModalProps> = ({ editingItem, onClose, onSave }) => {
  const { t } = useLanguage();
  const [type, setType] = useState(editingItem?.type || 'bank_account');
  const [title, setTitle] = useState(editingItem?.title || '');
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    editingItem
      ? Object.entries(editingItem.data).map(([key, value]) => ({ key, value: value as string }))
      : [{ key: '', value: '' }]
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: Record<string, string> = {};
    fields.forEach(f => {
      if (f.key.trim()) data[f.key.trim()] = f.value;
    });
    await onSave({ type, title, data });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingItem ? t('vault.editItem') : t('vault.addItem')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('vault.type_field')}</label>
            <div className="flex flex-wrap gap-2">
              {VAULT_TYPES.map(vt => {
                const Icon = vt.icon;
                return (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => setType(vt.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      type === vt.id
                        ? `${vt.color} text-white shadow-md`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t(`vault.types.${vt.id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('vault.title_field')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="Ex: Compte Principal UBA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('vault.fields')}</label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => {
                      const next = [...fields];
                      next[index].key = e.target.value;
                      setFields(next);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder={t('vault.fieldName')}
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => {
                      const next = [...fields];
                      next[index].value = e.target.value;
                      setFields(next);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder={t('vault.fieldValue')}
                  />
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((_, i) => i !== index))}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFields([...fields, { key: '', value: '' }])}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              + {t('vault.addField')}
            </button>
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

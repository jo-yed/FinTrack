import React, { useState } from 'react';
import {
  Shield, Eye, EyeOff, Plus, Edit, Trash2, Lock, Key, CreditCard, TrendingUp, FileText, X, Loader2,
  ShieldCheck, KeyRound, Copy, Check,
} from 'lucide-react';
import { useVault } from '../../hooks/useVault';
import { useLanguage } from '../../i18n';
import type { VaultItem } from '../../types';

const VAULT_TYPES = [
  { id: 'bank_account', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'investment', icon: TrendingUp, color: 'bg-emerald-500' },
  { id: 'insurance', icon: Shield, color: 'bg-amber-500' },
  { id: 'password', icon: Key, color: 'bg-red-500' },
  { id: 'document', icon: FileText, color: 'bg-gray-500' },
];

const MIN_PASSWORD = 8;
const inputCls =
  'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm transition-all';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full">{children}</div>
  </div>
);

const LockIcon: React.FC<{ icon?: React.ReactNode }> = ({ icon }) => (
  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
    {icon ?? <Lock className="w-8 h-8 text-white" />}
  </div>
);

/* ---------------- Création du mot de passe maître ---------------- */

const VaultSetup: React.FC = () => {
  const { t } = useLanguage();
  const { setupVault } = useVault();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(t('vaultSafe.passwordMin'));
    if (password !== confirm) return setError(t('vaultSafe.passwordsMismatch'));
    setBusy(true);
    try {
      await setupVault(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <LockIcon icon={<ShieldCheck className="w-8 h-8 text-white" />} />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('vaultSafe.setupTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('vaultSafe.setupDesc')}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <input type="password" autoFocus autoComplete="new-password" className={inputCls} placeholder={t('vault.masterPassword')} value={password} onChange={e => setPassword(e.target.value)} />
        <input type="password" autoComplete="new-password" className={inputCls} placeholder={t('vaultSafe.confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} />
        <p className="text-xs text-gray-400">{t('vaultSafe.passwordMin')}</p>
        <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" className="mt-0.5 rounded border-gray-300" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
          {t('vaultSafe.understand')}
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={busy || !understood || !password} className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? t('vaultSafe.working') : t('vaultSafe.create')}
        </button>
      </form>
    </Card>
  );
};

/* ---------------- Déverrouillage + réinitialisation ---------------- */

const VaultUnlock: React.FC = () => {
  const { t } = useLanguage();
  const { unlock, resetVault } = useVault();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetText, setResetText] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await unlock(password);
      if (!ok) {
        setError(t('vaultSafe.wrongPassword'));
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const doReset = async () => {
    setBusy(true);
    try {
      await resetVault();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <LockIcon />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('vault.unlock')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('vault.enterMasterPassword')}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder={t('vault.masterPassword')}
          value={password}
          onChange={e => { setPassword(e.target.value); setError(null); }}
          className={`${inputCls} ${error ? 'border-red-300 focus:ring-red-500' : ''}`}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={busy || !password} className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? t('vaultSafe.working') : t('vault.unlock')}
        </button>
      </form>

      <div className="mt-5 text-center">
        {!showReset ? (
          <button onClick={() => setShowReset(true)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
            {t('vaultSafe.forgot')}
          </button>
        ) : (
          <div className="text-left p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 space-y-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{t('vaultSafe.resetTitle')}</p>
            <p className="text-xs text-red-600 dark:text-red-400">{t('vaultSafe.resetWarn')}</p>
            <input className={inputCls} value={resetText} onChange={e => setResetText(e.target.value)} placeholder={t('vaultSafe.resetConfirmLabel')} />
            <button
              onClick={doReset}
              disabled={busy || resetText.trim().toUpperCase() !== t('vaultSafe.resetWord')}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
            >
              {t('vaultSafe.resetAction')}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

/* ---------------- Changement du mot de passe maître ---------------- */

const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useLanguage();
  const { changeMasterPassword } = useVault();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPw.length < MIN_PASSWORD) return setError(t('vaultSafe.passwordMin'));
    if (newPw !== confirm) return setError(t('vaultSafe.passwordsMismatch'));
    setBusy(true);
    try {
      const ok = await changeMasterPassword(oldPw, newPw);
      if (!ok) setError(t('vaultSafe.wrongPassword'));
      else setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('vaultSafe.changePassword')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        {done ? (
          <div className="p-6 text-center space-y-4">
            <Check className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-gray-700 dark:text-gray-300">{t('vaultSafe.passwordChanged')}</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl">{t('common.close')}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-3">
            <input type="password" autoFocus autoComplete="current-password" className={inputCls} placeholder={t('vaultSafe.oldPassword')} value={oldPw} onChange={e => setOldPw(e.target.value)} />
            <input type="password" autoComplete="new-password" className={inputCls} placeholder={t('vaultSafe.newPassword')} value={newPw} onChange={e => setNewPw(e.target.value)} />
            <input type="password" autoComplete="new-password" className={inputCls} placeholder={t('vaultSafe.confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl">{t('common.cancel')}</button>
              <button type="submit" disabled={busy || !oldPw || !newPw} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl disabled:opacity-50">
                {busy ? t('vaultSafe.working') : t('common.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ---------------- Coffre déverrouillé ---------------- */

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copier"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* presse-papiers indisponible */ }
      }}
      className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const VaultContent: React.FC = () => {
  const { t, lang } = useLanguage();
  const { items, loading, lock, addVaultItem, updateVaultItem, deleteVaultItem } = useVault();
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleVisibility = (id: string) => {
    setVisibleItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeConfig = (type: string) => VAULT_TYPES.find(v => v.id === type);
  const isSensitiveKey = (key: string) => /password|mot de passe|pin|secret|code|cvv|cvc|iban|rib/i.test(key);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('vault.title')}</h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> {t('vaultSafe.encryptedBadge')}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('vault.description')} · {t('vaultSafe.autoLock')}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowChangePw(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
            <KeyRound className="w-4 h-4" />
            <span className="hidden md:inline">{t('vaultSafe.changePassword')}</span>
          </button>
          <button onClick={lock} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">{t('vault.lock')}</span>
          </button>
          <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>{t('vault.addItem')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl shimmer-bg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('vault.empty')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-600 mb-4">{t('vault.emptyDescription')}</p>
          <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            {t('vault.addFirstItem')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item, index) => {
            const cfg = typeConfig(item.type);
            const Icon = cfg?.icon ?? FileText;
            const isVisible = visibleItems.has(item.id);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 card-hover animate-slide-up group" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${cfg?.color ?? 'bg-gray-500'} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t(`vault.types.${item.type}`)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleVisibility(item.id)} aria-label="Afficher / masquer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setEditingItem(item); setShowModal(true); }} aria-label={t('common.edit')} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} aria-label={t('common.delete')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(item.data).map(([key, value]) => {
                    const sensitive = isSensitiveKey(key);
                    return (
                      <div key={key} className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="flex items-center gap-1 font-medium text-gray-900 dark:text-white font-mono text-xs min-w-0">
                          <span className="truncate">{isVisible || !sensitive ? value : '••••••••'}</span>
                          {(isVisible || !sensitive) && value && <CopyButton value={value} />}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    {t('vault.lastUpdated')}: {new Date(item.last_updated).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <VaultModal
          editingItem={editingItem}
          onClose={() => setShowModal(false)}
          onSave={async data => {
            try {
              if (editingItem) await updateVaultItem(editingItem.id, data);
              else await addVaultItem(data);
              setShowModal(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        />
      )}

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white pt-2">{t('vault.deleteConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t('common.cancel')}</button>
              <button
                onClick={async () => {
                  if (deleteId) {
                    try { await deleteVaultItem(deleteId); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
                  }
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

      {error && (
        <div className="fixed bottom-6 right-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-lg max-w-sm z-50">
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2" aria-label={t('common.close')}><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

/* ---------------- Page ---------------- */

export const VaultList: React.FC = () => {
  const { status } = useVault();

  if (status === 'loading') {
    return <div className="flex items-center justify-center py-24 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }
  if (status === 'setup') return <VaultSetup />;
  if (status === 'locked') return <VaultUnlock />;
  return <VaultContent />;
};

/* ---------------- Modale d'ajout / modification ---------------- */

interface VaultModalProps {
  editingItem: VaultItem | null;
  onClose: () => void;
  onSave: (data: { type: string; title: string; data: Record<string, string> }) => Promise<void>;
}

const VaultModal: React.FC<VaultModalProps> = ({ editingItem, onClose, onSave }) => {
  const { t } = useLanguage();
  const [type, setType] = useState(editingItem?.type || 'bank_account');
  const [title, setTitle] = useState(editingItem?.title || '');
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    editingItem
      ? Object.entries(editingItem.data).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }],
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: Record<string, string> = {};
    fields.forEach(f => {
      if (f.key.trim()) data[f.key.trim()] = f.value;
    });
    await onSave({ type, title: title.trim(), data });
    setSaving(false);
  };

  const fieldCls =
    'flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingItem ? t('vault.editItem') : t('vault.addItem')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
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
                  <button key={vt.id} type="button" onClick={() => setType(vt.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${type === vt.id ? `${vt.color} text-white shadow-md` : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    <Icon className="w-4 h-4" />
                    {t(`vault.types.${vt.id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('vault.title_field')}</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder="Ex: Compte Principal UBA" />
            <p className="text-xs text-gray-400 mt-1">{t('vaultSafe.titleNote')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('vault.fields')}</label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <input type="text" value={field.key} className={fieldCls} placeholder={t('vault.fieldName')}
                    onChange={e => setFields(prev => prev.map((f, i) => (i === index ? { ...f, key: e.target.value } : f)))} />
                  <input type="text" value={field.value} className={fieldCls} placeholder={t('vault.fieldValue')}
                    onChange={e => setFields(prev => prev.map((f, i) => (i === index ? { ...f, value: e.target.value } : f)))} />
                  <button type="button" onClick={() => setFields(fields.filter((_, i) => i !== index))} aria-label="Retirer" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFields([...fields, { key: '', value: '' }])} className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              + {t('vault.addField')}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

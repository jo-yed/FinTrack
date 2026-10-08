import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, Mail, Smartphone } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n';
import { validFullName } from '../../lib/avatar';
import { formatPhone } from '../../lib/phone';
import { AvatarPicker } from './AvatarPicker';
import type { AvatarValue } from './AvatarPicker';

export const ProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useLanguage();
  const { profile, save, email } = useProfile();
  const { isMember } = useAccess();
  const { session } = useAuth();
  const phone = String((session?.user?.user_metadata as { phone?: string } | undefined)?.phone ?? '');
  const [name, setName] = useState(profile.fullName);
  const [look, setLook] = useState<AvatarValue>({ gender: profile.gender, ageGroup: profile.ageGroup, skin: profile.skin, color: profile.color });
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shownPhoto = photo === undefined ? profile.photo : photo;
  const valid = validFullName(name);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError(t('profile.nameInvalid')); return; }
    setSaving(true);
    setError('');
    try {
      await save({ fullName: name, gender: look.gender, ageGroup: look.ageGroup, skin: look.skin, color: look.color, photo });
      onClose();
    } catch {
      setError(t('profile.saveError'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label={t('profile.title')}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[92vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('profile.title')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <AvatarPicker name={name} value={look} onChange={setLook} photo={shownPhoto} onPhotoChange={p => setPhoto(p)} />

          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('profile.fullName')}</label>
            <input id="profile-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} required autoComplete="name"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              placeholder={t('profile.namePlaceholder')} />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {isMember ? <Smartphone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            <span className="truncate">{isMember ? (phone ? formatPhone(phone) : '') : email}</span>
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex gap-3 p-5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">{t('common.cancel')}</button>
          <button type="submit" disabled={saving || !valid} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useLanguage } from '../../i18n';

const dismissedKey = (userId: string) => `fintrack.profilePrompt.${userId}`;

function wasDismissed(key: string): boolean {
  try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
}

/**
 * Invite l'utilisateur à compléter son profil (nom, sexe, âge, avatar) tant que c'est incomplet :
 * la fenêtre s'ouvre une fois à la première visite, puis un bandeau discret reste disponible.
 */
export const ProfilePrompt: React.FC<{ userId: string }> = ({ userId }) => {
  const { t } = useLanguage();
  const { isComplete, hasName, openProfile } = useProfile();
  const key = dismissedKey(userId);
  const [hidden, setHidden] = useState(() => wasDismissed(key));

  // Première visite sans nom : on ouvre directement la fenêtre (une seule fois par appareil)
  useEffect(() => {
    if (hasName) return;
    const asked = `fintrack.profileAsked.${userId}`;
    try {
      if (localStorage.getItem(asked)) return;
      localStorage.setItem(asked, '1');
    } catch { return; }
    const timer = window.setTimeout(openProfile, 900);
    return () => window.clearTimeout(timer);
  }, [hasName, userId, openProfile]);

  if (isComplete || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(key, '1'); } catch { /* stockage indisponible */ }
  };

  return (
    <div className="print:hidden flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 border-b border-blue-100 dark:border-blue-900/40 animate-fade-in">
      <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{hasName ? t('profile.promptAvatar') : t('profile.promptName')}</p>
      <button onClick={openProfile} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">{t('profile.complete')}</button>
      <button onClick={dismiss} aria-label={t('common.close')} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
};

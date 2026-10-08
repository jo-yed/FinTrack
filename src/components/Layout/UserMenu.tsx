import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings as SettingsIcon, UserRound } from 'lucide-react';
import { Avatar } from '../Brand/Avatar';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { useAccess } from '../../hooks/useAccess';
import { useLanguage } from '../../i18n';
import { formatPhone } from '../../lib/phone';
import type { PageId } from '../../types';

/** Rôle affiché sous le nom : super admin, membre de famille ou propriétaire. */
export function useRoleLabel(): string {
  const { t } = useLanguage();
  const { isMember, isPlatformAdmin } = useAccess();
  if (isPlatformAdmin) return t('profile.roleAdmin');
  return isMember ? t('profile.roleMember') : t('profile.roleOwner');
}

export const UserMenu: React.FC<{ onNavigate: (page: PageId) => void }> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { profile, displayName, email } = useProfile();
  const { signOut, session } = useAuth();
  const { isMember } = useAccess();
  const { openProfile } = useProfile();
  const role = useRoleLabel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const phone = String((session?.user?.user_metadata as { phone?: string } | undefined)?.phone ?? '');
  const contact = isMember ? (phone ? formatPhone(phone) : '') : email;
  const shownName = displayName || t('profile.anonymous');
  const item = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={shownName}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Avatar name={displayName} color={profile.color} gender={profile.gender} ageGroup={profile.ageGroup} skin={profile.skin} photo={profile.photo} size={34} />
        <span className="hidden md:block max-w-[9rem] truncate text-sm font-medium text-gray-800 dark:text-gray-200">{shownName}</span>
        <ChevronDown className={`hidden md:block w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-scale-in z-30">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
            <Avatar name={displayName} color={profile.color} gender={profile.gender} ageGroup={profile.ageGroup} skin={profile.skin} photo={profile.photo} size={48} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{shownName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">{role}</span>
            </div>
          </div>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); openProfile(); }}><UserRound className="w-4 h-4" />{t('profile.editMenu')}</button>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); onNavigate('settings'); }}><SettingsIcon className="w-4 h-4" />{t('common.settings')}</button>
          <button role="menuitem" className={`${item} text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-gray-800`} onClick={() => { setOpen(false); void signOut(); }}><LogOut className="w-4 h-4" />{t('common.logout')}</button>
        </div>
      )}
    </div>
  );
};

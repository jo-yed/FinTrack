import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, Megaphone, X } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { useLanguage } from '../../i18n';

const STYLE = {
  info: { box: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200', icon: Info },
  warning: { box: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200', icon: Megaphone },
  critical: { box: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200', icon: AlertTriangle },
} as const;

const KEY = 'fintrack.announcement.dismissed';

/** Message de la plateforme (maintenance, nouveauté…) publié par le super administrateur. */
export const AnnouncementBanner: React.FC = () => {
  const { t } = useLanguage();
  const { announcement } = useAccess();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(KEY)); } catch { setDismissed(null); }
  }, []);

  if (!announcement || announcement.text === dismissed) return null;
  const { box, icon: Icon } = STYLE[announcement.level];

  return (
    <div className={`print:hidden flex items-start gap-3 px-4 py-3 border-b text-sm ${box}`} role="status">
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 break-words">{announcement.text}</p>
      {announcement.level !== 'critical' && (
        <button
          aria-label={t('common.close')}
          onClick={() => {
            try { sessionStorage.setItem(KEY, announcement.text); } catch { /* stockage indisponible */ }
            setDismissed(announcement.text);
          }}
          className="opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Check, Clock, Copy, Loader2, LogOut, MessageCircle, RefreshCw, ShieldOff, UserX } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n';
import { formatPhone } from '../../lib/phone';
import { Logo } from '../Brand/Logo';
import { fill } from '../Activities/shared';

export function formatRequestCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Écran affiché à un membre dont l'accès n'est pas (ou plus) actif : code à transmettre, suspension ou refus. */
export const PendingAccess: React.FC = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { access, accessState, refresh, renewRequest } = useAccess();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = access?.request_code ? formatRequestCode(access.request_code) : '';
  const name = access?.full_name ?? '';
  const message = fill(t('member.pending.whatsapp'), {
    name,
    code,
    phone: access ? formatPhone(access.phone) : '',
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* presse-papiers indisponible */ }
  };

  const reload = async () => {
    setBusy(true);
    await refresh();
    setBusy(false);
  };

  const renew = async () => {
    setBusy(true);
    setError(null);
    try {
      await renewRequest();
    } catch {
      setError(t('member.pending.renewFailed'));
    }
    setBusy(false);
  };

  const waiting = accessState === 'requested';
  const suspended = accessState === 'suspended';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <Logo size={44} />
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">FinTrack</span>
        </div>

        {waiting && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('member.pending.title')}</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{fill(t('member.pending.hello'), { name })}</p>

            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 mb-5 list-decimal list-inside">
              <li>{t('member.pending.step1')}</li>
              <li>{t('member.pending.step2')}</li>
              <li>{t('member.pending.step3')}</li>
            </ol>

            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-900/40 p-5 text-center mb-4">
              <p className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-2">{t('member.pending.yourCode')}</p>
              <p className="text-3xl font-bold font-mono tracking-widest text-gray-900 dark:text-white select-all" data-testid="request-code">{code}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={copy} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />} {copied ? t('member.pending.copied') : t('member.pending.copy')}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>

            <button onClick={reload} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t('member.pending.refresh')}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">{t('member.pending.autoRefresh')}</p>
          </>
        )}

        {suspended && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <ShieldOff className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('member.suspended.title')}</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('member.suspended.desc')}</p>
            <button onClick={reload} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t('member.pending.refresh')}
            </button>
          </>
        )}

        {!waiting && !suspended && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <UserX className="w-5 h-5 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('member.rejected.title')}</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('member.rejected.desc')}</p>
            {error && <p className="text-sm text-red-500 mb-3" role="alert">{error}</p>}
            <button onClick={renew} disabled={busy} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('member.rejected.renew')}
            </button>
          </>
        )}

        <button onClick={() => void signOut()} className="mt-5 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
          <LogOut className="w-4 h-4" /> {t('common.logout')}
        </button>
      </div>
    </div>
  );
};

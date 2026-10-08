import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../i18n';

type Phase = 'loading' | 'unenrolled' | 'enrolling' | 'needs-code' | 'verified';

interface Enrollment {
  factorId: string;
  qr: string;
  secret: string;
}

const inputCls =
  'w-full px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white';

/** État de la double authentification (TOTP) du compte connecté et actions associées. */
export function useTwoFactor() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [factors, aal] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const verified = factors.data?.totp?.find(f => f.status === 'verified');
    if (!verified) {
      setFactorId(null);
      setPhase('unenrolled');
    } else {
      setFactorId(verified.id);
      setPhase(aal.data?.currentLevel === 'aal2' ? 'verified' : 'needs-code');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { phase, factorId, refresh };
}

/** Saisie du code à 6 chiffres de l'application d'authentification. */
const CodeInput: React.FC<{ onSubmit: (code: string) => Promise<void>; busy: boolean; label: string; error: string | null }> = ({ onSubmit, busy, label, error }) => {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (code.length === 6) void onSubmit(code); }}
      className="space-y-3"
    >
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        className={inputCls}
        placeholder="••••••"
        aria-label={label}
      />
      {error && <p className="text-sm text-red-500 text-center" role="alert">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </form>
  );
};

/** Activation : QR code à scanner + code de confirmation. */
export const TwoFactorEnroll: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { t } = useLanguage();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // On repart propre si une activation précédente n'a pas été terminée
      const factors = await supabase.auth.mfa.listFactors();
      for (const f of factors.data?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `FinTrack ${new Date().toISOString().slice(0, 10)}` });
      if (!alive) return;
      if (err || !data) { setError(t('mfa.enrollFailed')); return; }
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (code: string) => {
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    setBusy(false);
    if (err) setError(t('mfa.wrongCode'));
    else onDone();
  };

  if (!enrollment) {
    return error
      ? <p className="text-sm text-red-500">{error}</p>
      : <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
        <li>{t('mfa.step1')}</li>
        <li>{t('mfa.step2')}</li>
        <li>{t('mfa.step3')}</li>
      </ol>
      <div className="flex justify-center">
        <img src={enrollment.qr} alt={t('mfa.qrAlt')} className="w-44 h-44 rounded-xl bg-white p-2 border border-gray-200" />
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('mfa.manualKey')}</p>
        <button
          type="button"
          onClick={async () => { try { await navigator.clipboard.writeText(enrollment.secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* indisponible */ } }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300 break-all"
        >
          {enrollment.secret} {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <CodeInput onSubmit={verify} busy={busy} label={t('mfa.confirm')} error={error} />
    </div>
  );
};

/** Barrière : n'affiche son contenu qu'avec une session « deux facteurs » (AAL2). */
export const MfaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const { phase, factorId, refresh } = useTwoFactor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (phase === 'loading') {
    return <div className="flex justify-center py-24 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }
  if (phase === 'verified') return <>{children}</>;

  const challenge = async (code: string) => {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (err) setError(t('mfa.wrongCode'));
    else await refresh();
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{phase === 'unenrolled' ? t('mfa.requiredTitle') : t('mfa.challengeTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{phase === 'unenrolled' ? t('mfa.requiredDesc') : t('mfa.challengeDesc')}</p>
      </div>
      {phase === 'unenrolled' ? (
        <TwoFactorEnroll onDone={() => void refresh()} />
      ) : (
        <CodeInput onSubmit={challenge} busy={busy} label={t('mfa.verify')} error={error} />
      )}
    </div>
  );
};

/** Section des réglages : activer / désactiver la double authentification. */
export const TwoFactorSection: React.FC = () => {
  const { t } = useLanguage();
  const { phase, factorId, refresh } = useTwoFactor();
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disable = async () => {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (err) setError(t('mfa.disableNeedsCode'));
    else await refresh();
  };

  const enabled = phase === 'verified' || phase === 'needs-code';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldOff className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('mfa.sectionTitle')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{enabled ? t('mfa.enabled') : t('mfa.sectionDesc')}</p>
          </div>
        </div>
        {phase !== 'loading' && !enrolling && (
          enabled ? (
            <button onClick={disable} disabled={busy} className="px-4 py-2 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 disabled:opacity-50">
              {t('mfa.disable')}
            </button>
          ) : (
            <button onClick={() => setEnrolling(true)} className="px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
              {t('mfa.enable')}
            </button>
          )
        )}
      </div>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      {enrolling && (
        <div className="mt-5 max-w-sm mx-auto">
          <TwoFactorEnroll onDone={() => { setEnrolling(false); void refresh(); }} />
        </div>
      )}
    </div>
  );
};

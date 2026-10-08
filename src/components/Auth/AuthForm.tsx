import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, MailCheck, Phone, User, Users, Clock, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../i18n';
import { Logo } from '../Brand/Logo';
import { fill } from '../Activities/shared';
import { ApiError, apiErrorKey, callApi } from '../../lib/api';
import { normalizePhone, phoneToEmail } from '../../lib/phone';
import { IDLE_FLAG } from '../../lib/session';

type Mode = 'signin' | 'signup' | 'forgot' | 'confirm';
type Method = 'email' | 'phone';


const MIN_PASSWORD = 8;
const inputBase =
  'w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all';
const submitCls =
  'w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed group';

const Spinner = () => <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />;

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in" role="alert">
    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 2px, transparent 2px), radial-gradient(circle at 80% 20%, white 2px, transparent 2px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <Logo size={48} className="rounded-xl ring-1 ring-white/25" />
            <span className="text-2xl font-bold tracking-tight">FinTrack</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Gérez vos finances<br />avec intelligence.
            </h1>
            <p className="text-slate-300 text-lg max-w-md">
              Suivez vos transactions, vos budgets personnels, professionnels et familiaux,
              et gardez chaque justificatif — tout en un seul endroit.
            </p>
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold">AES-256</div>
                <div className="text-slate-400 text-sm">Coffre chiffré</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{t('nav.budgets')}</div>
                <div className="text-slate-400 text-sm">Perso · Pro · Famille</div>
              </div>
              <div>
                <div className="text-3xl font-bold">Mobile</div>
                <div className="text-slate-400 text-sm">Installable, hors ligne</div>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm">© {new Date().getFullYear()} FinTrack. Tous droits réservés.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo size={48} />
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">FinTrack</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export const AuthForm: React.FC = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('email');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneHelp, setPhoneHelp] = useState(false);
  const [idleNotice] = useState(() => {
    try {
      const flag = sessionStorage.getItem(IDLE_FLAG) === '1';
      sessionStorage.removeItem(IDLE_FLAG);
      return flag;
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const go = (next: Mode) => { setMode(next); setError(null); setInfo(null); setPhoneHelp(false); };
  const pick = (next: Method) => { setMethod(next); setError(null); setInfo(null); setPhoneHelp(false); };

  const friendly = (message: string) => (/email not confirmed/i.test(message) ? t('authx.notConfirmed') : message);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === 'signup') {
      if (password.length < MIN_PASSWORD) return setError(t('authx.passwordMin'));
      if (password !== confirmPassword) return setError(t('auth.passwordMismatch'));
    }

    // Connexion / inscription par téléphone : adresse technique dérivée du numéro
    if (method === 'phone' && (mode === 'signin' || mode === 'signup')) {
      const normalized = normalizePhone(phone);
      if (!normalized) return setError(t('authp.invalidPhone'));
      if (mode === 'signup' && fullName.trim().length < 2) return setError(t('authp.invalidName'));

      setLoading(true);
      try {
        if (mode === 'signup') {
          await callApi('member_register', { fullName: fullName.trim(), phone: normalized, password });
        }
        const { error: err } = await supabase.auth.signInWithPassword({ email: phoneToEmail(normalized), password });
        if (err) throw err;
      } catch (err) {
        if (err instanceof ApiError) setError(t(apiErrorKey(err)));
        else setError(/invalid login|credentials/i.test(err instanceof Error ? err.message : '') ? t('authp.wrongCredentials') : t('auth.error'));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        // Confirmation d'e-mail activée : aucune session tant que le lien n'est pas ouvert
        if (!data.session) go('confirm');
      } else if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (err) throw err;
        setInfo(fill(t('authx.linkSent'), { email }));
      }
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : t('auth.error')));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (err) setError(err.message);
    else setInfo(t('authx.resent'));
  };

  if (mode === 'confirm') {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('authx.checkEmailTitle')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{fill(t('authx.checkEmailDesc'), { email })}</p>
          {error && <ErrorBox message={error} />}
          {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}
          <button onClick={resend} disabled={loading} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline disabled:opacity-50">
            {t('authx.resend')}
          </button>
          <div>
            <button onClick={() => go('signin')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {t('authx.backToSignIn')}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const phoneField = (
    <div>
      <label htmlFor="auth-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('authp.phone')}</label>
      <div className="relative">
        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          id="auth-phone"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className={inputBase}
          placeholder="6 77 11 22 33"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{t('authp.phoneHint')}</p>
    </div>
  );

  const nameField = (
    <div>
      <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.name')}</label>
      <div className="relative">
        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input id="auth-name" required autoComplete="name" maxLength={80} value={fullName} onChange={e => setFullName(e.target.value)} className={inputBase} placeholder={t('authp.namePlaceholder')} />
      </div>
    </div>
  );

  const emailField = (
    <div>
      <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.email')}</label>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputBase} placeholder="vous@exemple.com" />
      </div>
    </div>
  );

  if (mode === 'forgot') {
    return (
      <Shell>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('authx.resetTitle')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('authx.resetDesc')}</p>
        {error && <ErrorBox message={error} />}
        {info && (
          <div className="flex items-start gap-2 p-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg" role="status">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">{info}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {emailField}
          <button type="submit" disabled={loading} className={submitCls}>
            {loading ? <Spinner /> : <>{t('authx.sendLink')}<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
          </button>
        </form>
        <p className="text-center text-sm mt-6">
          <button onClick={() => go('signin')} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{t('authx.backToSignIn')}</button>
        </p>
      </Shell>
    );
  }

  const tabCls = (active: boolean) =>
    `flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${active
      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`;

  return (
    <Shell>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('auth.welcome')}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">{t('auth.subtitle')}</p>

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
        <button type="button" onClick={() => go('signin')} className={tabCls(mode === 'signin')}>{t('auth.signIn')}</button>
        <button type="button" onClick={() => go('signup')} className={tabCls(mode === 'signup')}>{t('auth.signUp')}</button>
      </div>

      {idleNotice && mode === 'signin' && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" role="status">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-amber-700 dark:text-amber-300">{t('authp.idleSignedOut')}</span>
        </div>
      )}

      {/* Choix du mode de connexion / d'inscription */}
      <div className="grid grid-cols-2 gap-2 mb-5" role="group" aria-label={t('authp.method')}>
        <button
          type="button"
          onClick={() => pick('email')}
          aria-pressed={method === 'email'}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${method === 'email' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <Mail className="w-4 h-4" /> {mode === 'signup' ? t('authp.personal') : t('authp.byEmail')}
        </button>
        <button
          type="button"
          onClick={() => pick('phone')}
          aria-pressed={method === 'phone'}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${method === 'phone' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          {mode === 'signup' ? <Users className="w-4 h-4" /> : <Phone className="w-4 h-4" />} {mode === 'signup' ? t('authp.joinFamily') : t('authp.byPhone')}
        </button>
      </div>

      {method === 'phone' && mode === 'signup' && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
          <Info className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-emerald-800 dark:text-emerald-200">{t('authp.joinExplain')}</span>
        </div>
      )}

      {error && <ErrorBox message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {method === 'phone' && mode === 'signup' && nameField}
        {method === 'phone' ? phoneField : emailField}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => (method === 'phone' ? setPhoneHelp(v => !v) : go('forgot'))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('authx.forgot')}
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`${inputBase} pr-12`}
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Afficher / masquer" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {mode === 'signup' && <p className="text-xs text-gray-400 mt-1">{t('authx.passwordMin')}</p>}
          {phoneHelp && method === 'phone' && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">{t('authp.forgotPhone')}</p>
          )}
        </div>

        {mode === 'signup' && (
          <div className="animate-fade-in">
            <label htmlFor="auth-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input id="auth-confirm" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputBase} placeholder="••••••••" />
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className={submitCls}>
          {loading ? <Spinner /> : <>{mode === 'signin' ? t('auth.signInBtn') : t('auth.signUpBtn')}<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <button type="button" onClick={() => go(mode === 'signin' ? 'signup' : 'signin')} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
          {mode === 'signin' ? t('auth.signUpBtn') : t('auth.signInBtn')}
        </button>
      </p>
    </Shell>
  );
};

/** Affiché après un clic sur le lien « mot de passe oublié » reçu par e-mail. */
export const ResetPasswordForm: React.FC<{ onDone: () => void; forced?: boolean }> = ({ onDone, forced }) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(t('authx.passwordMin'));
    if (password !== confirm) return setError(t('auth.passwordMismatch'));
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    setLoading(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  return (
    <Shell>
      {done ? (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <p className="text-gray-700 dark:text-gray-300">{t('authx.updated')}</p>
          <button onClick={onDone} className={submitCls}>{t('authx.continue')}</button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{forced ? t('authp.forcedTitle') : t('authx.newPasswordTitle')}</h2>
          {forced && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('authp.forcedDesc')}</p>}
          {!forced && <div className="mb-4" />}
          {error && <ErrorBox message={error} />}
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="password" autoFocus required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={inputBase} placeholder={t('authx.newPassword')} aria-label={t('authx.newPassword')} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputBase} placeholder={t('authx.confirmNew')} aria-label={t('authx.confirmNew')} />
            </div>
            <p className="text-xs text-gray-400">{t('authx.passwordMin')}</p>
            <button type="submit" disabled={loading} className={submitCls}>{loading ? <Spinner /> : t('authx.update')}</button>
          </form>
        </>
      )}
    </Shell>
  );
};

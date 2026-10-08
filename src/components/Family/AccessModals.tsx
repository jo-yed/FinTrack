import React, { useMemo, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, MessageCircle, Search, ShieldCheck, ShieldOff, UserPlus, X } from 'lucide-react';
import { accessErrorKey, useFamilyAccess } from '../../hooks/useFamilyAccess';
import type { Permissions } from '../../hooks/useFamilyAccess';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import { useLanguage } from '../../i18n';
import { apiErrorKey } from '../../lib/api';
import { formatPhone } from '../../lib/phone';
import type { FamilyAccess } from '../../types';
import { ConfirmDialog, ModalShell, fill, inputCls, labelCls } from '../Activities/shared';

/** Profils prêts à l'emploi : simples à comprendre, ajustables ensuite case par case. */
const PRESETS: { id: 'child' | 'teen' | 'partner'; perms: Permissions }[] = [
  { id: 'child', perms: { addExpenses: false, viewFamily: false } },
  { id: 'teen', perms: { addExpenses: true, viewFamily: false } },
  { id: 'partner', perms: { addExpenses: true, viewFamily: true } },
];

const sameAs = (a: Permissions, b: Permissions) => a.addExpenses === b.addExpenses && a.viewFamily === b.viewFamily;

const PermissionPicker: React.FC<{ value: Permissions; onChange: (p: Permissions) => void }> = ({ value, onChange }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PRESETS.map(p => {
          const active = sameAs(value, p.perms);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.perms)}
              aria-pressed={active}
              className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t(`familyAccess.presets.${p.id}`)}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(`familyAccess.presets.${p.id}Desc`)}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
        <Toggle label={t('familyAccess.perm.own')} desc={t('familyAccess.perm.ownDesc')} checked disabled onChange={() => undefined} />
        <Toggle label={t('familyAccess.perm.add')} desc={t('familyAccess.perm.addDesc')} checked={value.addExpenses} onChange={v => onChange({ ...value, addExpenses: v })} />
        <Toggle label={t('familyAccess.perm.family')} desc={t('familyAccess.perm.familyDesc')} checked={value.viewFamily} onChange={v => onChange({ ...value, viewFamily: v })} />
      </div>
    </div>
  );
};

const Toggle: React.FC<{ label: string; desc: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({ label, desc, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full flex-shrink-0 transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'} ${disabled ? 'opacity-60' : ''}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

/* ------------------------------------------------------------------ */
/* Valider une demande d'accès à partir de son code                    */
/* ------------------------------------------------------------------ */

export const ApproveRequestModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useLanguage();
  const { lookup, approve, reject, byMemberId } = useFamilyAccess();
  const { members } = useFamilyMembers();

  const [code, setCode] = useState('');
  const [request, setRequest] = useState<{ id: string; full_name: string; phone: string; requested_at: string } | null>(null);
  const [linkTo, setLinkTo] = useState<string>('new');
  const [newName, setNewName] = useState('');
  const [perms, setPerms] = useState<Permissions>({ addExpenses: true, viewFamily: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const freeMembers = useMemo(() => members.filter(m => !byMemberId[m.id] || !['active', 'suspended'].includes(byMemberId[m.id].status)), [members, byMemberId]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const found = await lookup(code);
      if (!found) setError(t('familyAccess.notFound'));
      else {
        setRequest(found);
        setNewName(found.full_name);
        // Pré-sélection : un membre de même prénom, sinon « nouveau »
        const guess = freeMembers.find(m => m.name.trim().toLowerCase() === found.full_name.trim().toLowerCase());
        setLinkTo(guess ? guess.id : 'new');
      }
    } catch (err) {
      setError(t(accessErrorKey(err)));
    }
    setBusy(false);
  };

  const confirm = async () => {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      await approve(request.id, linkTo === 'new' ? { familyMemberId: null, newMemberName: newName } : { familyMemberId: linkTo }, perms);
      setDone('approved');
    } catch (err) {
      setError(t(accessErrorKey(err)));
    }
    setBusy(false);
  };

  const refuse = async () => {
    if (!request) return;
    setBusy(true);
    try {
      await reject(request.id);
      setDone('rejected');
    } catch (err) {
      setError(t(accessErrorKey(err)));
    }
    setBusy(false);
  };

  return (
    <ModalShell title={t('familyAccess.approveTitle')} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6 space-y-5">
        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${done === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {done === 'approved' ? <Check className="w-7 h-7 text-emerald-500" /> : <X className="w-7 h-7 text-gray-500" />}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{done === 'approved' ? fill(t('familyAccess.approved'), { name: request?.full_name ?? '' }) : t('familyAccess.rejected')}</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl">{t('common.close')}</button>
          </div>
        ) : !request ? (
          <form onSubmit={search} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('familyAccess.approveIntro')}</p>
            <div>
              <label className={labelCls} htmlFor="req-code">{t('familyAccess.codeLabel')}</label>
              <input
                id="req-code"
                autoFocus
                className={`${inputCls} text-center font-mono text-xl tracking-widest uppercase`}
                value={code}
                onChange={e => { setCode(e.target.value); setError(null); }}
                placeholder="K7M2-QX9R"
                maxLength={12}
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            <button type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length < 8} className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {t('familyAccess.search')}
            </button>
          </form>
        ) : (
          <>
            <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/40 p-4">
              <p className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-2">{t('familyAccess.requestFrom')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{request.full_name}</p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatPhone(request.phone)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('familyAccess.verifyHint')}</p>
            </div>

            <div>
              <label className={labelCls} htmlFor="link-to">{t('familyAccess.linkTo')}</label>
              <select id="link-to" className={inputCls} value={linkTo} onChange={e => setLinkTo(e.target.value)}>
                <option value="new">{t('familyAccess.createNew')}</option>
                {freeMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
              {linkTo === 'new' && (
                <input className={`${inputCls} mt-2`} value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('familyAccess.newName')} aria-label={t('familyAccess.newName')} maxLength={80} />
              )}
            </div>

            <div>
              <label className={labelCls}>{t('familyAccess.rights')}</label>
              <PermissionPicker value={perms} onChange={setPerms} />
            </div>

            {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            <div className="flex gap-3">
              <button onClick={refuse} disabled={busy} className="flex-1 py-2.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
                {t('familyAccess.refuse')}
              </button>
              <button onClick={confirm} disabled={busy || (linkTo === 'new' && newName.trim().length < 2)} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} {t('familyAccess.approve')}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Gérer l'accès d'un membre                                           */
/* ------------------------------------------------------------------ */

export const MemberAccessModal: React.FC<{ access: FamilyAccess; memberName: string; onClose: () => void }> = ({ access, memberName, onClose }) => {
  const { t } = useLanguage();
  const { update, revoke, resetPassword } = useFamilyAccess();
  const [perms, setPerms] = useState<Permissions>({ addExpenses: access.perm_add_expenses, viewFamily: access.perm_view_family });
  const [status, setStatus] = useState<'active' | 'suspended'>(access.status === 'suspended' ? 'suspended' : 'active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);

  const dirty = perms.addExpenses !== access.perm_add_expenses || perms.viewFamily !== access.perm_view_family || status !== access.status;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('apiErrors') ? err.message : accessErrorKey(err));
    }
    setBusy(false);
  };

  const save = () => run(async () => { await update(access.id, perms, status); setSaved(true); });
  const doRevoke = () => run(async () => { await revoke(access.id); onClose(); });
  const doReset = () => run(async () => {
    try {
      setTempPassword(await resetPassword(access.id));
    } catch (err) {
      throw new Error(apiErrorKey(err));
    }
  });

  const whatsapp = tempPassword
    ? fill(t('familyAccess.resetMessage'), { name: access.full_name, password: tempPassword, phone: formatPhone(access.phone) })
    : '';

  return (
    <>
      <ModalShell title={`${t('familyAccess.manageTitle')} — ${memberName}`} onClose={onClose} maxWidth="max-w-lg">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{access.full_name}</p>
              <p className="text-xs font-mono text-gray-500">{formatPhone(access.phone)}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              {status === 'active' ? t('familyAccess.statusActive') : t('familyAccess.statusSuspended')}
            </span>
          </div>

          <div>
            <label className={labelCls}>{t('familyAccess.rights')}</label>
            <PermissionPicker value={perms} onChange={p => { setPerms(p); setSaved(false); }} />
          </div>

          {error && <p className="text-sm text-red-500" role="alert">{t(error)}</p>}
          {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('familyAccess.saved')}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={save} disabled={busy || !dirty} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('common.save')}
            </button>
            <button
              onClick={() => { setStatus(status === 'active' ? 'suspended' : 'active'); setSaved(false); }}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              {status === 'active' ? <><ShieldOff className="w-4 h-4" /> {t('familyAccess.suspend')}</> : <><ShieldCheck className="w-4 h-4" /> {t('familyAccess.reactivate')}</>}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button onClick={() => setConfirmReset(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">{t('familyAccess.resetPassword')}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t('familyAccess.resetPasswordDesc')}</span>
              </span>
            </button>
            <button onClick={() => setConfirmRevoke(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-red-50 dark:hover:bg-red-900/10">
              <X className="w-5 h-5 text-red-500" />
              <span>
                <span className="block text-sm font-medium text-red-600 dark:text-red-400">{t('familyAccess.revoke')}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t('familyAccess.revokeDesc')}</span>
              </span>
            </button>
          </div>
        </div>
      </ModalShell>

      {confirmReset && !tempPassword && (
        <ConfirmDialog
          message={fill(t('familyAccess.resetConfirm'), { name: access.full_name })}
          detail={t('familyAccess.resetConfirmDetail')}
          confirmLabel={t('familyAccess.resetPassword')}
          cancelLabel={t('common.cancel')}
          onConfirm={async () => { setConfirmReset(false); await doReset(); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmRevoke && (
        <ConfirmDialog
          message={fill(t('familyAccess.revokeConfirm'), { name: access.full_name })}
          detail={t('familyAccess.revokeConfirmDetail')}
          confirmLabel={t('familyAccess.revoke')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => { setConfirmRevoke(false); void doRevoke(); }}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}

      {tempPassword && (
        <ModalShell title={t('familyAccess.tempTitle')} onClose={() => { setTempPassword(null); setConfirmReset(false); }} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('familyAccess.tempDesc')}</p>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-5 text-center">
              <p className="text-2xl font-bold font-mono tracking-wider text-gray-900 dark:text-white select-all" data-testid="temp-password">{tempPassword}</p>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('familyAccess.tempWarning')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(tempPassword); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* indisponible */ } }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />} {copied ? t('member.pending.copied') : t('member.pending.copy')}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(whatsapp)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <button onClick={() => { setTempPassword(null); setConfirmReset(false); }} className="w-full py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('common.close')}
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
};


import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Ban, Clock, Database, Loader2, LogOut, Megaphone, Search, ShieldCheck, Trash2, UserCheck, Users, X,
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { formatPhone } from '../../lib/phone';
import {
  deleteUser, fetchAudit, fetchOverview, fetchUsers, setAnnouncement, setBanned, signOutUser,
} from '../../lib/admin';
import type { UserFilter } from '../../lib/admin';
import { apiErrorKey } from '../../lib/api';
import { formatBytes } from '../../lib/files';
import { fill } from '../Activities/shared';
import { MfaGate } from '../Security/TwoFactor';
import type { AdminOverview, AdminUserRow, PlatformAuditEvent } from '../../types';

type Tab = 'overview' | 'users' | 'audit';
const PAGE_SIZE = 25;

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Console du super administrateur : comptes, accès, annonces et journal. Protégée par la double authentification. */
export const AdminConsole: React.FC = () => (
  <MfaGate>
    <Console />
  </MfaGate>
);

const Console: React.FC = () => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: <Activity className="w-4 h-4" /> },
    { id: 'users', label: t('admin.tabs.users'), icon: <Users className="w-4 h-4" /> },
    { id: 'audit', label: t('admin.tabs.audit'), icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('admin.title')}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.subtitle')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map(tb => (
          <button
            key={tb.id}
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${tab === tb.id ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'audit' && <AuditPanel />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Aperçu + annonce                                                    */
/* ------------------------------------------------------------------ */

const Overview: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [level, setLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchOverview().then(setData).catch(() => setError(t('admin.loadFailed')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async (clear: boolean) => {
    setSaved(false);
    try {
      await setAnnouncement(clear ? '' : text, level);
      if (clear) setText('');
      setSaved(true);
    } catch {
      setError(t('admin.actionFailed'));
    }
  };

  if (error && !data) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const cards: { label: string; value: string | number; sub?: string; tone?: string }[] = [
    { label: t('admin.stats.users'), value: data.users, sub: `${data.confirmed_users} ${t('admin.stats.confirmed')}` },
    { label: t('admin.stats.new7'), value: data.new_7d, sub: `${data.new_30d} / 30 ${t('admin.stats.days')}` },
    { label: t('admin.stats.active7'), value: data.active_7d },
    { label: t('admin.stats.families'), value: data.families, sub: `${data.member_accounts} ${t('admin.stats.memberAccounts')}` },
    { label: t('admin.stats.pending'), value: data.pending_requests, tone: data.pending_requests > 0 ? 'text-amber-600 dark:text-amber-400' : undefined },
    { label: t('admin.stats.banned'), value: data.banned_users, tone: data.banned_users > 0 ? 'text-red-600 dark:text-red-400' : undefined },
    { label: t('admin.stats.budgets'), value: data.budgets, sub: `${data.entries} ${t('admin.stats.entries')}` },
    { label: t('admin.stats.transactions'), value: data.transactions },
    { label: t('admin.stats.files'), value: data.attachments, sub: formatBytes(data.attachments_bytes) },
    { label: t('admin.stats.vaults'), value: data.vaults },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-slide-up">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{c.label}</p>
            <p className={`text-2xl font-bold ${c.tone ?? 'text-gray-900 dark:text-white'}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3 animate-slide-up">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-violet-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('admin.announcement.title')}</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.announcement.desc')}</p>
        <textarea
          rows={2}
          maxLength={400}
          className={`${inputCls} resize-none`}
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false); }}
          placeholder={t('admin.announcement.placeholder')}
          aria-label={t('admin.announcement.title')}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputCls} sm:w-48`} value={level} onChange={e => setLevel(e.target.value as typeof level)} aria-label={t('admin.announcement.level')}>
            <option value="info">{t('admin.announcement.info')}</option>
            <option value="warning">{t('admin.announcement.warning')}</option>
            <option value="critical">{t('admin.announcement.critical')}</option>
          </select>
          <button onClick={() => void publish(false)} disabled={!text.trim()} className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white disabled:opacity-50">
            {t('admin.announcement.publish')}
          </button>
          <button onClick={() => void publish(true)} className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {t('admin.announcement.clear')}
          </button>
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('admin.announcement.saved')}</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Database className="w-4 h-4 flex-shrink-0 mt-0.5" /> {t('admin.privacyNote')}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Comptes                                                             */
/* ------------------------------------------------------------------ */

const UsersPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; users: AdminUserRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchUsers(debounced, filter, PAGE_SIZE, page * PAGE_SIZE));
      setError(null);
    } catch {
      setError(t('admin.loadFailed'));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, filter, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); }, [debounced, filter]);

  const run = async (user: AdminUserRow, fn: () => Promise<void>) => {
    setBusyId(user.id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('cannot_target') ? t('admin.cannotTarget') : t('admin.actionFailed'));
    }
    setBusyId(null);
  };

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const label = (u: AdminUserRow) => u.full_name || u.email || (u.phone ? formatPhone(u.phone) : u.id.slice(0, 8));

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filters: UserFilter[] = ['all', 'standard', 'members', 'pending', 'banned', 'unconfirmed'];

  const statusPill = (u: AdminUserRow) => {
    if (u.banned) return <Pill tone="red">{t('admin.status.banned')}</Pill>;
    if (!u.confirmed) return <Pill tone="amber">{t('admin.status.unconfirmed')}</Pill>;
    if (u.access_status === 'requested') return <Pill tone="amber">{t('admin.status.pending')}</Pill>;
    if (u.access_status === 'suspended') return <Pill tone="amber">{t('admin.status.suspendedAccess')}</Pill>;
    return <Pill tone="green">{t('admin.status.active')}</Pill>;
  };

  const actions = (u: AdminUserRow) =>
    u.is_admin ? (
      <span className="text-xs text-gray-400">{t('admin.protected')}</span>
    ) : (
      <div className="flex items-center gap-1">
        <button
          onClick={() => run(u, () => setBanned(u.id, !u.banned))}
          disabled={busyId === u.id}
          aria-label={`${u.banned ? t('admin.reactivate') : t('admin.suspend')} ${label(u)}`}
          title={u.banned ? t('admin.reactivate') : t('admin.suspend')}
          className={`p-2 rounded-lg disabled:opacity-50 ${u.banned ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
        >
          {u.banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        </button>
        <button
          onClick={() => run(u, () => signOutUser(u.id))}
          disabled={busyId === u.id}
          aria-label={`${t('admin.signOut')} ${label(u)}`}
          title={t('admin.signOut')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDeleting(u)}
          aria-label={`${t('common.delete')} ${label(u)}`}
          title={t('common.delete')}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className={`${inputCls} pl-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} aria-label={t('admin.search')} />
        </div>
        <select className={`${inputCls} sm:w-56`} value={filter} onChange={e => setFilter(e.target.value as UserFilter)} aria-label={t('admin.filter')}>
          {filters.map(f => <option key={f} value={f}>{t(`admin.filters.${f}`)}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading && !data ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : data && data.users.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('admin.noUsers')}</p>
        ) : (
          <>
            {/* Écrans moyens et grands : tableau */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/40">
                    <th className="text-left font-medium px-5 py-2.5">{t('admin.col.user')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('admin.col.type')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('admin.col.status')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('admin.col.joined')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('admin.col.lastSeen')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('admin.col.data')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data?.users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{label(u)}</div>
                        <div className="text-xs text-gray-400">{u.email ?? (u.phone ? formatPhone(u.phone) : '')}{u.family_owner_email ? ` · ${t('admin.familyOf')} ${u.family_owner_email}` : ''}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                        {u.is_admin ? t('admin.type.admin') : u.account_type === 'member' ? t('admin.type.member') : t('admin.type.standard')}
                      </td>
                      <td className="px-3 py-3">{statusPill(u)}</td>
                      <td className="px-3 py-3 text-gray-500">{date(u.created_at)}</td>
                      <td className="px-3 py-3 text-gray-500">{date(u.last_sign_in_at)}</td>
                      <td className="px-3 py-3 text-right text-gray-500 tabular-nums">{u.budgets} / {u.transactions}</td>
                      <td className="px-3 py-3">{actions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Téléphones : cartes */}
            <ul className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {data?.users.map(u => (
                <li key={u.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{label(u)}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email ?? (u.phone ? formatPhone(u.phone) : '')}</p>
                    </div>
                    {statusPill(u)}
                  </div>
                  <p className="text-xs text-gray-500">
                    {u.is_admin ? t('admin.type.admin') : u.account_type === 'member' ? t('admin.type.member') : t('admin.type.standard')}
                    {' · '}{date(u.created_at)}{' · '}{u.budgets}/{u.transactions}
                  </p>
                  {actions(u)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{data.total} {t('admin.accounts')}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40">{t('admin.prev')}</button>
            <span>{page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteUserDialog
          user={deleting}
          name={label(deleting)}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const target = deleting;
            await deleteUser(target.id);
            setDeleting(null);
            await load();
          }}
        />
      )}
    </div>
  );
};

const Pill: React.FC<{ tone: 'red' | 'amber' | 'green'; children: React.ReactNode }> = ({ tone, children }) => {
  const cls = {
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  }[tone];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
};

const DeleteUserDialog: React.FC<{
  user: AdminUserRow;
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}> = ({ user, name, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = t('admin.deleteWord');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(t(apiErrorKey(err)));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900 w-full max-w-md p-6 animate-scale-in" role="dialog" aria-modal="true">
        <button onClick={onCancel} aria-label={t('common.close')} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{fill(t('admin.deleteTitle'), { name })}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {fill(t('admin.deleteDesc'), { budgets: user.budgets, transactions: user.transactions })}
            </p>
          </div>
        </div>
        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1.5">{fill(t('admin.deleteType'), { word })}</label>
        <input className={inputCls} value={typed} onChange={e => setTyped(e.target.value)} autoFocus aria-label={fill(t('admin.deleteType'), { word })} />
        {error && <p className="text-sm text-red-500 mt-2" role="alert">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl">{t('common.cancel')}</button>
          <button
            onClick={submit}
            disabled={busy || typed.trim().toUpperCase() !== word.toUpperCase()}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('admin.deleteConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Journal                                                             */
/* ------------------------------------------------------------------ */

const AuditPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const [events, setEvents] = useState<PlatformAuditEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAudit(150).then(setEvents).catch(() => setFailed(true));
  }, []);

  const text = useMemo(() => (ev: PlatformAuditEvent) => {
    const template = t(`admin.actions.${ev.action}`);
    return template.startsWith('admin.actions.') ? ev.action : fill(template, { target: ev.target_label || '—', level: String((ev.details as { level?: string }).level ?? '') });
  }, [t]);

  if (failed) return <p className="text-sm text-red-500">{t('admin.loadFailed')}</p>;
  if (!events) return <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (events.length === 0) return <p className="text-sm text-gray-500 text-center py-10">{t('admin.noAudit')}</p>;

  return (
    <ol className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
      {events.map(ev => (
        <li key={ev.id} className="px-5 py-3">
          <p className="text-sm text-gray-900 dark:text-white"><span className="font-semibold">{ev.actor_email || '—'}</span> {text(ev)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(ev.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </li>
      ))}
    </ol>
  );
};

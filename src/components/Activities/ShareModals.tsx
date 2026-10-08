import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Check, ExternalLink, FileText, Image as ImageIcon, Loader2, Paperclip, ShieldCheck, Trash2, UserPlus, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DUPLICATE_MEMBER, useActivityBudgets } from '../../hooks/useActivityBudgets';
import { useLanguage } from '../../i18n';
import { useRegion } from '../../hooks/useRegion';
import { ACCEPT_ATTR, formatBytes, validateFile } from '../../lib/files';
import type { AuditEvent, Project, ProjectAttachment, ProjectMember, ProjectTransaction } from '../../types';
import { ModalShell, fill, inputCls, labelCls } from './shared';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ------------------------------------------------------------------ */
/* Partage + validation des dépenses                                   */
/* ------------------------------------------------------------------ */

export const ShareModal: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
  const { t } = useLanguage();
  const { session } = useAuth();
  const { members, updateProject, inviteMember, updateMemberRole, removeMember } = useActivityBudgets();
  const projectMembers = useMemo(() => members.filter(m => m.project_id === project.id), [members, project.id]);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectMember['role']>('editor');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ownEmail = (session?.user.email ?? '').toLowerCase();

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message === DUPLICATE_MEMBER ? t('share.duplicate') : message);
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError(t('share.invalidEmail'));
    if (clean === ownEmail) return setError(t('share.ownEmail'));
    await run(async () => {
      await inviteMember(project.id, clean, role);
      setEmail('');
    });
  };

  return (
    <ModalShell title={t('share.title')} onClose={onClose} maxWidth="max-w-xl">
      <div className="p-6 space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('share.desc')}</p>

        {/* Validation des dépenses */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('share.requiresApproval')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('share.requiresApprovalDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={project.requires_approval}
            aria-label={t('share.requiresApproval')}
            disabled={busy}
            onClick={() => run(() => updateProject(project.id, { requires_approval: !project.requires_approval }))}
            className={`relative w-12 h-6 rounded-full flex-shrink-0 transition-colors ${project.requires_approval ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${project.requires_approval ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Invitation */}
        <form onSubmit={submit} noValidate className="space-y-3">
          <label className={labelCls}>{t('share.inviteLabel')}</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              className={`${inputCls} flex-1`}
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder={t('share.emailPlaceholder')}
            />
            <select className={`${inputCls} sm:w-44`} value={role} onChange={e => setRole(e.target.value as ProjectMember['role'])} aria-label={t('share.yourRole')}>
              <option value="editor">{t('share.editor')}</option>
              <option value="viewer">{t('share.viewer')}</option>
            </select>
            <button type="submit" disabled={busy || !email.trim()} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50">
              <UserPlus className="w-4 h-4" /> {t('share.invite')}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {role === 'editor' ? t('share.editorDesc') : t('share.viewerDesc')} {t('share.inviteNote')}
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        {/* Personnes ayant accès */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('share.members')}</h3>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <li className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/40">
              <Avatar email={project.owner_email || ownEmail} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.owner_email || ownEmail}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('share.ownerDesc')}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{t('share.owner')}</span>
            </li>
            {projectMembers.map(m => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar email={m.email} />
                <p className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">{m.email}</p>
                <select
                  className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1.5"
                  value={m.role}
                  disabled={busy}
                  onChange={e => run(() => updateMemberRole(m.id, e.target.value as ProjectMember['role']))}
                  aria-label={`${t('share.yourRole')} ${m.email}`}
                >
                  <option value="editor">{t('share.editor')}</option>
                  <option value="viewer">{t('share.viewer')}</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => removeMember(m.id))}
                  aria-label={`${t('share.remove')} ${m.email}`}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
            {projectMembers.length === 0 && (
              <li className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">{t('share.none')}</li>
            )}
          </ul>
        </div>
      </div>
    </ModalShell>
  );
};

const Avatar: React.FC<{ email: string }> = ({ email }) => (
  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
    {(email.charAt(0) || '?').toUpperCase()}
  </span>
);

/* ------------------------------------------------------------------ */
/* Historique                                                          */
/* ------------------------------------------------------------------ */

export function describeAudit(
  event: AuditEvent,
  t: (k: string) => string,
  money: (n: number) => string,
): string {
  const d = event.details as Record<string, unknown>;
  const key = event.action === 'approval_setting_changed' ? `approval_setting_changed_${Boolean(d.requires_approval)}` : event.action;
  const template = t(`history.actions.${key}`);
  const text = template.startsWith('history.') ? t('history.actions.unknown') : template;
  const role = d.role === 'editor' ? t('share.editor') : d.role === 'viewer' ? t('share.viewer') : '';
  return fill(text, {
    label: String(d.label ?? ''),
    amount: typeof d.amount === 'number' ? money(d.amount) : '',
    reason: String(d.reason ?? '').trim() || '—',
    name: String(d.name ?? ''),
    email: String(d.email ?? ''),
    role,
    from: String(d.from ?? ''),
    to: String(d.to ?? ''),
  });
}

export const HistoryModal: React.FC<{ projectId: string; onClose: () => void }> = ({ projectId, onClose }) => {
  const { t, lang } = useLanguage();
  const { formatCurrency } = useRegion();
  const { loadAudit } = useActivityBudgets();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAudit(projectId)
      .then(list => { if (alive) setEvents(list); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [loadAudit, projectId]);

  return (
    <ModalShell title={t('history.title')} onClose={onClose} maxWidth="max-w-xl">
      <div className="p-6">
        {failed ? (
          <p className="text-sm text-red-500">{t('history.loadFailed')}</p>
        ) : events === null ? (
          <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">{t('history.empty')}</p>
        ) : (
          <ol className="space-y-4">
            {events.map(ev => (
              <li key={ev.id} className="flex gap-3">
                <Avatar email={ev.actor_email} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-semibold">{ev.actor_email || '—'}</span>{' '}
                    {describeAudit(ev, t, formatCurrency)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(ev.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Rejet d'une dépense                                                 */
/* ------------------------------------------------------------------ */

export const RejectModal: React.FC<{
  entry: ProjectTransaction;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}> = ({ entry, onClose, onConfirm }) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title={t('approval.rejectTitle')} onClose={onClose} maxWidth="max-w-md">
      <form
        className="p-6 space-y-4"
        onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          await onConfirm(reason);
          setBusy(false);
        }}
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white">« {entry.label} »</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('approval.rejectHint')}</p>
        <textarea
          autoFocus
          rows={3}
          className={`${inputCls} resize-none`}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('approval.rejectPlaceholder')}
        />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-50">
            {t('approval.rejectConfirm')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Justificatifs                                                       */
/* ------------------------------------------------------------------ */

const FileIcon: React.FC<{ mime: string }> = ({ mime }) =>
  mime.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;

/** Sélection de fichiers dans la fenêtre de saisie (envoyés après l'enregistrement de l'écriture). */
export const AttachmentsField: React.FC<{
  existing: ProjectAttachment[];
  files: File[];
  online: boolean;
  onFilesChange: (files: File[]) => void;
  onRemoveExisting: (attachment: ProjectAttachment) => void;
}> = ({ existing, files, online, onFilesChange, onRemoveExisting }) => {
  const { t } = useLanguage();
  const [problems, setProblems] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const msgs: string[] = [];
    Array.from(list).forEach(f => {
      const p = validateFile(f);
      if (p === 'type') msgs.push(`${f.name} : ${t('receipts.failedType')}`);
      else if (p === 'size') msgs.push(`${f.name} : ${t('receipts.failedSize')}`);
      else accepted.push(f);
    });
    setProblems(msgs);
    if (accepted.length) onFilesChange([...files, ...accepted]);
  };

  return (
    <div>
      <label className={labelCls}>
        <Paperclip className="inline w-4 h-4 mr-1 -mt-0.5" />
        {t('receipts.title')}
      </label>

      {(existing.length > 0 || files.length > 0) && (
        <ul className="mb-2 space-y-1.5">
          {existing.map(a => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
              <FileIcon mime={a.mime} />
              <span className="flex-1 truncate text-gray-900 dark:text-white">{a.name}</span>
              <span className="text-xs text-gray-400">{formatBytes(a.size)}</span>
              <button type="button" onClick={() => onRemoveExisting(a)} aria-label={`${t('receipts.remove')} ${a.name}`} className="p-1 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </li>
          ))}
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-sm">
              <FileIcon mime={f.type} />
              <span className="flex-1 truncate text-gray-900 dark:text-white">{f.name}</span>
              <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))} aria-label={`${t('receipts.remove')} ${f.name}`} className="p-1 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {online ? (
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept={ACCEPT_ATTR} multiple className="hidden" data-testid="receipt-input" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20">
            <Paperclip className="w-4 h-4" /> {t('receipts.add')}
          </button>
          <button type="button" onClick={() => cameraInput.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 sm:hidden">
            <Camera className="w-4 h-4" /> {t('receipts.takePhoto')}
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t('receipts.needOnline')}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">{t('receipts.hint')}</p>
      {problems.map(p => <p key={p} className="text-xs text-red-500 mt-1">{p}</p>)}
    </div>
  );
};

/** Consultation des justificatifs d'une écriture du journal. */
export const AttachmentsModal: React.FC<{
  entry: ProjectTransaction;
  attachments: ProjectAttachment[];
  canRemove: (a: ProjectAttachment) => boolean;
  onClose: () => void;
}> = ({ entry, attachments, canRemove, onClose }) => {
  const { t } = useLanguage();
  const { getAttachmentUrl, removeAttachment } = useActivityBudgets();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    attachments.filter(a => a.mime.startsWith('image/')).forEach(a => {
      getAttachmentUrl(a).then(u => { if (alive) setUrls(prev => ({ ...prev, [a.id]: u })); }).catch(() => undefined);
    });
    return () => { alive = false; };
  }, [attachments, getAttachmentUrl]);

  const open = async (a: ProjectAttachment) => {
    try {
      window.open(await getAttachmentUrl(a), '_blank', 'noopener');
    } catch {
      setError(t('receipts.loadFailed'));
    }
  };

  return (
    <ModalShell title={t('receipts.viewTitle')} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6 space-y-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">« {entry.label} »</p>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('receipts.none')}</p>
        ) : (
          <ul className="space-y-3">
            {attachments.map(a => (
              <li key={a.id} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {urls[a.id] && <img src={urls[a.id]} alt={a.name} className="w-full max-h-64 object-contain bg-gray-50 dark:bg-gray-800" />}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <FileIcon mime={a.mime} />
                  <span className="flex-1 truncate text-sm text-gray-900 dark:text-white">{a.name}</span>
                  <span className="text-xs text-gray-400">{formatBytes(a.size)}</span>
                  <button type="button" onClick={() => open(a)} className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> {t('receipts.open')}
                  </button>
                  {canRemove(a) && (
                    <button type="button" onClick={() => removeAttachment(a).catch(err => setError(err instanceof Error ? err.message : String(err)))} aria-label={`${t('receipts.remove')} ${a.name}`} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Check className="w-4 h-4" /> {t('common.close')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useTransactions } from './useTransactions';
import { BUDGET_TX_CATEGORY, summarizeBudget } from '../lib/budgets';
import type { BudgetSummary } from '../lib/budgets';
import { compressImage, safeFileName, validateFile } from '../lib/files';
import type { FileProblem } from '../lib/files';
import { isNetworkError, readQueue, writeQueue } from '../lib/offlineQueue';
import type { QueuedEntry } from '../lib/offlineQueue';
import type {
  AuditEvent, EntryStatus, PaymentMethod, Project, ProjectAttachment, ProjectCategory, ProjectMember,
  ProjectRole, ProjectTransaction,
} from '../types';

export type NewProject = Omit<Project, 'id' | 'user_id' | 'created_at' | 'owner_email' | 'requires_approval'>;
export type NewCategory = { name: string; allocated_amount: number; color: string };

export interface NewEntry {
  project_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  label: string;
  amount: number;
  date: string;
  payee: string;
  reference: string;
  payment_method: PaymentMethod;
  note: string;
  /** Fonds reçus uniquement : compte d'où l'argent est décaissé (crée aussi une dépense dans les transactions). */
  sourceAccountId?: string | null;
  /** Nom du budget pour le libellé du décaissement (utile quand le budget vient d'être créé). */
  projectName?: string;
}

export type EntryUpdate = Partial<Omit<NewEntry, 'sourceAccountId' | 'projectName' | 'project_id'>>;

export interface CreateProjectOptions {
  categories?: NewCategory[];
  initialFunds?: { amount: number; date: string; sourceAccountId?: string | null; label: string };
}

export interface UploadReport {
  uploaded: ProjectAttachment[];
  failed: { name: string; reason: FileProblem | 'upload' }[];
}

export const DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY';
export const DUPLICATE_MEMBER = 'DUPLICATE_MEMBER';

function mapError(err: { code?: string; message: string }, duplicate: string = DUPLICATE_CATEGORY): Error {
  if (err.code === '23505') return new Error(duplicate);
  return new Error(err.message);
}

interface ActivityBudgetsContextType {
  userId: string;
  projects: Project[];
  categories: ProjectCategory[];
  entries: ProjectTransaction[];
  members: ProjectMember[];
  attachments: ProjectAttachment[];
  summaries: Record<string, BudgetSummary>;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  /** Dépenses saisies hors ligne, pas encore envoyées. */
  pendingSync: QueuedEntry[];
  syncNow: () => Promise<void>;
  refetch: () => Promise<void>;
  roleOf: (projectId: string) => ProjectRole;
  canEditEntry: (entry: ProjectTransaction) => boolean;
  addProject: (project: NewProject, options?: CreateProjectOptions) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addCategory: (projectId: string, category: NewCategory) => Promise<ProjectCategory>;
  updateCategory: (id: string, updates: Partial<NewCategory>) => Promise<ProjectCategory>;
  deleteCategory: (id: string) => Promise<void>;
  addEntry: (entry: NewEntry) => Promise<ProjectTransaction>;
  updateEntry: (id: string, updates: EntryUpdate) => Promise<ProjectTransaction>;
  deleteEntry: (id: string) => Promise<void>;
  decideEntry: (id: string, status: EntryStatus, reason?: string) => Promise<ProjectTransaction>;
  approveAllPending: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, role: ProjectMember['role']) => Promise<ProjectMember>;
  updateMemberRole: (id: string, role: ProjectMember['role']) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addAttachments: (entry: { id: string; project_id: string }, files: File[]) => Promise<UploadReport>;
  removeAttachment: (attachment: ProjectAttachment) => Promise<void>;
  getAttachmentUrl: (attachment: ProjectAttachment) => Promise<string>;
  loadAudit: (projectId: string) => Promise<AuditEvent[]>;
}

const ActivityBudgetsContext = createContext<ActivityBudgetsContextType | undefined>(undefined);

const RECEIPTS_BUCKET = 'receipts';

export const ActivityBudgetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const userEmail = (session?.user.email ?? '').toLowerCase();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [entries, setEntries] = useState<ProjectTransaction[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState<QueuedEntry[]>(() => (userId ? readQueue(userId) : []));
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const flushing = useRef(false);

  const roleOf = useCallback((projectId: string): ProjectRole => {
    const p = projects.find(x => x.id === projectId);
    if (!p) return 'viewer';
    if (p.user_id === userId) return 'owner';
    const mine = members.find(m => m.project_id === projectId && m.email.toLowerCase() === userEmail);
    return mine?.role ?? 'viewer';
  }, [projects, members, userId, userEmail]);

  const toOptimistic = useCallback((q: QueuedEntry): ProjectTransaction => {
    const project = projects.find(p => p.id === q.project_id);
    const needsApproval = Boolean(project?.requires_approval) && project?.user_id !== userId;
    return {
      id: q.id, project_id: q.project_id, user_id: q.user_id, category_id: q.category_id, type: 'expense',
      label: q.label, amount: q.amount, date: q.date, payee: q.payee, reference: q.reference,
      payment_method: q.payment_method, note: q.note, source_transaction_id: null,
      status: needsApproval ? 'pending' : 'approved', approved_by: null, approved_at: null, rejection_reason: '',
      created_by_email: userEmail, created_at: q.queuedAt, offline: true,
    };
  }, [projects, userId, userEmail]);

  const refetch = useCallback(async () => {
    const [p, c, e, m, a] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('project_transactions').select('*').order('date', { ascending: false }),
      supabase.from('project_members').select('*'),
      supabase.from('project_attachments').select('*').order('created_at', { ascending: true }),
    ]);
    const firstError = p.error || c.error || e.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setProjects((p.data || []) as Project[]);
      setCategories((c.data || []) as ProjectCategory[]);
      setEntries((e.data || []) as ProjectTransaction[]);
      // Partage / justificatifs : l'application reste utilisable si ces tables n'existent pas encore.
      setMembers(m.error ? [] : ((m.data || []) as ProjectMember[]));
      setAttachments(a.error ? [] : ((a.data || []) as ProjectAttachment[]));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ---- Hors ligne ----

  const syncNow = useCallback(async () => {
    if (flushing.current || !userId) return;
    const queue = readQueue(userId);
    if (queue.length === 0) return;
    flushing.current = true;
    try {
      const remaining: QueuedEntry[] = [];
      let synced = false;
      for (const q of queue) {
        const { queuedAt: _q, ...row } = q;
        const { error: err } = await supabase.from('project_transactions').insert(row);
        if (!err || err.code === '23505') {
          synced = true; // déjà envoyée (envoi précédent interrompu) : succès
        } else if (isNetworkError(err)) {
          remaining.push(q);
        } else {
          setError(err.message); // refusée par la base (droits, budget supprimé…) : on abandonne cette écriture
        }
      }
      writeQueue(userId, remaining);
      setPendingSync(remaining);
      if (synced) {
        await refetch();
        // Le rechargement ne connaît pas les écritures encore en attente : on les réaffiche.
        if (remaining.length > 0) {
          setEntries(prev => {
            const known = new Set(prev.map(e => e.id));
            return [...remaining.filter(q => !known.has(q.id)).map(toOptimistic), ...prev];
          });
        }
      } else {
        setEntries(prev => prev.filter(e => !e.offline || remaining.some(r => r.id === e.id)));
      }
    } finally {
      flushing.current = false;
    }
  }, [userId, refetch, toOptimistic]);

  useEffect(() => {
    const on = () => { setIsOnline(true); void syncNow(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [syncNow]);

  // Au démarrage : réaffiche la file en attente et tente l'envoi.
  useEffect(() => {
    if (loading || !userId) return;
    const queue = readQueue(userId);
    if (queue.length === 0) return;
    setEntries(prev => {
      const known = new Set(prev.map(e => e.id));
      return [...queue.filter(q => !known.has(q.id)).map(toOptimistic), ...prev];
    });
    setPendingSync(queue);
    if (navigator.onLine) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  const summaries = useMemo(() => {
    const result: Record<string, BudgetSummary> = {};
    projects.forEach(p => {
      result[p.id] = summarizeBudget(
        p,
        categories.filter(c => c.project_id === p.id),
        entries.filter(e => e.project_id === p.id),
      );
    });
    return result;
  }, [projects, categories, entries]);

  const canEditEntry = useCallback((entry: ProjectTransaction): boolean => {
    if (entry.offline) return false;
    const role = roleOf(entry.project_id);
    if (role === 'owner') return true;
    if (role !== 'editor') return false;
    const project = projects.find(p => p.id === entry.project_id);
    return entry.user_id === userId && (entry.status !== 'approved' || !project?.requires_approval);
  }, [roleOf, projects, userId]);

  // ---- Catégories ----

  const addCategory = useCallback(async (projectId: string, category: NewCategory) => {
    const sortOrder = categories.filter(c => c.project_id === projectId).length;
    const { data, error: err } = await supabase
      .from('project_categories')
      .insert({ ...category, name: category.name.trim(), project_id: projectId, sort_order: sortOrder })
      .select()
      .single();
    if (err) throw mapError(err);
    setCategories(prev => [...prev, data as ProjectCategory]);
    return data as ProjectCategory;
  }, [categories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<NewCategory>) => {
    const payload = updates.name !== undefined ? { ...updates, name: updates.name.trim() } : updates;
    const { data, error: err } = await supabase.from('project_categories').update(payload).eq('id', id).select().single();
    if (err) throw mapError(err);
    setCategories(prev => prev.map(c => (c.id === id ? (data as ProjectCategory) : c)));
    return data as ProjectCategory;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('project_categories').delete().eq('id', id);
    if (err) throw mapError(err);
    setCategories(prev => prev.filter(c => c.id !== id));
    setEntries(prev => prev.map(e => (e.category_id === id ? { ...e, category_id: null } : e)));
  }, []);

  // ---- Justificatifs ----

  const removeStorageFiles = useCallback(async (paths: string[]) => {
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(RECEIPTS_BUCKET).remove(paths.slice(i, i + 100)).catch(() => undefined);
    }
  }, []);

  const addAttachments = useCallback(async (entry: { id: string; project_id: string }, files: File[]): Promise<UploadReport> => {
    const report: UploadReport = { uploaded: [], failed: [] };
    for (const original of files) {
      const problem = validateFile(original);
      if (problem) {
        report.failed.push({ name: original.name, reason: problem });
        continue;
      }
      const file = await compressImage(original);
      const path = `${entry.project_id}/${entry.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const contentType = file.type || (original.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

      const up = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, { contentType, upsert: false });
      if (up.error) {
        report.failed.push({ name: original.name, reason: 'upload' });
        continue;
      }
      const { data, error: err } = await supabase
        .from('project_attachments')
        .insert({ project_id: entry.project_id, entry_id: entry.id, path, name: original.name, mime: contentType, size: file.size })
        .select()
        .single();
      if (err) {
        await removeStorageFiles([path]);
        report.failed.push({ name: original.name, reason: 'upload' });
        continue;
      }
      report.uploaded.push(data as ProjectAttachment);
    }
    if (report.uploaded.length > 0) setAttachments(prev => [...prev, ...report.uploaded]);
    return report;
  }, [removeStorageFiles]);

  const removeAttachment = useCallback(async (attachment: ProjectAttachment) => {
    const { error: err } = await supabase.from('project_attachments').delete().eq('id', attachment.id);
    if (err) throw mapError(err);
    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    await removeStorageFiles([attachment.path]);
  }, [removeStorageFiles]);

  const getAttachmentUrl = useCallback(async (attachment: ProjectAttachment) => {
    const { data, error: err } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(attachment.path, 3600);
    if (err || !data) throw new Error(err?.message ?? 'URL indisponible');
    return data.signedUrl;
  }, []);

  // ---- Écritures du journal ----

  const addEntry = useCallback(async (input: NewEntry) => {
    const { sourceAccountId, projectName, ...row } = input;
    const queueable = row.type === 'expense' && !sourceAccountId;

    const enqueue = (): ProjectTransaction => {
      const queued: QueuedEntry = {
        id: crypto.randomUUID(), user_id: userId, project_id: row.project_id, category_id: row.category_id,
        type: 'expense', label: row.label, amount: row.amount, date: row.date, payee: row.payee,
        reference: row.reference, payment_method: row.payment_method, note: row.note,
        queuedAt: new Date().toISOString(),
      };
      const next = [...readQueue(userId), queued];
      writeQueue(userId, next);
      setPendingSync(next);
      const optimistic = toOptimistic(queued);
      setEntries(prev => [optimistic, ...prev]);
      return optimistic;
    };

    if (queueable && typeof navigator !== 'undefined' && !navigator.onLine) return enqueue();

    let sourceTxId: string | null = null;
    if (row.type === 'income' && sourceAccountId) {
      const name = projectName ?? projects.find(p => p.id === row.project_id)?.name;
      const tx = await addTransaction({
        account_id: sourceAccountId,
        type: 'expense',
        category: BUDGET_TX_CATEGORY,
        amount: row.amount,
        description: `${row.label}${name ? ` → ${name}` : ''}`,
        date: row.date,
        tags: ['budget'],
        family_member_id: null,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_parent_id: null,
        next_recurrence_date: null,
      });
      sourceTxId = tx.id;
    }

    const payload = {
      ...row,
      category_id: row.type === 'expense' ? row.category_id : null,
      source_transaction_id: sourceTxId,
    };
    const { data, error: err } = await supabase.from('project_transactions').insert(payload).select().single();
    if (err) {
      if (sourceTxId) await deleteTransaction(sourceTxId).catch(() => undefined);
      if (queueable && isNetworkError(err)) return enqueue();
      throw mapError(err);
    }
    setEntries(prev => [data as ProjectTransaction, ...prev]);
    return data as ProjectTransaction;
  }, [projects, userId, addTransaction, deleteTransaction, toOptimistic]);

  const updateEntry = useCallback(async (id: string, updates: EntryUpdate) => {
    const current = entries.find(e => e.id === id);
    const payload: Partial<ProjectTransaction> = { ...updates };
    const nextType = updates.type ?? current?.type;
    if (nextType === 'income') payload.category_id = null;

    if (current?.source_transaction_id) {
      if (nextType === 'expense') {
        await deleteTransaction(current.source_transaction_id).catch(() => undefined);
        payload.source_transaction_id = null;
      } else if (updates.amount !== undefined || updates.date !== undefined) {
        await updateTransaction(current.source_transaction_id, {
          ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
          ...(updates.date !== undefined ? { date: updates.date } : {}),
        }).catch(() => undefined);
      }
    }

    const { data, error: err } = await supabase.from('project_transactions').update(payload).eq('id', id).select().single();
    if (err) throw mapError(err);
    setEntries(prev => prev.map(e => (e.id === id ? (data as ProjectTransaction) : e)));
    return data as ProjectTransaction;
  }, [entries, updateTransaction, deleteTransaction]);

  const deleteEntry = useCallback(async (id: string) => {
    const current = entries.find(e => e.id === id);

    // Écriture jamais envoyée : on la retire simplement de la file d'attente.
    if (current?.offline) {
      const next = readQueue(userId).filter(q => q.id !== id);
      writeQueue(userId, next);
      setPendingSync(next);
      setEntries(prev => prev.filter(e => e.id !== id));
      return;
    }

    const files = attachments.filter(a => a.entry_id === id).map(a => a.path);
    const { error: err } = await supabase.from('project_transactions').delete().eq('id', id);
    if (err) throw mapError(err);
    setEntries(prev => prev.filter(e => e.id !== id));
    setAttachments(prev => prev.filter(a => a.entry_id !== id));
    if (files.length > 0) await removeStorageFiles(files);
    if (current?.source_transaction_id) {
      // Le décaissement lié dans les transactions est annulé avec l'écriture.
      await deleteTransaction(current.source_transaction_id).catch(() => undefined);
    }
  }, [entries, attachments, userId, removeStorageFiles, deleteTransaction]);

  const decideEntry = useCallback(async (id: string, status: EntryStatus, reason = '') => {
    const { data, error: err } = await supabase
      .from('project_transactions')
      .update({ status, rejection_reason: status === 'rejected' ? reason.trim() : '' })
      .eq('id', id)
      .select()
      .single();
    if (err) throw mapError(err);
    setEntries(prev => prev.map(e => (e.id === id ? (data as ProjectTransaction) : e)));
    return data as ProjectTransaction;
  }, []);

  const approveAllPending = useCallback(async (projectId: string) => {
    const { error: err } = await supabase
      .from('project_transactions')
      .update({ status: 'approved' })
      .eq('project_id', projectId)
      .eq('status', 'pending');
    if (err) throw mapError(err);
    await refetch();
  }, [refetch]);

  // ---- Partage ----

  const inviteMember = useCallback(async (projectId: string, email: string, role: ProjectMember['role']) => {
    const { data, error: err } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, email: email.trim().toLowerCase(), role })
      .select()
      .single();
    if (err) throw mapError(err, DUPLICATE_MEMBER);
    setMembers(prev => [...prev, data as ProjectMember]);
    return data as ProjectMember;
  }, []);

  const updateMemberRole = useCallback(async (id: string, role: ProjectMember['role']) => {
    const { data, error: err } = await supabase.from('project_members').update({ role }).eq('id', id).select().single();
    if (err) throw mapError(err, DUPLICATE_MEMBER);
    setMembers(prev => prev.map(m => (m.id === id ? (data as ProjectMember) : m)));
  }, []);

  const removeMember = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('project_members').delete().eq('id', id);
    if (err) throw mapError(err, DUPLICATE_MEMBER);
    setMembers(prev => prev.filter(m => m.id !== id));
    // Un membre qui quitte un budget partagé ne le voit plus.
    const mine = members.find(m => m.id === id);
    if (mine && mine.email.toLowerCase() === userEmail) {
      setProjects(prev => prev.filter(p => p.id !== mine.project_id));
    }
  }, [members, userEmail]);

  const loadAudit = useCallback(async (projectId: string): Promise<AuditEvent[]> => {
    const { data, error: err } = await supabase
      .from('project_audit_log')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (err) throw mapError(err);
    return (data || []) as AuditEvent[];
  }, []);

  // ---- Budgets ----

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { data, error: err } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (err) throw mapError(err);
    setProjects(prev => prev.map(p => (p.id === id ? (data as Project) : p)));
    return data as Project;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const files = attachments.filter(a => a.project_id === id).map(a => a.path);
    const { error: err } = await supabase.from('projects').delete().eq('id', id);
    if (err) throw mapError(err);
    setProjects(prev => prev.filter(p => p.id !== id));
    setCategories(prev => prev.filter(c => c.project_id !== id));
    setEntries(prev => prev.filter(e => e.project_id !== id));
    setMembers(prev => prev.filter(m => m.project_id !== id));
    setAttachments(prev => prev.filter(a => a.project_id !== id));
    if (files.length > 0) await removeStorageFiles(files);
  }, [attachments, removeStorageFiles]);

  const addProject = useCallback(async (project: NewProject, options?: CreateProjectOptions) => {
    const { data, error: err } = await supabase.from('projects').insert(project).select().single();
    if (err) throw mapError(err);
    const created = data as Project;

    try {
      if (options?.categories && options.categories.length > 0) {
        const rows = options.categories.map((c, i) => ({
          project_id: created.id,
          name: c.name.trim(),
          allocated_amount: c.allocated_amount,
          color: c.color,
          sort_order: i,
        }));
        const { data: cats, error: catErr } = await supabase.from('project_categories').insert(rows).select();
        if (catErr) throw mapError(catErr);
        setCategories(prev => [...prev, ...((cats || []) as ProjectCategory[])]);
      }

      setProjects(prev => [created, ...prev]);

      if (options?.initialFunds && options.initialFunds.amount > 0) {
        await addEntry({
          project_id: created.id,
          category_id: null,
          type: 'income',
          label: options.initialFunds.label,
          amount: options.initialFunds.amount,
          date: options.initialFunds.date,
          payee: '',
          reference: '',
          payment_method: '',
          note: '',
          sourceAccountId: options.initialFunds.sourceAccountId ?? null,
          projectName: created.name,
        });
      }
    } catch (e) {
      // Pas de budget à moitié créé : on annule tout.
      await supabase.from('projects').delete().eq('id', created.id);
      setProjects(prev => prev.filter(p => p.id !== created.id));
      setCategories(prev => prev.filter(c => c.project_id !== created.id));
      throw e;
    }
    return created;
  }, [addEntry]);

  const value = useMemo(
    () => ({
      userId, projects, categories, entries, members, attachments, summaries, loading, error,
      isOnline, pendingSync, syncNow, refetch, roleOf, canEditEntry,
      addProject, updateProject, deleteProject,
      addCategory, updateCategory, deleteCategory,
      addEntry, updateEntry, deleteEntry, decideEntry, approveAllPending,
      inviteMember, updateMemberRole, removeMember,
      addAttachments, removeAttachment, getAttachmentUrl, loadAudit,
    }),
    [
      userId, projects, categories, entries, members, attachments, summaries, loading, error,
      isOnline, pendingSync, syncNow, refetch, roleOf, canEditEntry,
      addProject, updateProject, deleteProject,
      addCategory, updateCategory, deleteCategory,
      addEntry, updateEntry, deleteEntry, decideEntry, approveAllPending,
      inviteMember, updateMemberRole, removeMember,
      addAttachments, removeAttachment, getAttachmentUrl, loadAudit,
    ],
  );

  return <ActivityBudgetsContext.Provider value={value}>{children}</ActivityBudgetsContext.Provider>;
};

export function useActivityBudgets(): ActivityBudgetsContextType {
  const ctx = useContext(ActivityBudgetsContext);
  if (!ctx) throw new Error('useActivityBudgets must be used within ActivityBudgetsProvider');
  return ctx;
}

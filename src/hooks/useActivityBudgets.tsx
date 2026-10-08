import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTransactions } from './useTransactions';
import { BUDGET_TX_CATEGORY, summarizeBudget } from '../lib/budgets';
import type { BudgetSummary } from '../lib/budgets';
import type { Project, ProjectCategory, ProjectTransaction } from '../types';

export type NewProject = Omit<Project, 'id' | 'user_id' | 'created_at'>;
export type NewCategory = { name: string; allocated_amount: number; color: string };
export type NewEntry = Omit<ProjectTransaction, 'id' | 'user_id' | 'created_at' | 'source_transaction_id'> & {
  /** Fonds reçus uniquement : compte d'où l'argent est décaissé (crée aussi une dépense dans les transactions). */
  sourceAccountId?: string | null;
  /** Nom du budget pour le libellé du décaissement (utile quand le budget vient d'être créé). */
  projectName?: string;
};

export interface CreateProjectOptions {
  categories?: NewCategory[];
  initialFunds?: { amount: number; date: string; sourceAccountId?: string | null; label: string };
}

export const DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY';

function mapError(err: { code?: string; message: string }): Error {
  if (err.code === '23505') return new Error(DUPLICATE_CATEGORY);
  return new Error(err.message);
}

interface ActivityBudgetsContextType {
  projects: Project[];
  categories: ProjectCategory[];
  entries: ProjectTransaction[];
  summaries: Record<string, BudgetSummary>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addProject: (project: NewProject, options?: CreateProjectOptions) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addCategory: (projectId: string, category: NewCategory) => Promise<ProjectCategory>;
  updateCategory: (id: string, updates: Partial<NewCategory>) => Promise<ProjectCategory>;
  deleteCategory: (id: string) => Promise<void>;
  addEntry: (entry: NewEntry) => Promise<ProjectTransaction>;
  updateEntry: (id: string, updates: Partial<Omit<NewEntry, 'sourceAccountId' | 'projectName'>>) => Promise<ProjectTransaction>;
  deleteEntry: (id: string) => Promise<void>;
}

const ActivityBudgetsContext = createContext<ActivityBudgetsContextType | undefined>(undefined);

export const ActivityBudgetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [entries, setEntries] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const [p, c, e] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('project_transactions').select('*').order('date', { ascending: false }),
    ]);
    const firstError = p.error || c.error || e.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setProjects((p.data || []) as Project[]);
      setCategories((c.data || []) as ProjectCategory[]);
      setEntries((e.data || []) as ProjectTransaction[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
    // Les écritures de cette catégorie passent en « sans catégorie » (ON DELETE SET NULL côté base).
    setEntries(prev => prev.map(e => (e.category_id === id ? { ...e, category_id: null } : e)));
  }, []);

  // ---- Écritures du journal ----

  const addEntry = useCallback(async (input: NewEntry) => {
    const { sourceAccountId, projectName, ...row } = input;
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
      throw mapError(err);
    }
    setEntries(prev => [data as ProjectTransaction, ...prev]);
    return data as ProjectTransaction;
  }, [projects, addTransaction, deleteTransaction]);

  const updateEntry = useCallback(async (id: string, updates: Partial<Omit<NewEntry, 'sourceAccountId' | 'projectName'>>) => {
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
    const { error: err } = await supabase.from('project_transactions').delete().eq('id', id);
    if (err) throw mapError(err);
    setEntries(prev => prev.filter(e => e.id !== id));
    if (current?.source_transaction_id) {
      // Le décaissement lié dans les transactions est annulé avec l'écriture.
      await deleteTransaction(current.source_transaction_id).catch(() => undefined);
    }
  }, [entries, deleteTransaction]);

  // ---- Budgets ----

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { data, error: err } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (err) throw mapError(err);
    setProjects(prev => prev.map(p => (p.id === id ? (data as Project) : p)));
    return data as Project;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('projects').delete().eq('id', id);
    if (err) throw mapError(err);
    setProjects(prev => prev.filter(p => p.id !== id));
    setCategories(prev => prev.filter(c => c.project_id !== id));
    setEntries(prev => prev.filter(e => e.project_id !== id));
  }, []);

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
      projects, categories, entries, summaries, loading, error, refetch,
      addProject, updateProject, deleteProject,
      addCategory, updateCategory, deleteCategory,
      addEntry, updateEntry, deleteEntry,
    }),
    [
      projects, categories, entries, summaries, loading, error, refetch,
      addProject, updateProject, deleteProject,
      addCategory, updateCategory, deleteCategory,
      addEntry, updateEntry, deleteEntry,
    ],
  );

  return <ActivityBudgetsContext.Provider value={value}>{children}</ActivityBudgetsContext.Provider>;
};

export function useActivityBudgets(): ActivityBudgetsContextType {
  const ctx = useContext(ActivityBudgetsContext);
  if (!ctx) throw new Error('useActivityBudgets must be used within ActivityBudgetsProvider');
  return ctx;
}

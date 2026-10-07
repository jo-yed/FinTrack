import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, ProjectTransaction } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setProjects((data || []) as Project[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    setProjects(prev => [data as Project, ...prev]);
    return data as Project;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setProjects(prev => prev.map(p => (p.id === id ? (data as Project) : p)));
    return data as Project;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    addProject,
    updateProject,
    deleteProject,
  };
}

export function useProjectTransactions(projectId: string | null) {
  const [transactions, setTransactions] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!projectId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('project_transactions')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTransactions((data || []) as ProjectTransaction[]);
      setError(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (tx: Omit<ProjectTransaction, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('project_transactions')
      .insert(tx)
      .select()
      .single();
    if (error) throw error;
    setTransactions(prev => [data as ProjectTransaction, ...prev]);
    return data as ProjectTransaction;
  };

  const updateTransaction = async (id: string, updates: Partial<ProjectTransaction>) => {
    const { data, error } = await supabase
      .from('project_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setTransactions(prev => prev.map(t => (t.id === id ? (data as ProjectTransaction) : t)));
    return data as ProjectTransaction;
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('project_transactions').delete().eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

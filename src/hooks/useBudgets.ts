import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Budget } from '../types';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const month = currentMonth();
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', month)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setBudgets((data || []) as Budget[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const addBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'month'> & { month?: string }) => {
    const month = budget.month || currentMonth();
    const { data, error } = await supabase
      .from('budgets')
      .insert({ category: budget.category, limit_amount: budget.limit_amount, month })
      .select()
      .single();
    if (error) throw error;
    setBudgets(prev => [data as Budget, ...prev]);
    return data as Budget;
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setBudgets(prev => prev.map(b => (b.id === id ? (data as Budget) : b)));
    return data as Budget;
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
  };
}

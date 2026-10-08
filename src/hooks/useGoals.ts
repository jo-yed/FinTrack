import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Goal } from '../types';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setGoals((data || []) as Goal[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (goal: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('goals')
      .insert(goal)
      .select()
      .single();
    if (error) throw error;
    setGoals(prev => [data as Goal, ...prev]);
    return data as Goal;
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setGoals(prev => prev.map(g => (g.id === id ? (data as Goal) : g)));
    return data as Goal;
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const contribute = async (id: string, amount: number) => {
    // Lecture de la valeur fraîche en base (évite d'écraser une contribution faite depuis un autre onglet).
    const { data: fresh, error: readErr } = await supabase
      .from('goals')
      .select('current_amount')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;
    const newAmount = Math.round((Number(fresh.current_amount) + amount) * 100) / 100;
    return updateGoal(id, { current_amount: newAmount });
  };

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    contribute,
  };
}

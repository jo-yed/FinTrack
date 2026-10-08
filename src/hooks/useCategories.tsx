import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BUDGET_TX_CATEGORY } from '../lib/budgets';
import type { Category } from '../types';

export const DEFAULT_CATEGORIES: { name: string; type: 'income' | 'expense' }[] = [
  { name: 'Salaire', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Alimentation', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Santé', type: 'expense' },
  { name: 'Logement', type: 'expense' },
  { name: 'Loisirs', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: BUDGET_TX_CATEGORY, type: 'expense' },
  { name: 'Autre', type: 'expense' },
];

interface CategoriesContextType {
  /** Catégories personnalisées créées par l'utilisateur. */
  custom: Category[];
  loading: boolean;
  /** Noms disponibles (par défaut + personnalisées) pour un type donné. */
  namesFor: (type: 'income' | 'expense') => string[];
  addCategory: (name: string, type: 'income' | 'expense', color: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [custom, setCustom] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setCustom((data || []) as Category[]);
        setLoading(false);
      });
  }, []);

  const namesFor = useCallback(
    (type: 'income' | 'expense') => {
      const names = DEFAULT_CATEGORIES.filter(c => c.type === type).map(c => c.name);
      custom.filter(c => c.type === type).forEach(c => {
        if (!names.some(n => n.toLowerCase() === c.name.toLowerCase())) names.push(c.name);
      });
      return names;
    },
    [custom],
  );

  const addCategory = useCallback(async (name: string, type: 'income' | 'expense', color: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), type, color })
      .select()
      .single();
    if (error) throw error;
    setCustom(prev => [...prev, data as Category]);
    return data as Category;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    setCustom(prev => prev.filter(c => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ custom, loading, namesFor, addCategory, deleteCategory }),
    [custom, loading, namesFor, addCategory, deleteCategory],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

export function useCategories(): CategoriesContextType {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}

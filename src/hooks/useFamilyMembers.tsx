import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { FamilyMember } from '../types';

type NewMember = Omit<FamilyMember, 'id' | 'user_id' | 'created_at'>;

interface FamilyContextType {
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addMember: (member: NewMember) => Promise<FamilyMember>;
  updateMember: (id: string, updates: Partial<FamilyMember>) => Promise<FamilyMember>;
  deleteMember: (id: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('family_members')
      .select('*')
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setMembers((data || []) as FamilyMember[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addMember = useCallback(async (member: NewMember) => {
    const { data, error: err } = await supabase.from('family_members').insert(member).select().single();
    if (err) throw err;
    setMembers(prev => [...prev, data as FamilyMember]);
    return data as FamilyMember;
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<FamilyMember>) => {
    const { data, error: err } = await supabase.from('family_members').update(updates).eq('id', id).select().single();
    if (err) throw err;
    setMembers(prev => prev.map(m => (m.id === id ? (data as FamilyMember) : m)));
    return data as FamilyMember;
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('family_members').delete().eq('id', id);
    if (err) throw err;
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({ members, loading, error, refetch, addMember, updateMember, deleteMember }),
    [members, loading, error, refetch, addMember, updateMember, deleteMember],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};

export function useFamilyMembers(): FamilyContextType {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamilyMembers must be used within FamilyProvider');
  return ctx;
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { FamilyMember } from '../types';

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setMembers((data || []) as FamilyMember[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (member: Omit<FamilyMember, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('family_members')
      .insert(member)
      .select()
      .single();
    if (error) throw error;
    setMembers(prev => [...prev, data as FamilyMember]);
    return data as FamilyMember;
  };

  const updateMember = async (id: string, updates: Partial<FamilyMember>) => {
    const { data, error } = await supabase
      .from('family_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setMembers(prev => prev.map(m => (m.id === id ? (data as FamilyMember) : m)));
    return data as FamilyMember;
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (error) throw error;
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    addMember,
    updateMember,
    deleteMember,
  };
}

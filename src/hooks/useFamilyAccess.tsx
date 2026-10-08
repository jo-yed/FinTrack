import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { callApi } from '../lib/api';
import { useAccess } from './useAccess';
import type { AccessStatus, FamilyAccess } from '../types';

export interface AccessRequestPreview {
  id: string;
  full_name: string;
  phone: string;
  requested_at: string;
}

export interface Permissions {
  addExpenses: boolean;
  viewFamily: boolean;
}

interface FamilyAccessContextType {
  /** Accès des membres de MA famille (liste vide pour un membre). */
  accesses: FamilyAccess[];
  /** Accès indexés par membre de famille (family_members.id). */
  byMemberId: Record<string, FamilyAccess>;
  loading: boolean;
  refetch: () => Promise<void>;
  lookup: (code: string) => Promise<AccessRequestPreview | null>;
  approve: (requestId: string, link: { familyMemberId: string | null; newMemberName?: string }, perms: Permissions) => Promise<void>;
  reject: (requestId: string) => Promise<void>;
  update: (id: string, perms: Permissions, status: Extract<AccessStatus, 'active' | 'suspended'>) => Promise<void>;
  revoke: (id: string) => Promise<void>;
  /** Génère un mot de passe provisoire (affiché une seule fois à l'administrateur). */
  resetPassword: (id: string) => Promise<string>;
}

const FamilyAccessContext = createContext<FamilyAccessContextType | undefined>(undefined);

/** Messages d'erreur renvoyés par la base (codes) → clés de texte. */
export function accessErrorKey(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const known = [
    'too_many_attempts', 'request_not_found', 'member_not_found', 'member_already_linked', 'access_not_found',
    'forbidden', 'not_renewable', 'invalid_status',
  ].find(code => message.includes(code));
  return known ? `familyAccess.errors.${known}` : 'familyAccess.errors.generic';
}

export const FamilyAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMember } = useAccess();
  const [accesses, setAccesses] = useState<FamilyAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (isMember) {
      setAccesses([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('family_access').select('*').order('requested_at', { ascending: false });
    setAccesses(error ? [] : ((data || []) as FamilyAccess[]));
    setLoading(false);
  }, [isMember]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const byMemberId = useMemo(() => {
    const map: Record<string, FamilyAccess> = {};
    accesses.forEach(a => { if (a.family_member_id) map[a.family_member_id] = a; });
    return map;
  }, [accesses]);

  const lookup = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc('lookup_access_request', { p_code: code });
    if (error) throw new Error(error.message);
    const rows = (data || []) as AccessRequestPreview[];
    return rows[0] ?? null;
  }, []);

  const approve = useCallback(async (requestId: string, link: { familyMemberId: string | null; newMemberName?: string }, perms: Permissions) => {
    const { error } = await supabase.rpc('approve_access_request', {
      p_id: requestId,
      p_family_member_id: link.familyMemberId,
      p_new_member_name: link.newMemberName ?? null,
      p_add_expenses: perms.addExpenses,
      p_view_family: perms.viewFamily,
    });
    if (error) throw new Error(error.message);
    await refetch();
  }, [refetch]);

  const reject = useCallback(async (requestId: string) => {
    const { error } = await supabase.rpc('reject_access_request', { p_id: requestId });
    if (error) throw new Error(error.message);
  }, []);

  const update = useCallback(async (id: string, perms: Permissions, status: 'active' | 'suspended') => {
    const { error } = await supabase.rpc('update_family_access', {
      p_id: id, p_add_expenses: perms.addExpenses, p_view_family: perms.viewFamily, p_status: status,
    });
    if (error) throw new Error(error.message);
    await refetch();
  }, [refetch]);

  const revoke = useCallback(async (id: string) => {
    const { error } = await supabase.rpc('revoke_family_access', { p_id: id });
    if (error) throw new Error(error.message);
    await refetch();
  }, [refetch]);

  const resetPassword = useCallback(async (id: string) => {
    const res = await callApi<{ tempPassword: string }>('member_reset_password', { accessId: id });
    return res.tempPassword;
  }, []);

  const value = useMemo(
    () => ({ accesses, byMemberId, loading, refetch, lookup, approve, reject, update, revoke, resetPassword }),
    [accesses, byMemberId, loading, refetch, lookup, approve, reject, update, revoke, resetPassword],
  );

  return <FamilyAccessContext.Provider value={value}>{children}</FamilyAccessContext.Provider>;
};

export function useFamilyAccess(): FamilyAccessContextType {
  const ctx = useContext(FamilyAccessContext);
  if (!ctx) throw new Error('useFamilyAccess must be used within FamilyAccessProvider');
  return ctx;
}

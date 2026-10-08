import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { FamilyAccess } from '../types';

export type AccessState = 'none' | 'requested' | 'active' | 'suspended' | 'rejected';

export interface Announcement {
  text: string;
  level: 'info' | 'warning' | 'critical';
}

interface AccessContextType {
  loading: boolean;
  /** Compte créé par téléphone (membre de famille) : n'a accès qu'à ce que son administrateur de famille a autorisé. */
  isMember: boolean;
  access: FamilyAccess | null;
  accessState: AccessState;
  canAddExpenses: boolean;
  canViewFamily: boolean;
  /** Adresse autorisée comme super administrateur (la double authentification est vérifiée dans la console). */
  isPlatformAdmin: boolean;
  mustChangePassword: boolean;
  announcement: Announcement | null;
  refresh: () => Promise<void>;
  renewRequest: () => Promise<string>;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

/** Délai entre deux vérifications automatiques tant qu'un membre attend la validation de sa demande. */
const POLL_MS = 15_000;

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const user = session?.user;
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const [access, setAccess] = useState<FamilyAccess | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  const metaMember = metadata.account_type === 'member';
  const isMember = metaMember || access !== null;

  const refresh = useCallback(async () => {
    if (!user) return;

    const [acc, ann] = await Promise.all([
      supabase.from('family_access').select('*').eq('member_user_id', user.id).maybeSingle(),
      supabase.from('platform_settings').select('announcement, announcement_level').maybeSingle(),
    ]);
    const row = (acc.error ? null : (acc.data as FamilyAccess | null)) ?? null;
    setAccess(row);
    const a = ann.data as { announcement: string; announcement_level: Announcement['level'] } | null;
    setAnnouncement(a && a.announcement ? { text: a.announcement, level: a.announcement_level } : null);

    if (!row && metadata.account_type !== 'member') {
      const { data } = await supabase.rpc('platform_admin_status');
      setIsPlatformAdmin(Boolean((data as { is_admin?: boolean } | null)?.is_admin));
    } else {
      setIsPlatformAdmin(false);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accessState: AccessState = !isMember ? 'none' : access?.status ?? 'none';

  // Un membre en attente (ou suspendu) revérifie régulièrement et au retour sur l'onglet
  useEffect(() => {
    if (!isMember || accessState === 'active') return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isMember, accessState, refresh]);

  const renewRequest = useCallback(async () => {
    const { data, error } = await supabase.rpc('renew_access_request');
    if (error) throw new Error(error.message);
    await refresh();
    return data as string;
  }, [refresh]);

  const value = useMemo<AccessContextType>(() => ({
    loading,
    isMember,
    access,
    accessState,
    canAddExpenses: accessState === 'active' && Boolean(access?.perm_add_expenses),
    canViewFamily: accessState === 'active' && Boolean(access?.perm_view_family),
    isPlatformAdmin,
    mustChangePassword: metadata.must_change_password === true,
    announcement,
    refresh,
    renewRequest,
  }), [loading, isMember, access, accessState, isPlatformAdmin, metadata.must_change_password, announcement, refresh, renewRequest]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

/** Version tolérante : renvoie null hors fournisseur (tests, composants isolés) — traité comme un compte ordinaire. */
export function useAccessOptional(): AccessContextType | null {
  return useContext(AccessContext) ?? null;
}

export function useAccess(): AccessContextType {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used within AccessProvider');
  return ctx;
}

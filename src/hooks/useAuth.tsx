import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { IDLE_CHECK_MS, IDLE_FLAG, IDLE_LIMIT_MS } from '../lib/session';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  /** Vrai quand l'utilisateur arrive depuis le lien « mot de passe oublié » et doit choisir un nouveau mot de passe. */
  recovery: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setSession(sess);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Déconnexion automatique après une longue inactivité
  const lastActivity = useRef(Date.now());
  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return;
    lastActivity.current = Date.now();
    const touch = () => { lastActivity.current = Date.now(); };
    const check = () => {
      if (Date.now() - lastActivity.current < IDLE_LIMIT_MS) return;
      try { sessionStorage.setItem(IDLE_FLAG, '1'); } catch { /* stockage indisponible */ }
      void supabase.auth.signOut();
    };
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointermove'];
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, IDLE_CHECK_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [signedIn]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, recovery, finishRecovery: () => setRecovery(false), signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

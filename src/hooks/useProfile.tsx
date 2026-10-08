import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  AVATAR_COLORS, DEFAULT_SKIN, clampSkin, displayNameFrom, firstNameOf, isAgeGroup, isGender, validFullName,
} from '../lib/avatar';
import type { AgeGroup, Gender } from '../lib/avatar';

const ProfileModal = lazy(() => import('../components/Profile/ProfileModal').then(m => ({ default: m.ProfileModal })));

export interface Profile {
  fullName: string;
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  skin: number;
  color: string;
  photo: string | null;
}

export interface ProfileUpdate {
  fullName: string;
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  skin: number;
  color: string;
  /** undefined = inchangée, null = supprimée. */
  photo?: string | null;
}

interface ProfileContextType {
  profile: Profile;
  /** Nom à afficher (nom complet, ou début de l'e-mail à défaut). */
  displayName: string;
  firstName: string;
  email: string;
  /** Vrai quand le nom complet est renseigné. */
  hasName: boolean;
  /** Vrai quand le nom, le sexe et la tranche d'âge sont renseignés. */
  isComplete: boolean;
  save: (update: ProfileUpdate) => Promise<void>;
  openProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const user = session?.user;
  const userId = user?.id ?? '';
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const [photo, setPhoto] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // La photo est lue à part (elle est trop lourde pour la session) et seulement quand l'utilisateur est connecté.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('user_profiles').select('photo').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (!cancelled) setPhoto((data as { photo: string | null } | null)?.photo ?? null);
    }, () => undefined);
    return () => { cancelled = true; };
  }, [userId]);

  const fullName = typeof meta.full_name === 'string' ? meta.full_name : '';
  const gender = isGender(meta.gender) ? meta.gender : null;
  const ageGroup = isAgeGroup(meta.age_group) ? meta.age_group : null;
  const skin = meta.skin_tone === undefined ? DEFAULT_SKIN : clampSkin(meta.skin_tone);
  const color = typeof meta.avatar_color === 'string' && AVATAR_COLORS.includes(meta.avatar_color) ? meta.avatar_color : AVATAR_COLORS[0];
  const email = user?.email ?? '';

  const save = useCallback(async (update: ProfileUpdate) => {
    const name = update.fullName.trim();
    if (!validFullName(name)) throw new Error('invalid_name');
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        gender: update.gender,
        age_group: update.ageGroup,
        skin_tone: clampSkin(update.skin),
        avatar_color: AVATAR_COLORS.includes(update.color) ? update.color : AVATAR_COLORS[0],
      },
    });
    if (error) throw error;
    if (update.photo !== undefined) {
      const { error: photoError } = await supabase.from('user_profiles').upsert({ user_id: userId, photo: update.photo, updated_at: new Date().toISOString() });
      if (photoError) throw photoError;
      setPhoto(update.photo);
    }
  }, [userId]);

  const openProfile = useCallback(() => setOpen(true), []);

  const value = useMemo<ProfileContextType>(() => {
    const profile: Profile = { fullName, gender, ageGroup, skin, color, photo };
    const displayName = displayNameFrom(fullName, email);
    return {
      profile,
      displayName,
      firstName: firstNameOf(displayName),
      email,
      hasName: fullName.trim().length > 0,
      isComplete: fullName.trim().length > 0 && gender !== null && ageGroup !== null,
      save,
      openProfile,
    };
  }, [fullName, gender, ageGroup, skin, color, photo, email, save, openProfile]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <ProfileModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </ProfileContext.Provider>
  );
};

/** Valeur de repli quand aucun fournisseur n'est présent (écrans isolés, tests) : profil vide, aucune action. */
const FALLBACK: ProfileContextType = {
  profile: { fullName: '', gender: null, ageGroup: null, skin: DEFAULT_SKIN, color: AVATAR_COLORS[0], photo: null },
  displayName: '',
  firstName: '',
  email: '',
  hasName: false,
  isComplete: false,
  save: () => Promise.reject(new Error('no_profile_provider')),
  openProfile: () => undefined,
};

export function useProfile(): ProfileContextType {
  return useContext(ProfileContext) ?? FALLBACK;
}

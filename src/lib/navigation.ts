import type { PageId } from '../types';

export interface Profile {
  isMember: boolean;
  canViewFamily: boolean;
  isPlatformAdmin: boolean;
}

const OWNER_PAGES: PageId[] = [
  'dashboard', 'transactions', 'accounts', 'reports', 'goals', 'activities', 'family', 'budgets', 'vault', 'settings',
];

/** Pages accessibles selon le profil (la base de données applique de toute façon les mêmes limites). */
export function allowedPages({ isMember, canViewFamily, isPlatformAdmin }: Profile): PageId[] {
  if (isMember) {
    return ['myspace', ...(canViewFamily ? (['family'] as PageId[]) : []), 'activities', 'settings'];
  }
  return isPlatformAdmin ? [...OWNER_PAGES, 'admin'] : OWNER_PAGES;
}

export function defaultPage(profile: Profile): PageId {
  return profile.isMember ? 'myspace' : 'dashboard';
}

/** Page à afficher : celle demandée si elle est permise, sinon la page d'accueil du profil. */
export function resolvePage(requested: PageId, profile: Profile): PageId {
  return allowedPages(profile).includes(requested) ? requested : defaultPage(profile);
}

/** Avatars et profil : sexe, tranche d'âge, teint, couleur de fond, nom affiché. */

export type Gender = 'f' | 'm' | 'x';
export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior';

export const GENDERS: Gender[] = ['f', 'm', 'x'];
export const AGE_GROUPS: AgeGroup[] = ['child', 'teen', 'adult', 'senior'];

/** Teints, du plus clair au plus foncé. */
export const SKIN_TONES = ['#F6D5B8', '#E2B48A', '#C68B5E', '#8D5A3B', '#5B3A26'];
export const DEFAULT_SKIN = 3;

export const AVATAR_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#F97316', '#84CC16'];

export function isGender(v: unknown): v is Gender {
  return v === 'f' || v === 'm' || v === 'x';
}

export function isAgeGroup(v: unknown): v is AgeGroup {
  return v === 'child' || v === 'teen' || v === 'adult' || v === 'senior';
}

export function clampSkin(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n >= 0 && n < SKIN_TONES.length ? n : DEFAULT_SKIN;
}

/** Valeurs proposées d'office selon le rôle familial choisi (modifiables ensuite). */
export function defaultsForRole(role: string): { gender: Gender; age_group: AgeGroup } | null {
  switch (role) {
    case 'Père': return { gender: 'm', age_group: 'adult' };
    case 'Mère': return { gender: 'f', age_group: 'adult' };
    case 'Fils': return { gender: 'm', age_group: 'teen' };
    case 'Fille': return { gender: 'f', age_group: 'teen' };
    case 'Enfant': return { gender: 'x', age_group: 'child' };
    default: return null;
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function validFullName(name: string): boolean {
  const n = name.trim();
  return n.length >= 2 && n.length <= 80;
}

/** Nom affiché : nom complet, à défaut la partie locale de l'e-mail (sauf adresse technique téléphone). */
export function displayNameFrom(fullName: string, email: string | null | undefined): string {
  if (fullName.trim()) return fullName.trim();
  if (email && !email.endsWith('@phone.fintrack.invalid')) return email.split('@')[0];
  return '';
}

/** Réduit une photo à un carré compact (JPEG) pour qu'elle reste légère : environ 10 Ko. */
export async function resizePhoto(file: File, side = 192): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not_image');
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  const min = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - min) / 2, (bitmap.height - min) / 2, min, min, 0, 0, side, side);
  bitmap.close?.();
  for (const quality of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= 55000) return url;
  }
  throw new Error('too_big');
}

/**
 * Numéros de téléphone : normalisation et adresse de connexion technique.
 * Source unique, utilisée par la fonction serveur ET par l'application (src/lib/phone.ts la ré-exporte).
 */

export const DEFAULT_COUNTRY_CODE = '237'; // Cameroun

/** Domaine RÉSERVÉ (RFC 2606, « .invalid ») : personne ne peut jamais l'enregistrer ni y recevoir un e-mail. */
export const PHONE_EMAIL_DOMAIN = 'phone.fintrack.invalid';

/**
 * Renvoie le numéro en chiffres uniquement, avec l'indicatif pays (ex. 237677112233), ou null s'il est invalide.
 * Accepte : « 6 77 11 22 33 », « +237 677 11 22 33 », « 00237677112233 », « 237677112233 ».
 * Au Cameroun, un numéro national a 9 chiffres et commence par 6 (mobile) ou 2 (fixe).
 */
export function normalizePhone(input: string, defaultCountry: string = DEFAULT_COUNTRY_CODE): string | null {
  if (typeof input !== 'string') return null;
  let raw = input.trim().replace(/[\s().\-_]/g, '');
  if (raw === '') return null;

  let digits: string;
  if (raw.startsWith('+')) digits = raw.slice(1);
  else if (raw.startsWith('00')) digits = raw.slice(2);
  else digits = raw;

  if (!/^\d+$/.test(digits)) return null;

  const international = raw.startsWith('+') || raw.startsWith('00');
  if (!international) {
    // Numéro saisi sans indicatif : on ajoute celui du pays par défaut
    if (digits.startsWith(defaultCountry) && digits.length >= defaultCountry.length + 8) {
      // déjà préfixé (237677112233)
    } else if (digits.length <= 10) {
      digits = defaultCountry + digits.replace(/^0+/, '');
    } else {
      return null; // trop long pour un numéro local et sans « + » : ambigu, on refuse
    }
  }

  if (!/^\d{8,15}$/.test(digits)) return null;

  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    const national = digits.slice(DEFAULT_COUNTRY_CODE.length);
    if (!/^[62]\d{8}$/.test(national)) return null;
  }
  return digits;
}

/** Adresse de connexion technique associée à un numéro (jamais affichée à l'utilisateur). */
export function phoneToEmail(phoneDigits: string): string {
  return `p${phoneDigits}@${PHONE_EMAIL_DOMAIN}`;
}

export function isPhoneEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/** Affichage lisible : +237 6 77 11 22 33 */
export function formatPhone(phoneDigits: string): string {
  if (phoneDigits.startsWith(DEFAULT_COUNTRY_CODE) && phoneDigits.length === DEFAULT_COUNTRY_CODE.length + 9) {
    const n = phoneDigits.slice(DEFAULT_COUNTRY_CODE.length);
    return `+${DEFAULT_COUNTRY_CODE} ${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`;
  }
  return `+${phoneDigits}`;
}

/** Le texte saisi ressemble-t-il à un numéro de téléphone plutôt qu'à une adresse e-mail ? */
export function looksLikePhone(input: string): boolean {
  const s = input.trim();
  return s !== '' && !s.includes('@') && /^[+\d][\d\s().\-]*$/.test(s);
}

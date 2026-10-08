import { describe, it, expect } from 'vitest';
import { formatPhone, isPhoneEmail, looksLikePhone, normalizePhone, phoneToEmail } from './phone';

describe('numéros de téléphone', () => {
  it('normalise les saisies courantes au Cameroun', () => {
    const expected = '237677112233';
    expect(normalizePhone('677112233')).toBe(expected);
    expect(normalizePhone('6 77 11 22 33')).toBe(expected);
    expect(normalizePhone('+237 677 11 22 33')).toBe(expected);
    expect(normalizePhone('00237677112233')).toBe(expected);
    expect(normalizePhone('237677112233')).toBe(expected);
    expect(normalizePhone('(237) 677-11-22-33')).toBe(expected);
  });

  it('accepte aussi les numéros fixes (commençant par 2)', () => {
    expect(normalizePhone('222 12 34 56')).toBe('237222123456');
  });

  it('refuse les numéros invalides', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('577112233')).toBeNull(); // un numéro camerounais commence par 6 ou 2
    expect(normalizePhone('6771122334455')).toBeNull();
    expect(normalizePhone('+237 6771')).toBeNull();
    expect(normalizePhone("677112233; DROP TABLE users")).toBeNull();
  });

  it("accepte un numéro étranger avec indicatif explicite", () => {
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('33612345678');
    expect(normalizePhone('0033612345678')).toBe('33612345678');
  });

  it("construit l'adresse de connexion technique sur un domaine réservé", () => {
    expect(phoneToEmail('237677112233')).toBe('p237677112233@phone.fintrack.invalid');
    expect(isPhoneEmail('p237677112233@phone.fintrack.invalid')).toBe(true);
    expect(isPhoneEmail('P237677112233@PHONE.FINTRACK.INVALID')).toBe(true);
    expect(isPhoneEmail('luc@joyeds.com')).toBe(false);
    expect(isPhoneEmail(null)).toBe(false);
  });

  it('formate pour affichage', () => {
    expect(formatPhone('237677112233')).toBe('+237 6 77 11 22 33');
    expect(formatPhone('33612345678')).toBe('+33612345678');
  });

  it('distingue un téléphone d\'une adresse e-mail', () => {
    expect(looksLikePhone('677 11 22 33')).toBe(true);
    expect(looksLikePhone('+237677112233')).toBe(true);
    expect(looksLikePhone('luc@joyeds.com')).toBe(false);
    expect(looksLikePhone('')).toBe(false);
    expect(looksLikePhone('Luc')).toBe(false);
  });
});

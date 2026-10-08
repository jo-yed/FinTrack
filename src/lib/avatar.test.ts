import { describe, expect, it } from 'vitest';
import { clampSkin, defaultsForRole, displayNameFrom, firstNameOf, initialsOf, isAgeGroup, isGender, validFullName, SKIN_TONES, DEFAULT_SKIN } from './avatar';

describe('avatars et profil', () => {
  it('initiales : une ou deux lettres, jamais vide', () => {
    expect(initialsOf('Luc Boten')).toBe('LB');
    expect(initialsOf('  marie  ')).toBe('M');
    expect(initialsOf('Jean Pierre Kamga')).toBe('JK');
    expect(initialsOf('')).toBe('?');
  });

  it('prénom = premier mot', () => {
    expect(firstNameOf('Luc Boten')).toBe('Luc');
    expect(firstNameOf('')).toBe('');
  });

  it('nom affiché : nom complet, sinon début de l\'e-mail, jamais l\'adresse technique du téléphone', () => {
    expect(displayNameFrom('Luc Boten', 'luc@x.com')).toBe('Luc Boten');
    expect(displayNameFrom('', 'luc@x.com')).toBe('luc');
    expect(displayNameFrom('', 'p237677112233@phone.fintrack.invalid')).toBe('');
    expect(displayNameFrom('  ', null)).toBe('');
  });

  it('nom valide : 2 à 80 caractères', () => {
    expect(validFullName('A')).toBe(false);
    expect(validFullName(' Al ')).toBe(true);
    expect(validFullName('x'.repeat(81))).toBe(false);
  });

  it('valeurs inconnues rejetées', () => {
    expect(isGender('f')).toBe(true);
    expect(isGender('z')).toBe(false);
    expect(isAgeGroup('senior')).toBe(true);
    expect(isAgeGroup('baby')).toBe(false);
  });

  it('teint : toujours un indice valide', () => {
    expect(clampSkin(0)).toBe(0);
    expect(clampSkin(4)).toBe(4);
    expect(clampSkin(9)).toBe(DEFAULT_SKIN);
    expect(clampSkin('x')).toBe(DEFAULT_SKIN);
    expect(clampSkin(1.5)).toBe(DEFAULT_SKIN);
    expect(SKIN_TONES).toHaveLength(5);
  });

  it('rôle familial : sexe et âge proposés d\'office', () => {
    expect(defaultsForRole('Père')).toEqual({ gender: 'm', age_group: 'adult' });
    expect(defaultsForRole('Mère')).toEqual({ gender: 'f', age_group: 'adult' });
    expect(defaultsForRole('Fille')).toEqual({ gender: 'f', age_group: 'teen' });
    expect(defaultsForRole('Enfant')).toEqual({ gender: 'x', age_group: 'child' });
    expect(defaultsForRole('Autre')).toBeNull();
  });
});

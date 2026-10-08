import { describe, it, expect } from 'vitest';
import { deriveKey, generateSalt, encryptJson, decryptJson, createVerifier, checkVerifier } from './crypto';

describe('crypto du coffre', () => {
  it('chiffre puis déchiffre un objet', async () => {
    const salt = generateSalt();
    const key = await deriveKey('mot-de-passe-solide', salt, 1000);
    const payload = await encryptJson(key, { iban: 'CM21 1000', pin: '1234' });
    expect(payload).not.toContain('1234');
    expect(await decryptJson(key, payload)).toEqual({ iban: 'CM21 1000', pin: '1234' });
  });

  it('refuse un mauvais mot de passe', async () => {
    const salt = generateSalt();
    const good = await deriveKey('bon', salt, 1000);
    const bad = await deriveKey('mauvais', salt, 1000);
    const verifier = await createVerifier(good);
    expect(await checkVerifier(good, verifier)).toBe(true);
    expect(await checkVerifier(bad, verifier)).toBe(false);
  });

  it('produit un chiffré différent à chaque fois (IV aléatoire)', async () => {
    const key = await deriveKey('x', generateSalt(), 1000);
    expect(await encryptJson(key, { a: 1 })).not.toBe(await encryptJson(key, { a: 1 }));
  });
});

/**
 * Chiffrement du coffre-fort côté client (Web Crypto) :
 * - clé AES-GCM 256 bits dérivée du mot de passe maître via PBKDF2-SHA256 ;
 * - le mot de passe et la clé ne quittent jamais le navigateur ni ne sont stockés ;
 * - un « vérificateur » chiffré permet de contrôler le mot de passe sans le conserver.
 */

export const PBKDF2_ITERATIONS = 310_000;
const VERIFIER_PLAINTEXT = 'fintrack-vault-v1';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

export function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(password: string, saltB64: string, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Chiffre une chaîne : renvoie base64(iv[12] + texte chiffré). */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext)));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return toBase64(out);
}

/** Déchiffre ; lève une erreur si la clé est mauvaise ou si les données sont altérées. */
export async function decryptString(key: CryptoKey, payloadB64: string): Promise<string> {
  const bytes = fromBase64(payloadB64);
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return dec.decode(plain);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  return encryptString(key, JSON.stringify(value));
}

export async function decryptJson<T>(key: CryptoKey, payloadB64: string): Promise<T> {
  return JSON.parse(await decryptString(key, payloadB64)) as T;
}

export async function createVerifier(key: CryptoKey): Promise<string> {
  return encryptString(key, VERIFIER_PLAINTEXT);
}

export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    return (await decryptString(key, verifier)) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

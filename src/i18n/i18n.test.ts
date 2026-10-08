import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTranslation, translations } from './translations';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function flatten(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

const root = path.resolve(__dirname, '..');
const sources = walk(root).filter(f =>
  /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) && !f.includes(`${path.sep}test${path.sep}`) && !/i18n[\\/](translations|extra\d?)\.ts$/.test(f));

describe('traductions', () => {
  const groups = new Set(Object.keys(translations.fr));

  it('le français et l\'anglais ont exactement les mêmes clés', () => {
    const fr = new Set(flatten(translations.fr));
    const en = new Set(flatten(translations.en));
    expect([...fr].filter(k => !en.has(k))).toEqual([]);
    expect([...en].filter(k => !fr.has(k))).toEqual([]);
  });

  it('tous les textes utilisés dans le code existent dans les deux langues', () => {
    const used = new Map<string, string>();
    const literal = /(['"`])([a-zA-Z0-9]+(?:\.[a-zA-Z0-9_]+)+)\1/g;
    for (const file of sources) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(literal)) {
        const key = m[2];
        if (groups.has(key.split('.')[0])) used.set(key, path.relative(root, file));
      }
    }
    const missing: string[] = [];
    for (const [key, file] of used) {
      for (const lang of ['fr', 'en'] as const) {
        if (getTranslation(lang, key) === key) missing.push(`${lang}: ${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(200);
  });
});

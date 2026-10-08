import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsv, slugify } from './csv';

describe('csv', () => {
  it('échappe guillemets, point-virgule et retours à la ligne', () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(escapeCsvCell('l1\nl2')).toBe('"l1\nl2"');
  });

  it('neutralise les formules mais garde les nombres négatifs', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell(-12.5)).toBe('-12.5');
  });

  it('ajoute le BOM UTF-8 et sépare par ;', () => {
    const csv = toCsv([['Date', 'Montant'], ['2026-01-01', 10]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Date;Montant\r\n2026-01-01;10');
  });

  it('slugify', () => {
    expect(slugify('Mission Douala — Été')).toBe('mission-douala-ete');
  });
});

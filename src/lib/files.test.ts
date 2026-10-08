import { describe, it, expect } from 'vitest';
import { fileExtension, formatBytes, safeFileName, validateFile, MAX_FILE_BYTES } from './files';

describe('fichiers', () => {
  it('nettoie les noms de fichier', () => {
    expect(safeFileName('Facture été n°12 (final).PDF')).toBe('Facture-ete-n-12-final.pdf');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('..\\..\\Windows\\hosts.txt')).toBe('hosts.txt');
    expect(safeFileName('')).toBe('fichier');
  });

  it("déduit l'extension", () => {
    expect(fileExtension('reçu.JPG')).toBe('jpg');
    expect(fileExtension('sans-extension', 'application/pdf')).toBe('pdf');
    expect(fileExtension('x', 'image/png')).toBe('png');
  });

  it('valide type et taille', () => {
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toBeNull();
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_BYTES + 1 })).toBe('size');
    expect(validateFile({ name: 'a.exe', type: 'application/x-msdownload', size: 10 })).toBe('type');
    expect(validateFile({ name: 'scan.pdf', type: '', size: 10 })).toBeNull();
  });

  it('formate les tailles', () => {
    expect(formatBytes(500)).toBe('500 o');
    expect(formatBytes(2048)).toBe('2 Ko');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 Mo');
  });
});

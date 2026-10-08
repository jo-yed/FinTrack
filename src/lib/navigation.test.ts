import { describe, it, expect } from 'vitest';
import { allowedPages, defaultPage, resolvePage } from './navigation';

const owner = { isMember: false, canViewFamily: false, isPlatformAdmin: false };
const admin = { ...owner, isPlatformAdmin: true };
const child = { isMember: true, canViewFamily: false, isPlatformAdmin: false };
const partner = { isMember: true, canViewFamily: true, isPlatformAdmin: false };

describe('navigation par profil', () => {
  it("l'administrateur de famille accède à tout sauf à l'espace membre et à la console", () => {
    const pages = allowedPages(owner);
    expect(pages).toContain('vault');
    expect(pages).toContain('accounts');
    expect(pages).not.toContain('myspace');
    expect(pages).not.toContain('admin');
  });

  it("le super administrateur voit en plus la console d'administration", () => {
    expect(allowedPages(admin)).toContain('admin');
  });

  it("un membre n'accède jamais aux comptes, au coffre, aux objectifs ni à l'administration", () => {
    for (const profile of [child, partner]) {
      const pages = allowedPages(profile);
      for (const forbidden of ['accounts', 'vault', 'goals', 'dashboard', 'transactions', 'reports', 'budgets', 'admin'] as const) {
        expect(pages).not.toContain(forbidden);
      }
      expect(pages).toContain('myspace');
    }
  });

  it('la page famille dépend du droit « voir toute la famille »', () => {
    expect(allowedPages(child)).not.toContain('family');
    expect(allowedPages(partner)).toContain('family');
  });

  it('une page interdite est remplacée par la page d\'accueil du profil', () => {
    expect(resolvePage('vault', child)).toBe('myspace');
    expect(resolvePage('admin', owner)).toBe('dashboard');
    expect(resolvePage('admin', child)).toBe('myspace');
    expect(resolvePage('family', partner)).toBe('family');
    expect(resolvePage('dashboard', owner)).toBe('dashboard');
    expect(defaultPage(child)).toBe('myspace');
  });
});

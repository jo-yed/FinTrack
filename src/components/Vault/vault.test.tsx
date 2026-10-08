// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (table: string) => db.from(table) },
  isSupabaseConfigured: true,
}));

import { LanguageProvider } from '../../i18n';
import { VaultProvider } from '../../hooks/useVault';
import { VaultList } from './VaultList';
import { createVerifier, deriveKey, generateSalt, PBKDF2_ITERATIONS } from '../../lib/crypto';

const Harness: React.FC = () => (
  <LanguageProvider>
    <VaultProvider>
      <VaultList />
    </VaultProvider>
  </LanguageProvider>
);

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  localStorage.clear();
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});

afterEach(() => cleanup());

describe('Coffre-fort chiffré', () => {
  it('crée le coffre, chiffre les données, refuse un mauvais mot de passe puis redonne accès avec le bon', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // 1) Création du mot de passe maître
    expect(await screen.findByText('Créez votre mot de passe maître')).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Mot de passe maître'), 'MotDePasse-Solide-1');
    await user.type(screen.getByPlaceholderText('Confirmer le mot de passe maître'), 'MotDePasse-Solide-1');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Créer mon coffre' }));

    expect(await screen.findByText('Coffre-fort vide', {}, { timeout: 8000 })).toBeTruthy();
    expect(db.tables.vault_settings).toHaveLength(1);
    expect(db.tables.vault_settings[0].verifier).not.toContain('MotDePasse');

    // 2) Ajout d'un élément : stocké chiffré, jamais en clair
    await user.click(screen.getAllByRole('button', { name: /Nouvel Élément|Ajouter un élément/ })[0]);
    await user.type(screen.getByPlaceholderText(/Compte Principal UBA/), 'Compte UBA');
    await user.type(screen.getByPlaceholderText('Nom du champ'), 'password');
    await user.type(screen.getByPlaceholderText('Valeur'), 'super-secret-123');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(db.tables.vault_items).toHaveLength(1));
    const stored = JSON.stringify(db.tables.vault_items[0].data);
    expect(stored).toContain('__enc');
    expect(stored).not.toContain('super-secret-123');
    expect(await screen.findByText('Compte UBA')).toBeTruthy();

    // 3) Verrouillage
    await user.click(screen.getByRole('button', { name: /Verrouiller/ }));
    expect(await screen.findByText('Entrez votre mot de passe maître')).toBeTruthy();
    expect(screen.queryByText('Compte UBA')).toBeNull();

    // 4) Mauvais mot de passe
    await user.type(screen.getByPlaceholderText('Mot de passe maître'), 'mauvais-mot-de-passe');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText('Mot de passe maître incorrect.', {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText('Compte UBA')).toBeNull();

    // 5) Bon mot de passe : l'élément est déchiffré
    await user.clear(screen.getByPlaceholderText('Mot de passe maître'));
    await user.type(screen.getByPlaceholderText('Mot de passe maître'), 'MotDePasse-Solide-1');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));
    expect(await screen.findByText('Compte UBA', {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText('super-secret-123')).toBeNull(); // masqué par défaut
  }, 60000);

  it('chiffre automatiquement un ancien élément resté en clair lors du déverrouillage', async () => {
    const salt = generateSalt();
    const key = await deriveKey('ancien-mot-de-passe', salt, PBKDF2_ITERATIONS);
    db.seed('vault_settings', { salt, verifier: await createVerifier(key), iterations: PBKDF2_ITERATIONS });
    db.seed('vault_items', { title: 'Ancien item', type: 'password', data: { password: 'en-clair-123' } });

    const user = userEvent.setup();
    render(<Harness />);

    await user.type(await screen.findByPlaceholderText('Mot de passe maître'), 'ancien-mot-de-passe');
    await user.click(screen.getByRole('button', { name: 'Déverrouiller' }));

    expect(await screen.findByText('Ancien item', {}, { timeout: 8000 })).toBeTruthy();
    const stored = JSON.stringify(db.tables.vault_items[0].data);
    expect(stored).toContain('__enc');
    expect(stored).not.toContain('en-clair-123');
  }, 60000);
});

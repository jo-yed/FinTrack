// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();
const invoke = vi.hoisted(() => vi.fn());
const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => db.from(table),
    rpc: (name: string, args: Record<string, unknown>) => db.rpc(name, args),
    functions: { invoke },
    auth: { mfa },
  },
  isSupabaseConfigured: true,
}));

import { LanguageProvider } from '../../i18n';
import { AdminConsole } from './AdminConsole';

const ok = (data: unknown) => ({ data, error: null });
const overview = {
  users: 42, confirmed_users: 40, banned_users: 2, member_accounts: 9, pending_requests: 3, families: 5,
  new_7d: 6, new_30d: 18, active_7d: 21, budgets: 17, entries: 230, transactions: 1200, attachments: 64, attachments_bytes: 5 * 1024 * 1024, vaults: 7,
};
const users = [
  { id: 'u-admin', email: 'luc_boten@joyeds.com', full_name: 'Luc', phone: '', account_type: 'standard', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-10-01T00:00:00Z', confirmed: true, banned: false, is_admin: true, budgets: 2, transactions: 10, access_status: null, family_owner_email: null },
  { id: 'u-chef', email: 'chef@famille.cm', full_name: 'Chef Famille', phone: '', account_type: 'standard', created_at: '2026-02-01T00:00:00Z', last_sign_in_at: null, confirmed: true, banned: false, is_admin: false, budgets: 3, transactions: 40, access_status: null, family_owner_email: null },
  { id: 'u-jr', email: null, full_name: 'Junior Ndongo', phone: '237677112233', account_type: 'member', created_at: '2026-03-01T00:00:00Z', last_sign_in_at: null, confirmed: true, banned: false, is_admin: false, budgets: 0, transactions: 0, access_status: 'requested', family_owner_email: null },
  { id: 'u-bad', email: 'spam@x.com', full_name: '', phone: '', account_type: 'standard', created_at: '2026-04-01T00:00:00Z', last_sign_in_at: null, confirmed: true, banned: true, is_admin: false, budgets: 0, transactions: 0, access_status: null, family_owner_email: null },
];

const allowMfa = () => {
  mfa.listFactors.mockResolvedValue(ok({ totp: [{ id: 'f1', status: 'verified' }], all: [{ id: 'f1', status: 'verified', factor_type: 'totp' }] }));
  mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal2', nextLevel: 'aal2' }));
};

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  db.rpcCalls = [];
  db.rpcHandlers = {
    admin_overview: () => ok(overview),
    admin_list_users: ({ p_filter, p_search }) => {
      const list = users.filter(u =>
        (p_filter === 'banned' ? u.banned : p_filter === 'members' ? u.account_type === 'member' : true) &&
        (`${u.email ?? ''}${u.full_name}${u.phone}`.toLowerCase().includes(String(p_search).toLowerCase())));
      return ok({ total: list.length, users: list });
    },
    admin_set_banned: () => ok(null),
    admin_sign_out_user: () => ok(null),
    admin_set_announcement: () => ok(null),
    admin_audit_list: () => ok([
      { id: 'a1', actor: 'u-admin', actor_email: 'luc_boten@joyeds.com', action: 'user_suspended', target_id: 'u-bad', target_label: 'spam@x.com', details: {}, created_at: '2026-10-01T10:00:00Z' },
      { id: 'a2', actor: 'u-admin', actor_email: 'luc_boten@joyeds.com', action: 'announcement_changed', target_id: null, target_label: 'Maintenance', details: { level: 'warning' }, created_at: '2026-10-02T10:00:00Z' },
    ]),
  };
  [mfa.listFactors, mfa.getAuthenticatorAssuranceLevel, mfa.enroll, mfa.challengeAndVerify, mfa.unenroll, invoke].forEach(m => m.mockReset());
  allowMfa();
  invoke.mockResolvedValue({ data: { ok: true, filesRemoved: 0 }, error: null });
  localStorage.clear();
});
afterEach(() => cleanup());

const renderConsole = () => render(<LanguageProvider><AdminConsole /></LanguageProvider>);
const calls = (name: string) => db.rpcCalls.filter(c => c.name === name);

describe('Console admin : barrière de double authentification', () => {
  it('donne accès directement avec une session à deux facteurs', async () => {
    renderConsole();
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeTruthy();
  });

  it("demande le code à 6 chiffres quand le deuxième facteur n'est pas encore validé, et refuse un mauvais code", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal1', nextLevel: 'aal2' }));
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: { message: 'invalid' } });
    const user = userEvent.setup();
    renderConsole();

    expect(await screen.findByRole('heading', { name: 'Vérification en deux étapes' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Administration' })).toBeNull();
    expect(calls('admin_overview')).toHaveLength(0); // aucune donnée admin chargée avant la validation

    await user.type(screen.getByLabelText('Vérifier'), '123456');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(await screen.findByText(/Code incorrect ou expiré/)).toBeTruthy();

    // Bon code : la session passe à aal2
    mfa.challengeAndVerify.mockResolvedValueOnce({ data: {}, error: null });
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal2', nextLevel: 'aal2' }));
    await user.clear(screen.getByLabelText('Vérifier'));
    await user.type(screen.getByLabelText('Vérifier'), '654321');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeTruthy();
    expect(mfa.challengeAndVerify).toHaveBeenLastCalledWith({ factorId: 'f1', code: '654321' });
  });

  it("propose d'activer la double authentification (QR code) quand elle n'existe pas encore", async () => {
    mfa.listFactors.mockResolvedValue(ok({ totp: [], all: [] }));
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal1', nextLevel: 'aal1' }));
    mfa.enroll.mockResolvedValue(ok({ id: 'f-new', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'JBSWY3DPEHPK3PXP' } }));
    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    renderConsole();

    expect(await screen.findByRole('heading', { name: 'Double authentification requise' })).toBeTruthy();
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
    expect(screen.getByAltText(/Code QR/)).toBeTruthy();

    // Après confirmation, la session est à deux facteurs
    mfa.listFactors.mockResolvedValue(ok({ totp: [{ id: 'f-new', status: 'verified' }], all: [] }));
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(ok({ currentLevel: 'aal2', nextLevel: 'aal2' }));
    await user.type(screen.getByLabelText('Confirmer'), '111222');
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeTruthy();
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f-new', code: '111222' });
  });
});

describe('Console admin : aperçu et annonce', () => {
  it('affiche les statistiques de la plateforme', async () => {
    renderConsole();
    expect(await screen.findByText('42')).toBeTruthy();        // comptes
    expect(screen.getByText('40 confirmés')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();                // demandes en attente
    expect(screen.getByText('5.0 Mo')).toBeTruthy();           // stockage des justificatifs
    expect(screen.getByText(/ne peut pas lire les données financières privées/)).toBeTruthy();
  });

  it("publie puis retire une annonce pour tous les utilisateurs", async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findByText('42');

    await user.type(screen.getByLabelText('Annonce pour tous les utilisateurs'), 'Maintenance dimanche 22h');
    await user.selectOptions(screen.getByLabelText('Niveau'), 'warning');
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    await waitFor(() => expect(calls('admin_set_announcement')[0].args).toEqual({ p_text: 'Maintenance dimanche 22h', p_level: 'warning' }));
    expect(await screen.findByText('Enregistré.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: "Retirer l'annonce" }));
    await waitFor(() => expect(calls('admin_set_announcement')[1].args).toEqual({ p_text: '', p_level: 'warning' }));
  });
});

describe('Console admin : comptes', () => {
  const openUsers = async (user: ReturnType<typeof userEvent.setup>) => {
    renderConsole();
    await screen.findByText('42');
    await user.click(screen.getByRole('tab', { name: /Comptes/ }));
    await screen.findAllByText('Chef Famille');
  };

  it("liste les comptes ; un membre est identifié par son numéro (l'adresse technique n'est jamais affichée)", async () => {
    const user = userEvent.setup();
    await openUsers(user);

    expect(screen.getAllByText('Junior Ndongo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+237 6 77 11 22 33').length).toBeGreaterThan(0);
    expect(screen.queryByText(/phone\.fintrack\.invalid/)).toBeNull();
    expect(screen.getAllByText('Suspendu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0);
  });

  it("protège le compte administrateur : aucune action possible dessus", async () => {
    const user = userEvent.setup();
    await openUsers(user);
    expect(screen.queryByRole('button', { name: /Suspendre Luc/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer Luc/ })).toBeNull();
    expect(screen.getAllByText('Protégé').length).toBeGreaterThan(0);
  });

  it('suspend, réactive et déconnecte un compte', async () => {
    const user = userEvent.setup();
    await openUsers(user);

    await user.click(screen.getAllByRole('button', { name: 'Suspendre Chef Famille' })[0]);
    await waitFor(() => expect(calls('admin_set_banned')[0].args).toEqual({ p_user: 'u-chef', p_banned: true }));

    await user.click(screen.getAllByRole('button', { name: 'Réactiver spam@x.com' })[0]);
    await waitFor(() => expect(calls('admin_set_banned')[1].args).toEqual({ p_user: 'u-bad', p_banned: false }));

    await user.click(screen.getAllByRole('button', { name: 'Déconnecter Chef Famille' })[0]);
    await waitFor(() => expect(calls('admin_sign_out_user')[0].args).toEqual({ p_user: 'u-chef' }));
  });

  it("n'efface un compte qu'après avoir tapé le mot de confirmation", async () => {
    const user = userEvent.setup();
    await openUsers(user);

    await user.click(screen.getAllByRole('button', { name: 'Supprimer Chef Famille' })[0]);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Supprimer définitivement' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(within(dialog).getByText(/3 budget\(s\), ses 40 transaction\(s\)/)).toBeTruthy();

    await user.type(within(dialog).getByLabelText('Tapez SUPPRIMER pour confirmer'), 'supprimer');
    expect(confirm.disabled).toBe(false);
    await user.click(confirm);

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('fintrack-api', { body: { action: 'admin_delete_user', userId: 'u-chef' } }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it("affiche l'erreur du serveur si la suppression est refusée", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'mfa_required' }), { status: 403 }) } });
    const user = userEvent.setup();
    await openUsers(user);

    await user.click(screen.getAllByRole('button', { name: 'Supprimer Chef Famille' })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Tapez SUPPRIMER pour confirmer'), 'SUPPRIMER');
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer définitivement' }));
    expect(await within(dialog).findByText(/double authentification/)).toBeTruthy();
  });

  it('filtre et recherche côté serveur', async () => {
    const user = userEvent.setup();
    await openUsers(user);

    await user.selectOptions(screen.getByLabelText('Filtrer'), 'banned');
    await waitFor(() => expect(calls('admin_list_users').some(c => c.args.p_filter === 'banned')).toBe(true));
    await waitFor(() => expect(screen.queryAllByText('Chef Famille')).toHaveLength(0));

    await user.selectOptions(screen.getByLabelText('Filtrer'), 'all');
    await user.type(screen.getByLabelText('Rechercher un nom, un e-mail ou un numéro'), 'junior');
    await waitFor(() => expect(calls('admin_list_users').some(c => c.args.p_search === 'junior')).toBe(true));
  });
});

describe('Console admin : journal', () => {
  it("décrit en clair les actions d'administration", async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findByText('42');
    await user.click(screen.getByRole('tab', { name: /Journal/ }));
    expect(await screen.findByText(/a suspendu le compte « spam@x\.com »/)).toBeTruthy();
    expect(screen.getByText(/a modifié l'annonce : « Maintenance »/)).toBeTruthy();
  });

  it("signale un chargement impossible (par exemple double authentification expirée)", async () => {
    db.rpcHandlers.admin_overview = () => ({ data: null, error: { message: 'mfa_required' } });
    renderConsole();
    expect(await screen.findByText(/Chargement impossible/)).toBeTruthy();
  });
});

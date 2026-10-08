// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();
const invoke = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => db.from(table),
    rpc: (name: string, args: Record<string, unknown>) => db.rpc(name, args),
    functions: { invoke },
    get storage() { return db.storage; },
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1', email: 'chef@famille.cm', user_metadata: {} } },
    loading: false, recovery: false, finishRecovery: () => undefined, signOut: async () => undefined,
  }),
}));

import { LanguageProvider } from '../../i18n';
import { RegionProvider } from '../../hooks/useRegion';
import { AccessProvider } from '../../hooks/useAccess';
import { TransactionsProvider } from '../../hooks/useTransactions';
import { FamilyProvider } from '../../hooks/useFamilyMembers';
import { FamilyAccessProvider } from '../../hooks/useFamilyAccess';
import { FamilyList } from './FamilyList';

const Harness: React.FC = () => (
  <LanguageProvider>
    <RegionProvider>
      <AccessProvider>
        <TransactionsProvider>
          <FamilyProvider>
            <FamilyAccessProvider>
              <FamilyList />
            </FamilyAccessProvider>
          </FamilyProvider>
        </TransactionsProvider>
      </AccessProvider>
    </RegionProvider>
  </LanguageProvider>
);

beforeEach(() => {
  Object.keys(db.tables).forEach(t => { db.tables[t] = []; });
  db.rpcHandlers = { platform_admin_status: () => ({ data: { is_admin: false }, error: null }) };
  db.rpcCalls = [];
  invoke.mockReset();
  localStorage.clear();
});
afterEach(() => cleanup());

const call = (name: string) => db.rpcCalls.filter(c => c.name === name);

describe('Administrateur de famille : valider une demande d\'accès', () => {
  const request = { id: 'req-1', full_name: 'Junior Ndongo', phone: '237677112233', requested_at: '2026-03-01T10:00:00Z' };

  it('retrouve la demande par son code, affiche nom et numéro, puis valide avec des droits précis', async () => {
    db.seed('family_members', { id: 'fm-1', name: 'Marie', role: 'Mère' });
    db.rpcHandlers.lookup_access_request = ({ p_code }) => ({ data: p_code === 'K7M2-QX9R' ? [request] : [], error: null });
    db.rpcHandlers.approve_access_request = () => ({ data: { id: 'req-1', status: 'active' }, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: /Valider une demande/ }));
    await user.type(screen.getByLabelText('Code de la demande'), 'K7M2-QX9R');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(await screen.findByText('Junior Ndongo')).toBeTruthy();
    expect(screen.getByText('+237 6 77 11 22 33')).toBeTruthy();
    expect(screen.getByText(/Vérifiez que le nom et le numéro correspondent/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Adolescent/ })); // saisit ses dépenses, ne voit pas la famille
    await user.click(screen.getByRole('button', { name: /Valider l'accès/ }));

    await waitFor(() => expect(call('approve_access_request')).toHaveLength(1));
    expect(call('approve_access_request')[0].args).toEqual({
      p_id: 'req-1', p_family_member_id: null, p_new_member_name: 'Junior Ndongo', p_add_expenses: true, p_view_family: false,
    });
    expect(await screen.findByText(/L'accès de Junior Ndongo est activé/)).toBeTruthy();
  });

  it('permet de rattacher la demande à un membre existant et de choisir « Conjoint »', async () => {
    db.seed('family_members', { id: 'fm-1', name: 'Junior Ndongo', role: 'Fils' });
    db.rpcHandlers.lookup_access_request = () => ({ data: [request], error: null });
    db.rpcHandlers.approve_access_request = () => ({ data: {}, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: /Valider une demande/ }));
    await user.type(screen.getByLabelText('Code de la demande'), 'K7M2QX9R');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    await screen.findByText('Junior Ndongo', { selector: 'p' });

    // Le membre du même nom est présélectionné
    expect((screen.getByLabelText('Rattacher à') as HTMLSelectElement).value).toBe('fm-1');
    await user.click(screen.getByRole('button', { name: /Conjoint/ }));
    await user.click(screen.getByRole('button', { name: /Valider l'accès/ }));

    await waitFor(() => expect(call('approve_access_request')[0].args).toMatchObject({ p_family_member_id: 'fm-1', p_add_expenses: true, p_view_family: true }));
  });

  it('refuse une demande', async () => {
    db.rpcHandlers.lookup_access_request = () => ({ data: [request], error: null });
    db.rpcHandlers.reject_access_request = () => ({ data: null, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: /Valider une demande/ }));
    await user.type(screen.getByLabelText('Code de la demande'), 'K7M2QX9R');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    await user.click(await screen.findByRole('button', { name: 'Refuser' }));

    await waitFor(() => expect(call('reject_access_request')[0].args).toEqual({ p_id: 'req-1' }));
    expect(await screen.findByText('La demande a été refusée.')).toBeTruthy();
  });

  it('signale un code inconnu et la limite de tentatives', async () => {
    db.rpcHandlers.lookup_access_request = () => ({ data: [], error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: /Valider une demande/ }));
    await user.type(screen.getByLabelText('Code de la demande'), 'AAAAAAAA');
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(await screen.findByText(/Aucune demande en attente ne correspond/)).toBeTruthy();

    db.rpcHandlers.lookup_access_request = () => ({ data: null, error: { message: 'too_many_attempts' } });
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(await screen.findByText(/Trop de recherches/)).toBeTruthy();
  });

  it("le bouton de recherche reste inactif tant que le code est incomplet", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(await screen.findByRole('button', { name: /Valider une demande/ }));
    await user.type(screen.getByLabelText('Code de la demande'), 'K7M2');
    expect((screen.getByRole('button', { name: 'Rechercher' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Administrateur de famille : gérer un accès existant', () => {
  const seedAccess = (over: Record<string, unknown> = {}) => {
    db.seed('family_members', { id: 'fm-1', name: 'Junior', role: 'Fils', monthly_allowance: 20000 });
    return db.seed('family_access', {
      id: 'acc-1', owner_id: 'u1', member_user_id: 'm1', family_member_id: 'fm-1', full_name: 'Junior Ndongo',
      phone: '237677112233', status: 'active', perm_add_expenses: true, perm_view_family: false, ...over,
    });
  };

  it('affiche le statut sur la fiche du membre et permet de modifier les droits', async () => {
    seedAccess();
    db.rpcHandlers.update_family_access = () => ({ data: {}, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Gérer Junior' }));
    expect(await screen.findByText('+237 6 77 11 22 33')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true); // rien n'a changé

    await user.click(screen.getByRole('switch', { name: 'Voir le budget de toute la famille' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(call('update_family_access')[0].args).toEqual({ p_id: 'acc-1', p_add_expenses: true, p_view_family: true, p_status: 'active' }));
    expect(await screen.findByText('Modifications enregistrées.')).toBeTruthy();
  });

  it('suspend puis réactive un accès', async () => {
    seedAccess();
    db.rpcHandlers.update_family_access = () => ({ data: {}, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Gérer Junior' }));
    await user.click(screen.getByRole('button', { name: /Suspendre/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(call('update_family_access')[0].args).toMatchObject({ p_status: 'suspended' }));
  });

  it('génère un mot de passe provisoire affiché une seule fois, avec message WhatsApp prêt', async () => {
    seedAccess();
    invoke.mockResolvedValue({ data: { tempPassword: 'Zk7mPq9RtX27' }, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Gérer Junior' }));
    await user.click(screen.getByRole('button', { name: /Réinitialiser le mot de passe/ }));
    const dialogButtons = await screen.findAllByRole('button', { name: 'Réinitialiser le mot de passe' });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    expect(await screen.findByTestId('temp-password')).toBeTruthy();
    expect(screen.getByTestId('temp-password').textContent).toBe('Zk7mPq9RtX27');
    expect(invoke).toHaveBeenCalledWith('fintrack-api', { body: { action: 'member_reset_password', accessId: 'acc-1' } });
    const wa = screen.getByRole('link', { name: /WhatsApp/ }) as HTMLAnchorElement;
    expect(decodeURIComponent(wa.href)).toContain('Zk7mPq9RtX27');
    expect(decodeURIComponent(wa.href)).toContain('+237 6 77 11 22 33');
  });

  it("retire l'accès après confirmation", async () => {
    seedAccess();
    db.rpcHandlers.revoke_family_access = () => ({ data: null, error: null });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Gérer Junior' }));
    await user.click(screen.getByRole('button', { name: /Retirer l'accès/ }));
    expect(call('revoke_family_access')).toHaveLength(0); // pas avant confirmation
    const confirm = await screen.findAllByRole('button', { name: "Retirer l'accès" });
    await user.click(confirm[confirm.length - 1]);

    await waitFor(() => expect(call('revoke_family_access')[0].args).toEqual({ p_id: 'acc-1' }));
  });

  it('un membre sans accès affiche une invitation à créer son accès', async () => {
    db.seed('family_members', { id: 'fm-1', name: 'Papi', role: 'Père' });
    render(<Harness />);
    expect(await screen.findByText('Pas d\'accès à l\'application')).toBeTruthy();
  });
});

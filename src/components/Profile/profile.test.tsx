// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeDb } from '../../test/fakeSupabase';

const db = new FakeDb();
const updateUser = vi.hoisted(() => vi.fn(async () => ({ data: {}, error: null })));
const meta = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => db.from(table),
    rpc: (name: string, args: Record<string, unknown>) => db.rpc(name, args),
    auth: { updateUser },
  },
  isSupabaseConfigured: true,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1', email: 'luc@exemple.cm', user_metadata: meta.value } },
    loading: false, recovery: false, finishRecovery: () => undefined, signOut: async () => undefined,
  }),
}));

import { LanguageProvider } from '../../i18n';
import { AccessProvider } from '../../hooks/useAccess';
import { ProfileProvider, useProfile } from '../../hooks/useProfile';
import { ProfilePrompt } from '../Layout/ProfilePrompt';
import { UserMenu } from '../Layout/UserMenu';
import { Avatar } from '../Brand/Avatar';
import { PoweredBy } from '../Layout/PoweredBy';

const Probe: React.FC = () => {
  const { displayName, firstName } = useProfile();
  return <p data-testid="probe">{displayName}|{firstName}</p>;
};

const Harness: React.FC = () => (
  <LanguageProvider>
    <AccessProvider>
      <ProfileProvider>
        <ProfilePrompt userId="u1" />
        <UserMenu onNavigate={() => undefined} />
        <Probe />
      </ProfileProvider>
    </AccessProvider>
  </LanguageProvider>
);

beforeEach(() => {
  db.tables.user_profiles = [];
  db.rpcHandlers = { platform_admin_status: () => ({ data: { is_admin: false }, error: null }) };
  updateUser.mockClear();
  meta.value = {};
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('profil utilisateur', () => {
  it('sans nom : affiche le début de l\'e-mail et invite à compléter le profil', async () => {
    render(<Harness />);
    expect(screen.getByTestId('probe').textContent).toBe('luc|luc');
    expect(screen.getByText(/Indiquez votre nom et choisissez votre avatar/)).toBeTruthy();
  });

  it('avec un nom complet : le nom s\'affiche et l\'invitation demande seulement le sexe et l\'âge', async () => {
    meta.value = { full_name: 'Luc Boten' };
    render(<Harness />);
    expect(screen.getByTestId('probe').textContent).toBe('Luc Boten|Luc');
    expect(screen.getByText(/sexe et tranche d'âge/)).toBeTruthy();
  });

  it('profil complet : plus aucune invitation', async () => {
    meta.value = { full_name: 'Luc Boten', gender: 'm', age_group: 'adult', skin_tone: 3 };
    render(<Harness />);
    expect(screen.queryByText(/Compléter/)).toBeNull();
  });

  it('compléter le profil enregistre le nom, le sexe, la tranche d\'âge et le teint', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Compléter' }));
    const input = await screen.findByLabelText('Nom complet');
    await user.type(input, 'Marie Nkoa');
    await user.click(screen.getByRole('button', { name: 'Féminin' }));
    await user.click(screen.getByRole('button', { name: /Adulte/ }));
    await user.click(screen.getByRole('button', { name: 'Teint 2' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    expect(updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ full_name: 'Marie Nkoa', gender: 'f', age_group: 'adult', skin_tone: 1 }),
    });
  });

  it('un nom trop court est refusé (bouton désactivé)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Compléter' }));
    await user.type(await screen.findByLabelText('Nom complet'), 'M');
    expect((screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('le menu utilisateur montre le nom, l\'e-mail et le rôle', async () => {
    meta.value = { full_name: 'Luc Boten' };
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Luc Boten' }));
    expect(await screen.findByText('luc@exemple.cm')).toBeTruthy();
    expect(screen.getByText('Propriétaire du compte')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /Modifier mon profil/ })).toBeTruthy();
  });
});

describe('avatar', () => {
  it('initiales quand on ne sait rien, personnage dessiné quand le sexe ou l\'âge est connu, photo en priorité', () => {
    const { container, rerender } = render(<Avatar name="Luc Boten" />);
    expect(screen.getByText('LB')).toBeTruthy();
    rerender(<Avatar name="Luc Boten" gender="f" ageGroup="child" skin={1} />);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<Avatar name="Luc Boten" gender="m" ageGroup="senior" photo="data:image/jpeg;base64,AAAA" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,AAAA');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('tous les sexes et toutes les tranches d\'âge se dessinent', () => {
    for (const gender of ['f', 'm', 'x'] as const) {
      for (const age of ['child', 'teen', 'adult', 'senior'] as const) {
        const { container, unmount } = render(<Avatar name="Test" gender={gender} ageGroup={age} />);
        expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
        unmount();
      }
    }
  });
});

describe('signature', () => {
  it('Powered by JoYed\'S : lien bleu vers le site, ouvert dans un nouvel onglet en toute sécurité', () => {
    render(<PoweredBy />);
    const link = screen.getByRole('link', { name: "JoYed'S" });
    expect(link.getAttribute('href')).toBe('https://www.joyeds.com/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.className).toContain('text-blue-500');
  });
});

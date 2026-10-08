// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  updateUser: vi.fn(),
}));

const invoke = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: { auth, functions: { invoke } },
  isSupabaseConfigured: true,
}));

import { LanguageProvider } from '../../i18n';
import { AuthForm, ResetPasswordForm } from './AuthForm';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

beforeEach(() => {
  Object.values(auth).forEach(fn => fn.mockReset());
  invoke.mockReset();
  localStorage.clear();
});
afterEach(() => cleanup());

describe('Connexion et récupération de compte', () => {
  it("envoie le lien de réinitialisation avec la bonne adresse de retour", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    wrap(<AuthForm />);

    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    expect(screen.getByRole('heading', { name: 'Réinitialiser le mot de passe' })).toBeTruthy();
    await user.type(screen.getByLabelText('Adresse Email'), 'moi@test.com');
    await user.click(screen.getByRole('button', { name: /Envoyer le lien/ }));

    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('moi@test.com', { redirectTo: window.location.origin }));
    expect(await screen.findByText(/Si un compte existe pour moi@test\.com/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(screen.getByRole('button', { name: 'Créer un Compte' })).toBeTruthy();
  });

  it("valide le mot de passe à l'inscription puis demande de confirmer l'e-mail", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: { id: 'x' } }, error: null });
    auth.resend.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    wrap(<AuthForm />);

    await user.click(screen.getByRole('button', { name: 'Créer un Compte' }));
    await user.type(screen.getByLabelText('Adresse Email'), 'nouveau@test.com');
    await user.type(screen.getByLabelText('Mot de Passe'), 'court');
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'court');
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));
    expect(await screen.findByText('Au moins 8 caractères.', { selector: '[role="alert"] span' })).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Mot de Passe'));
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.clear(screen.getByLabelText('Confirmer le Mot de Passe'));
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'Autre-Mot-De-Passe');
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));
    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeTruthy();

    await user.clear(screen.getByLabelText('Confirmer le Mot de Passe'));
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'MotDePasse-OK-1');
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));

    expect(await screen.findByRole('heading', { name: 'Vérifiez votre e-mail' })).toBeTruthy();
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'nouveau@test.com', password: 'MotDePasse-OK-1', options: { emailRedirectTo: window.location.origin },
    });
    expect(screen.getByText(/lien de confirmation à nouveau@test\.com/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: "Renvoyer l'e-mail" }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'nouveau@test.com', options: { emailRedirectTo: window.location.origin } }));
    expect(await screen.findByText('E-mail renvoyé.')).toBeTruthy();
  });

  it("explique clairement qu'une adresse n'est pas confirmée", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('Email not confirmed') });
    const user = userEvent.setup();
    const { container } = wrap(<AuthForm />);

    await user.type(screen.getByLabelText('Adresse Email'), 'moi@test.com');
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.click(container.querySelector('button[type="submit"]') as HTMLElement);

    expect(await screen.findByText(/Adresse e-mail non confirmée/)).toBeTruthy();
  });

  it('permet de choisir un nouveau mot de passe depuis le lien reçu', async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    const onDone = vi.fn();
    const user = userEvent.setup();
    wrap(<ResetPasswordForm onDone={onDone} />);

    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'court');
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'court');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));
    expect(await screen.findByText('Au moins 8 caractères.', { selector: '[role="alert"] span' })).toBeTruthy();

    await user.clear(screen.getByLabelText('Nouveau mot de passe'));
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'Nouveau-MdP-2026');
    await user.clear(screen.getByLabelText('Confirmer le nouveau mot de passe'));
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'Nouveau-MdP-2027');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));
    expect(await screen.findByText('Les mots de passe ne correspondent pas')).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirmer le nouveau mot de passe'));
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'Nouveau-MdP-2026');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));

    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: 'Nouveau-MdP-2026', data: { must_change_password: false } }));
    expect(await screen.findByText(/Mot de passe modifié/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onDone).toHaveBeenCalled();
  });
});

describe('Connexion et inscription par téléphone', () => {
  const phoneEmail = 'p237677112233@phone.fintrack.invalid';

  it("connecte avec le numéro (saisi de n'importe quelle façon) et le mot de passe", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    const { container } = wrap(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Par téléphone/ }));
    await user.type(screen.getByLabelText('Numéro de téléphone'), '6 77 11 22 33');
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.click(container.querySelector('button[type="submit"]') as HTMLElement);

    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: phoneEmail, password: 'MotDePasse-OK-1' }));
  });

  it('refuse un numéro invalide sans appeler le serveur, et explique un mauvais mot de passe', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') });
    const user = userEvent.setup();
    const { container } = wrap(<AuthForm />);

    await user.click(screen.getByRole('button', { name: /Par téléphone/ }));
    await user.type(screen.getByLabelText('Numéro de téléphone'), '12345');
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.click(container.querySelector('button[type="submit"]') as HTMLElement);
    expect(await screen.findByText(/Numéro de téléphone invalide/, { selector: '[role="alert"] span' })).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Numéro de téléphone'));
    await user.type(screen.getByLabelText('Numéro de téléphone'), '677112233');
    await user.click(container.querySelector('button[type="submit"]') as HTMLElement);
    expect(await screen.findByText('Numéro ou mot de passe incorrect.')).toBeTruthy();
  });

  it("« mot de passe oublié » explique de contacter l'administrateur de la famille (pas d'e-mail)", async () => {
    const user = userEvent.setup();
    wrap(<AuthForm />);
    await user.click(screen.getByRole('button', { name: /Par téléphone/ }));
    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    expect(screen.getByText(/Contactez l'administrateur de votre famille/)).toBeTruthy();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("crée l'accès d'un membre (nom + téléphone + mot de passe), puis le connecte", async () => {
    invoke.mockResolvedValue({ data: { code: 'K7M2QX9R', phone: '237677112233' }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    wrap(<AuthForm />);

    await user.click(screen.getByRole('button', { name: 'Créer un Compte' }));
    await user.click(screen.getByRole('button', { name: /Rejoindre ma famille/ }));
    expect(screen.getByText(/Vous recevrez un code à envoyer à l'administrateur de votre famille/)).toBeTruthy();

    await user.type(screen.getByLabelText('Nom Complet'), '  Junior Ndongo ');
    await user.type(screen.getByLabelText('Numéro de téléphone'), '+237 677 11 22 33');
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'MotDePasse-OK-1');
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('fintrack-api', {
      body: { action: 'member_register', fullName: 'Junior Ndongo', phone: '237677112233', password: 'MotDePasse-OK-1' },
    }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: phoneEmail, password: 'MotDePasse-OK-1' }));
    expect(auth.signUp).not.toHaveBeenCalled(); // jamais d'inscription par e-mail pour un membre
  });

  it("traduit les refus du serveur (numéro déjà inscrit, trop de tentatives)", async () => {
    const user = userEvent.setup();
    wrap(<AuthForm />);
    await user.click(screen.getByRole('button', { name: 'Créer un Compte' }));
    await user.click(screen.getByRole('button', { name: /Rejoindre ma famille/ }));
    await user.type(screen.getByLabelText('Nom Complet'), 'Junior Ndongo');
    await user.type(screen.getByLabelText('Numéro de téléphone'), '677112233');
    await user.type(screen.getByLabelText('Mot de Passe'), 'MotDePasse-OK-1');
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'MotDePasse-OK-1');

    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'phone_exists' }), { status: 409 }) } });
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));
    expect(await screen.findByText(/Ce numéro a déjà un compte/)).toBeTruthy();

    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'too_many_requests' }), { status: 429 }) } });
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));
    expect(await screen.findByText(/Trop de tentatives/)).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("vérifie le mot de passe avant tout envoi au serveur", async () => {
    const user = userEvent.setup();
    wrap(<AuthForm />);
    await user.click(screen.getByRole('button', { name: 'Créer un Compte' }));
    await user.click(screen.getByRole('button', { name: /Rejoindre ma famille/ }));
    await user.type(screen.getByLabelText('Nom Complet'), 'Junior Ndongo');
    await user.type(screen.getByLabelText('Numéro de téléphone'), '677112233');
    await user.type(screen.getByLabelText('Mot de Passe'), 'court');
    await user.type(screen.getByLabelText('Confirmer le Mot de Passe'), 'court');
    await user.click(screen.getByRole('button', { name: /S'inscrire/ }));
    expect(await screen.findByText('Au moins 8 caractères.', { selector: '[role="alert"] span' })).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });
});

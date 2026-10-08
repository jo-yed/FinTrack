# FinTrack

Gestion financière personnelle, professionnelle et familiale (React + TypeScript + Vite + Tailwind + Supabase), installable sur téléphone.

## Fonctionnalités

| Domaine | Description |
| --- | --- |
| **Tableau de bord** | Revenus, dépenses, épargne, graphiques, alertes de plafond, et les deux familles de budgets côte à côte. |
| **Transactions** | Revenus/dépenses, catégories personnalisables, récurrences (hebdo/mensuel/annuel), export Excel. |
| **Comptes** | Solde calculé automatiquement (solde initial + transactions), devises séparées. |
| **Budgets Perso & Pro** | Budgets d'activités avec **catégories créées par vous**, fonds reçus, dépenses justifiées (bénéficiaire, n° de pièce, mode de paiement), reste en temps réel, journal de caisse, export Excel et impression PDF. |
| **Justificatifs** | Photo ou PDF joint à chaque dépense (stockage privé), consultation, export de tous les justificatifs en archive ZIP. |
| **Validation des dépenses** | Option par budget : les dépenses d'un collaborateur restent « en attente » jusqu'à validation ou rejet motivé. Seules les dépenses validées comptent. |
| **Partage** | Invitation par e-mail d'un comptable ou d'un associé, en lecture seule ou en saisie. Historique complet, non falsifiable. |
| **Rapports de période** | Prévu / réalisé sur le mois, trimestre, année ou période libre, avec comparaison à la période précédente. |
| **Budget Famille** | Membres, allocations mensuelles et dépenses par membre. |
| **Accès famille par téléphone** | Un membre de la famille se connecte avec **son nom et son numéro de téléphone** (sans e-mail). Sa demande doit être **validée par l'administrateur de sa famille** (code à lui transmettre par WhatsApp/SMS), qui choisit ses droits précis. |
| **Super administrateur** | Console réservée (double authentification obligatoire) : statistiques, comptes, suspension / déconnexion / suppression, annonces à tous les utilisateurs, journal d'audit. |
| **Plafonds mensuels · Objectifs · Coffre-fort** | Limites par catégorie, épargne, coffre chiffré (AES-256-GCM, clé dérivée PBKDF2-SHA256). |
| **Application mobile** | Installable (PWA), ouverture hors ligne, saisie de dépenses sans connexion (envoi automatique au retour du réseau). |

## Accès famille par téléphone

1. Le membre choisit **Créer un compte → Rejoindre ma famille**, saisit nom, numéro (ex. `6 77 11 22 33`) et mot de passe. Il reçoit un **code de demande** (ex. `K7M2-QX9R`) et son compte reste **sans aucun accès**.
2. Il envoie ce code à l'administrateur de sa famille (bouton WhatsApp prêt à l'emploi).
3. L'administrateur ouvre **Budget Famille → Valider une demande**, saisit le code, vérifie le nom et le numéro, rattache la personne à un membre de la famille et choisit ses droits :
   - voir ses propres dépenses (toujours) ;
   - saisir ses dépenses ;
   - voir le budget de toute la famille (jamais les revenus personnels de l'administrateur).
4. L'administrateur peut ensuite modifier les droits, suspendre, retirer l'accès ou générer un **mot de passe provisoire** (à changer à la première connexion).

Techniquement, le numéro est converti en une adresse de connexion technique sur un domaine réservé (`@phone.fintrack.invalid`) : personne ne peut la recevoir ni la détourner.

## Super administrateur

Adresse autorisée : `luc_boten@joyeds.com` (table `platform_admins`). Il faut créer le compte normalement, **confirmer l'e-mail**, puis activer la **double authentification** (application d'authentification) à l'ouverture de la page *Administration*. Sans ces deux conditions, les fonctions d'administration refusent tout accès (vérifié par la base de données, pas seulement par l'interface).

Par conception, l'administrateur gère les comptes et les accès mais **ne lit pas** les données financières privées.

## Démarrage

```bash
npm install
cp .env.example .env      # puis renseignez l'URL et la clé publique de votre projet Supabase
npm run dev
```

Scripts : `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`.

## Base de données et fonction serveur (Supabase)

```bash
supabase link --project-ref <votre-ref>
supabase db push                                   # applique les migrations dans l'ordre
supabase functions deploy fintrack-api --no-verify-jwt --use-api
```

- `supabase/migrations/` : schéma, sécurité RLS, budgets, justificatifs, accès famille, administration. Idempotentes, elles conservent les données.
- `supabase/functions/fintrack-api/` : inscription par téléphone, réinitialisation de mot de passe d'un membre, suppression d'un compte (fichiers compris). La fonction vérifie elle-même l'identité (`--no-verify-jwt` car l'inscription est publique) et limite les appels par adresse IP / numéro / utilisateur.
- `supabase/config.toml` : réglages d'authentification (adresse du site, confirmation d'e-mail, double authentification, mot de passe de 8 caractères minimum).

> ⚠️ `supabase config push` **applique** la configuration : ne le lancez jamais sans avoir lu la différence affichée, et répondez explicitement `n` pour annuler.

## Déploiement (Vercel)

Variables d'environnement du projet (Production, Preview, Development) : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé **publique**). Ne mettez **jamais** la clé `service_role`, la clé secrète ou le mot de passe de la base dans une variable `VITE_…` : elles seraient publiées dans le code du site.

`vercel.json` fournit les réécritures et les en-têtes de sécurité (CSP stricte, HSTS, anti-clickjacking, politique de permissions).

## Sécurité en bref

- **RLS** sur toutes les tables ; droits calculés par la base (propriétaire / saisie / lecture seule / membre de famille) et testés (plus de 175 contrôles SQL).
- **Double authentification** obligatoire pour l'administration, proposée à tous (Réglages).
- Déconnexion automatique après 30 minutes d'inactivité.
- Justificatifs dans un stockage **privé**, liens signés expirant au bout d'une heure.
- Anti-abus : limitation des inscriptions, des recherches de code (20/heure) et des réinitialisations.
- Un éditeur ne peut pas s'auto-approuver une dépense ; un membre ne peut pas valider une demande ni élargir ses droits.
- Le mot de passe maître du coffre n'est jamais stocké : en cas d'oubli, le contenu est irrécupérable.

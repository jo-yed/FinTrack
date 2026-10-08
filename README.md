# FinTrack

Gestion financière personnelle, professionnelle et familiale (React + TypeScript + Vite + Tailwind + Supabase).

## Fonctionnalités

| Domaine | Description |
|---|---|
| **Tableau de bord** | Revenus, dépenses, épargne, graphiques, alertes de plafond, et les deux familles de budgets côte à côte. |
| **Transactions** | Revenus/dépenses, catégories personnalisables, récurrences (hebdo/mensuel/annuel), export Excel. |
| **Comptes** | Solde calculé automatiquement (solde initial + transactions), devises séparées. |
| **Budgets Perso & Pro** | Budgets d'activités avec **catégories créées par vous**, fonds reçus, dépenses justifiées (bénéficiaire, n° de pièce, mode de paiement), reste en temps réel, journal de caisse, export Excel et impression PDF. |
| **Budget Famille** | Membres, allocations mensuelles et dépenses par membre (indépendant des budgets Perso & Pro). |
| **Plafonds mensuels** | Limite de dépenses par catégorie et par mois. |
| **Objectifs** | Épargne avec échéance et contributions. |
| **Coffre-fort** | Données chiffrées dans le navigateur (AES-256-GCM, clé dérivée PBKDF2-SHA256) ; verrouillage automatique. |

## Démarrage

```bash
npm install
cp .env.example .env      # puis renseignez l'URL et la clé anon de votre projet Supabase
npm run dev
```

Scripts : `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`.

## Base de données (Supabase)

Appliquez **dans l'ordre** les fichiers de [supabase/migrations](supabase/migrations) (SQL Editor de Supabase, ou `supabase db push`).
La dernière migration (`20261008090000_activity_budgets_vault_integrity.sql`) est idempotente et conserve les données existantes :

- étend les anciens « projets » en budgets d'activités (types Personnel / Professionnel), ajoute les catégories (`project_categories`) et les champs comptables des écritures ;
- ajoute `vault_settings` pour le coffre chiffré ;
- supprime les doublons de transactions récurrentes et ajoute l'index unique qui les empêche ;
- ajoute la clé étrangère `transactions.family_member_id` et renforce les règles RLS.

## Déploiement

Le build (`npm run build`) produit le dossier `dist/`. Les réécritures nécessaires à l'application monopage sont fournies :
`vercel.json` (Vercel) et `public/_redirects` (Netlify). Définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement de l'hébergeur.

## Notes de sécurité

- Toutes les tables sont protégées par RLS (chaque utilisateur ne voit que ses données).
- Le mot de passe maître du coffre n'est **jamais** stocké ni transmis : en cas d'oubli, le contenu est irrécupérable (une réinitialisation efface le coffre).
- Le titre d'un élément du coffre n'est pas chiffré : n'y mettez pas d'information secrète.

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Affiché quand les variables d'environnement Supabase sont absentes (au lieu d'un écran blanc). */
export const ConfigError: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
    <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-amber-200 dark:border-amber-800 p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuration manquante</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        FinTrack ne trouve pas les identifiants de votre base de données Supabase.
        Créez un fichier <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">.env</code> à la racine du projet
        (modèle : <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">.env.example</code>) :
      </p>
      <pre className="text-xs bg-gray-900 text-emerald-300 rounded-xl p-4 overflow-x-auto mb-4">
{`VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique`}
      </pre>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Puis redémarrez le serveur (<code>npm run dev</code>). En production (Vercel/Netlify), ajoutez ces deux variables
        dans les réglages du projet et redéployez.
      </p>
    </div>
  </div>
);

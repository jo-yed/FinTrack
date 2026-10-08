import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AuthForm, ResetPasswordForm } from './components/Auth/AuthForm';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { CommandPalette } from './components/Layout/CommandPalette';
import { ErrorBoundary } from './components/Layout/ErrorBoundary';
import { Logo } from './components/Brand/Logo';
import { useAuth } from './hooks/useAuth';
import { useRoute } from './hooks/useRoute';
import { useLanguage } from './i18n';
import { AccessProvider, useAccess } from './hooks/useAccess';
import { FamilyAccessProvider } from './hooks/useFamilyAccess';
import { allowedPages as allowedPagesFor, resolvePage } from './lib/navigation';
import { AnnouncementBanner } from './components/Layout/AnnouncementBanner';
import { PendingAccess } from './components/Member/PendingAccess';
import { TransactionsProvider } from './hooks/useTransactions';
import { AccountsProvider } from './hooks/useAccounts';
import { FamilyProvider } from './hooks/useFamilyMembers';
import { CategoriesProvider } from './hooks/useCategories';
import { ActivityBudgetsProvider } from './hooks/useActivityBudgets';
import { VaultProvider } from './hooks/useVault';
import { Loader2 } from 'lucide-react';

// Chargement différé : chaque page devient un fichier séparé (démarrage plus rapide).
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const TransactionList = lazy(() => import('./components/Transactions/TransactionList').then(m => ({ default: m.TransactionList })));
const BudgetList = lazy(() => import('./components/Budgets/BudgetList').then(m => ({ default: m.BudgetList })));
const Reports = lazy(() => import('./components/Reports/Reports').then(m => ({ default: m.Reports })));
const VaultList = lazy(() => import('./components/Vault/VaultList').then(m => ({ default: m.VaultList })));
const GoalList = lazy(() => import('./components/Goals/GoalList').then(m => ({ default: m.GoalList })));
const FamilyList = lazy(() => import('./components/Family/FamilyList').then(m => ({ default: m.FamilyList })));
const AccountList = lazy(() => import('./components/Accounts/AccountList').then(m => ({ default: m.AccountList })));
const ActivityBudgets = lazy(() => import('./components/Activities/ActivityBudgets').then(m => ({ default: m.ActivityBudgets })));
const MySpace = lazy(() => import('./components/Member/MySpace').then(m => ({ default: m.MySpace })));
const AdminConsole = lazy(() => import('./components/Admin/AdminConsole').then(m => ({ default: m.AdminConsole })));
const Settings = lazy(() => import('./components/Settings/Settings').then(m => ({ default: m.Settings })));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-gray-400 dark:text-gray-500">
    <Loader2 className="w-5 h-5 animate-spin" />
  </div>
);

const Shell: React.FC = () => {
  const { route, navigate } = useRoute();
  const { isMember, canViewFamily, isPlatformAdmin } = useAccess();
  const profile = { isMember, canViewFamily, isPlatformAdmin };
  const [cmdOpen, setCmdOpen] = useState(false);
  const [quickAddTx, setQuickAddTx] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
        return;
      }
      if (e.key === 'n' && !isMember && !e.metaKey && !e.ctrlKey && !e.altKey && !cmdOpen) {
        const target = e.target as HTMLElement;
        const typing =
          target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        if (!typing) {
          e.preventDefault();
          navigate('transactions');
          setQuickAddTx(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, navigate, isMember]);

  // Une page non autorisée pour ce profil est remplacée par son accueil (la base applique les mêmes limites)
  const page = resolvePage(route.page, profile);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar currentPage={page} onPageChange={p => navigate(p)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenCommand={() => setCmdOpen(true)} />
        <AnnouncementBanner />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden print:p-0">
          <ErrorBoundary key={page}>
            <Suspense fallback={<PageFallback />}>
              {page === 'myspace' && <MySpace onNavigate={navigate} />}
              {page === 'admin' && <AdminConsole />}
              {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
              {page === 'transactions' && (
                <TransactionList quickAddSignal={quickAddTx} onQuickAddConsumed={() => setQuickAddTx(false)} />
              )}
              {page === 'budgets' && <BudgetList />}
              {page === 'reports' && <Reports />}
              {page === 'vault' && <VaultList />}
              {page === 'family' && <FamilyList />}
              {page === 'accounts' && <AccountList />}
              {page === 'activities' && <ActivityBudgets budgetId={route.param} onNavigate={navigate} />}
              {page === 'goals' && <GoalList />}
              {page === 'settings' && <Settings />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={p => navigate(p)}
        allowed={allowedPagesFor(profile)}
        onQuickAdd={() => {
          navigate('transactions');
          setQuickAddTx(true);
        }}
      />
    </div>
  );
};

function App() {
  const { session, loading, recovery, finishRecovery } = useAuth();
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 gap-3">
        <Logo size={72} />
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Lien « mot de passe oublié » : l'utilisateur choisit d'abord son nouveau mot de passe
  if (session && recovery) {
    return <ResetPasswordForm onDone={finishRecovery} />;
  }

  if (!session) {
    return <AuthForm />;
  }

  // key = changement d'utilisateur => tous les états de données repartent de zéro.
  return (
    <AccessProvider key={session.user.id}>
      <AuthedApp />
    </AccessProvider>
  );
}

/** Contenu réservé aux utilisateurs connectés : choisit l'écran selon le profil et l'état de l'accès. */
const AuthedApp: React.FC = () => {
  const { t } = useLanguage();
  const { loading, isMember, accessState, mustChangePassword } = useAccess();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 gap-3">
        <Logo size={72} />
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Mot de passe provisoire (réinitialisé par l'administrateur de la famille) : à changer avant tout
  if (mustChangePassword) return <ResetPasswordForm onDone={() => undefined} forced />;

  // Compte membre : aucun accès tant que l'administrateur de famille n'a pas validé la demande
  if (isMember && accessState !== 'active') return <PendingAccess />;

  return (
    <TransactionsProvider>
      <AccountsProvider>
        <FamilyProvider>
          <FamilyAccessProvider>
            <CategoriesProvider>
              <ActivityBudgetsProvider>
                <VaultProvider>
                  <Shell />
                </VaultProvider>
              </ActivityBudgetsProvider>
            </CategoriesProvider>
          </FamilyAccessProvider>
        </FamilyProvider>
      </AccountsProvider>
    </TransactionsProvider>
  );
};

export default App;

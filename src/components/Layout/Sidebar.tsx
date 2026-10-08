import React, { useState } from 'react';
import {
  LayoutDashboard, CreditCard, Wallet, Target, Shield, Activity, Settings as SettingsIcon,
  LogOut, Menu, X, Users, Landmark, Briefcase,
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import type { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
}

interface MenuItem {
  icon: React.FC<{ className?: string }>;
  label: string;
  id: PageId;
  /** Pastille de couleur : met en évidence les deux familles de budgets. */
  accent?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: { title: string; items: MenuItem[] }[] = [
    {
      title: t('nav.finances'),
      items: [
        { icon: LayoutDashboard, label: t('common.dashboard'), id: 'dashboard' },
        { icon: CreditCard, label: t('common.transactions'), id: 'transactions' },
        { icon: Landmark, label: t('accounts.title'), id: 'accounts' },
        { icon: Activity, label: t('reports.title'), id: 'reports' },
        { icon: Target, label: t('common.goals'), id: 'goals' },
      ],
    },
    {
      title: t('nav.budgets'),
      items: [
        { icon: Briefcase, label: t('activities.title'), id: 'activities', accent: 'bg-violet-500' },
        { icon: Users, label: t('family.title'), id: 'family', accent: 'bg-rose-500' },
        { icon: Wallet, label: t('budgets.title'), id: 'budgets', accent: 'bg-amber-500' },
      ],
    },
    {
      title: t('nav.tools'),
      items: [
        { icon: Shield, label: t('common.vault'), id: 'vault' },
        { icon: SettingsIcon, label: t('common.settings'), id: 'settings' },
      ],
    },
  ];

  const handlePageChange = (page: PageId) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 print:hidden"
      >
        {mobileOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm animate-fade-in print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen z-40 w-72 flex-shrink-0 print:hidden
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">FinTrack</span>
              <div className="text-xs text-gray-400 dark:text-gray-500">Gestion Financière</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-5">
          {groups.map(group => (
            <div key={group.title}>
              <p className="px-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handlePageChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                        <span className="truncate">{item.label}</span>
                        {item.accent && !isActive && (
                          <span className={`ml-auto w-2 h-2 rounded-full ${item.accent}`} />
                        )}
                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t('common.logout')}
          </button>
        </div>
      </aside>
    </>
  );
};

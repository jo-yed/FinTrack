import React, { useState } from 'react';
import { LayoutDashboard, CreditCard, Wallet, Target, Shield, Activity, Settings as SettingsIcon, LogOut, Menu, X, Users, Landmark } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import type { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems: { icon: React.FC<any>; label: string; id: PageId }[] = [
    { icon: LayoutDashboard, label: t('common.dashboard'), id: 'dashboard' },
    { icon: CreditCard, label: t('common.transactions'), id: 'transactions' },
    { icon: Wallet, label: t('budgets.title'), id: 'budgets' },
    { icon: Activity, label: t('reports.title'), id: 'reports' },
    { icon: Users, label: t('family.title'), id: 'family' },
    { icon: Landmark, label: t('accounts.title'), id: 'accounts' },
    { icon: Target, label: t('common.goals'), id: 'goals' },
    { icon: Shield, label: t('common.vault'), id: 'vault' },
    { icon: SettingsIcon, label: t('common.settings'), id: 'settings' },
  ];

  const handlePageChange = (page: PageId) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {mobileOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen z-40 w-72 flex-shrink-0
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handlePageChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
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

import React from 'react';
import { Moon, Sun, Globe, Search, Command } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../i18n';
import { UserMenu } from './UserMenu';
import { useProfile } from '../../hooks/useProfile';
import type { PageId } from '../../types';

interface HeaderProps {
  onOpenCommand: () => void;
  onNavigate: (page: PageId) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommand, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { firstName } = useProfile();

  return (
    <header className="print:hidden sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 glass border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between ml-12 lg:ml-0">
        <div className="min-w-0">
          {firstName && (
            <p className="hidden sm:block text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
              {t('profile.hello').replace('{name}', firstName)}
            </p>
          )}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCommand}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">{t('command.placeholder')}</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 ml-1">
              <Command className="w-3 h-3" />
              K
            </kbd>
          </button>

          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <UserMenu onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Moon, Sun, Globe } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../i18n';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 glass border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between ml-12 lg:ml-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
};

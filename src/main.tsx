import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource-variable/inter/wght.css';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { RegionProvider } from './hooks/useRegion';
import { LanguageProvider } from './i18n';
import { ConfigError } from './components/Layout/ConfigError';
import { isSupabaseConfigured } from './lib/supabase';
import { initPwa } from './lib/pwa';
import { UpdateBanner } from './components/Layout/UpdateBanner';

initPwa();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RegionProvider>
        <LanguageProvider>
          <UpdateBanner />
          {isSupabaseConfigured ? (
            <AuthProvider>
              <App />
            </AuthProvider>
          ) : (
            <ConfigError />
          )}
        </LanguageProvider>
      </RegionProvider>
    </ThemeProvider>
  </React.StrictMode>
);

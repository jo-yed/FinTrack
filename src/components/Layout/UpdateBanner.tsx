import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { UPDATE_EVENT } from '../../lib/pwa';

/** Propose de recharger quand une nouvelle version de l'application est prête. */
export const UpdateBanner: React.FC = () => {
  const { t } = useLanguage();
  const [worker, setWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setWorker((e as CustomEvent<ServiceWorker>).detail);
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  }, []);

  if (!worker) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-xl print:hidden" role="status">
      <RefreshCw className="w-4 h-4" />
      <span>{t('pwa.updateReady')}</span>
      <button onClick={() => worker.postMessage('SKIP_WAITING')} className="px-3 py-1 rounded-lg bg-emerald-500 font-medium">{t('pwa.reload')}</button>
    </div>
  );
};

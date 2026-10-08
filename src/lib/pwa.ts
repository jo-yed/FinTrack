/** Application installable (PWA) : enregistrement du service worker, invite d'installation, mises à jour. */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const UPDATE_EVENT = 'fintrack:update-ready';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function getInstallState() {
  return { canInstall: deferredPrompt !== null, installed: installed || isStandalone() };
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome === 'accepted';
}

export function initPwa(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      const announce = (worker: ServiceWorker | null) => {
        if (worker && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: worker }));
        }
      };
      if (registration.waiting) announce(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') announce(worker);
        });
      });
    }).catch(() => undefined);

    // Rechargement uniquement pour une MISE À JOUR (un service worker contrôlait déjà la page) :
    // à la toute première installation, recharger ferait perdre la saisie en cours.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

/* Service worker FinTrack : démarrage rapide et ouverture hors ligne de l'application.
 * Les données (Supabase, domaine différent) ne sont JAMAIS mises en cache ici :
 * les dépenses saisies hors ligne sont gérées par l'application (file d'attente locale). */
const VERSION = 'v3';
const CACHE = `fintrack-${VERSION}`;
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fintrack-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// L'application propose « Recharger » quand une nouvelle version est prête.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;

  // Pages : réseau d'abord (version à jour), repli sur la copie en cache hors ligne
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then(cached => cached || caches.match('/'))),
    );
    return;
  }

  // Guide d'utilisation (PDF) : mis en cache à la première ouverture, ensuite lisible sans connexion
  if (url.pathname === '/guide-fintrack.pdf') {
    event.respondWith(
      caches.match('/guide-fintrack.pdf').then(cached => {
        const refresh = fetch('/guide-fintrack.pdf').then(response => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('/guide-fintrack.pdf', copy));
          }
          return response;
        });
        if (cached) { refresh.catch(() => undefined); return cached; }
        return refresh;
      }),
    );
    return;
  }

  // Fichiers statiques (noms hachés) : cache d'abord
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});

const CACHE_NAME = 'baladatta-attendance-v19';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './Logo.png',
  './css/styles.css',
  './js/store.js',
  './js/sheets-api.js',
  './js/student-mgr.js',
  './js/dashboard.js',
  './js/app.js',
  './assets/traditional/temple_gopuram_study.jpg',
  './assets/traditional/meenakshi_pillar_study.jpg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First: Always fetch latest from server if online, fallback to cache if offline
self.addEventListener('fetch', event => {
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

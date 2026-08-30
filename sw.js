const CACHE_NAME = 'baladatta-attendance-v5';
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
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Pass Google API and external requests straight through
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

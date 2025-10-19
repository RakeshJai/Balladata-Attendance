// sw.js — Simple asset cache for PWA: place this file at the site root.
const CACHE_NAME = 'attendance-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  // add other assets like '/styles.css', '/app.js', '/manifest.json' if you split files
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

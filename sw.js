// CrediPulse Service Worker - Always Network First
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always fetch directly from network
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

const CACHE_NAME = 'aeromax-v1.1';
const STATIC_ASSETS = [
  '/',
  '/icon.svg',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache prefetch warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache API routes atau non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first dengan fallback ke cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response jika valid
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fallback ke root jika dokumen navigasi gagal
        if (event.request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        return new Response('Offline - Catatan Aeromax', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

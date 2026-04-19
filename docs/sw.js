// PYRA PWA — service worker
// Strategy: cache-first for the shell + CSVs; stale-while-revalidate for API calls.
// Version bump invalidates old caches on activation.
const CACHE = 'pyra-v1-2026-04-19';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './data/baseline.csv',
  './data/breath.csv',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const API_HOSTS = new Set([
  'api.open-meteo.com',
  'nominatim.openstreetmap.org',
]);

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Stale-while-revalidate for live APIs
  if (API_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fresh = fetch(event.request)
          .then((resp) => {
            if (resp && resp.ok) cache.put(event.request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Cache-first for shell + CDN
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).then((resp) => {
        if (
          resp &&
          resp.ok &&
          (resp.type === 'basic' || resp.type === 'cors')
        ) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});

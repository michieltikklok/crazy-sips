// Crazy Sips service worker: precaches the whole app so it runs offline.
const CACHE = 'crazy-sips-f386d48f58';
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./fonts/Barlow-400-latin-ext.woff2",
  "./fonts/Barlow-400-latin.woff2",
  "./fonts/Barlow-600-latin-ext.woff2",
  "./fonts/Barlow-600-latin.woff2",
  "./fonts/Barlow-700-latin-ext.woff2",
  "./fonts/Barlow-700-latin.woff2",
  "./fonts/BarlowCondensed-500-latin-ext.woff2",
  "./fonts/BarlowCondensed-500-latin.woff2",
  "./fonts/BarlowCondensed-700-latin-ext.woff2",
  "./fonts/BarlowCondensed-700-latin.woff2",
  "./fonts/Bungee-400-latin-ext.woff2",
  "./fonts/Bungee-400-latin.woff2"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('crazy-sips-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true })
      .then(hit => hit || fetch(req))
      .catch(() => req.mode === 'navigate' ? caches.match('./') : Response.error())
  );
});

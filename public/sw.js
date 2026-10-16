// Tabib service worker: keeps the app on the phone so later visits open at once, and offline.
// Personal data never passes through here: it lives encrypted in IndexedDB.
// The build (scripts/prerender.mjs) fills in VERSION and ASSETS; development leaves them empty.
const VERSION = 'dev';
const ASSETS = [];
const CACHE = 'tabib-' + VERSION;
const PAGE = './index.html';
// How long to wait for a fresh page before opening the saved one.
const NETWORK_WAIT_MS = 1500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', PAGE, './manifest.webmanifest', './icon.svg', ...ASSETS])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Prefer the fresh page so updates arrive, but on a slow connection open the saved copy instead of waiting.
    const fresh = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(PAGE, copy)); }
      return res;
    });
    e.waitUntil(fresh.catch(() => {}));
    const saved = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(() => caches.match(PAGE));
    e.respondWith(
      Promise.race([fresh.catch(() => caches.match(PAGE)), saved.then((hit) => hit || fresh)])
        .then((res) => res || fresh),
    );
    return;
  }
  // Hashed assets never change, so the saved copy is always right.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});

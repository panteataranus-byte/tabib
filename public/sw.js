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
  // Only Tabib's own older caches: other sites on the same address keep theirs.
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('tabib-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Only the app's own page is handled here; opening any other file in the address bar loads it normally.
    const path = new URL(req.url).pathname;
    const scope = new URL(self.registration.scope).pathname;
    if (path !== scope && path !== scope + 'index.html') return;
    // Prefer the fresh page so updates arrive, but on a slow connection open the saved copy instead of waiting.
    const fresh = fetch(req).then((res) => {
      if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(PAGE, copy));
      }
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

/* Offline service worker. The build (scripts/vite-sw-plugin.ts) fills VERSION with a content hash and PRECACHE with
   every file of the release, so after the first visit the whole game (shell, code, models, textures) works offline.
   - install: precache, then WAIT (the page shows "Update ready" and posts SKIP_WAITING when the player agrees);
   - activate: drop old caches, take control;
   - navigation: network first (fresh index.html when online), cache when offline;
   - same-origin files: cache first, then network (and store what was fetched, e.g. models added later). */
const VERSION = 'rb-dev';
const PRECACHE = [];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => Promise.all(['./', ...PRECACHE].map((u) => c.add(u).catch(() => undefined)))),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k.startsWith('rb-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (req, res) => {
  if (!res || !res.ok || res.type === 'opaque') return;
  const copy = res.clone();
  caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          put('./', r);
          return r;
        })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((hit) => hit || caches.match(req, { ignoreSearch: true }))),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((r) => {
          put(req, r);
          return r;
        }),
    ),
  );
});

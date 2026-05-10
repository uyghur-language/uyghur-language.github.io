'use strict';

const CACHE_VERSION = 'v4';
const CACHE_NAME    = `quran-app-${CACHE_VERSION}`;

// Build absolute URLs relative to the SW's own location (works on any host/path).
const BASE = new URL('.', self.location).href;
const SRC  = BASE + 'src/';
const DATA = BASE + 'data/';

const STATIC_ASSETS = [
  SRC  + 'index.html',
  SRC  + 'app.js',
  SRC  + 'style.css',
  SRC  + 'UKIJBasmaT.ttf',
  DATA + 'search-index.json',
];

for (let i = 1; i <= 114; i++) {
  STATIC_ASSETS.push(DATA + `surah/${i}.json`);
}

// ── Install: pre-cache all assets ─────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for same-origin requests ───────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        });
      })
    )
  );
});

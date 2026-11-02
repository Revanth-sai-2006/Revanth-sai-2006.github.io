/* finVerse AI service worker: app shell offline, API always live. */
const VERSION = "fv-v1";
const SCOPE = self.registration.scope;            // e.g. https://host/finverse-ai/
const SHELL = ["", "dashboard/", "login/", "offline.html", "manifest.webmanifest", "finverse-icon-192.png"].map((p) => SCOPE + p);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.href.startsWith(SCOPE)) return;        // Catalyst APIs, Gemini, fonts: never cached here

  // hashed build assets never change: cache first
  if (url.pathname.includes("/_next/static/") || /\.(png|svg|woff2?|js)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // pages: network first, fall back to cache, then offline page
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match(SCOPE + "offline.html"))));
  }
});

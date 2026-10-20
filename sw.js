/* Door Survey — offline support.
   Keeps the last good copy of the app on the device so it opens with no signal.
   It never touches survey data and never intercepts the cloud backup traffic. */
const CACHE = "glk-door-survey-v4";
const CDN   = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(["./", "./index.html", CDN].map(u => c.add(u).catch(() => {})))));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mine = url.origin === self.location.origin || req.url.startsWith(CDN);
  if (!mine) return;                       /* Supabase calls go straight to the network */
  /* Network first, so you always get the newest version when there's signal. */
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || caches.match("./index.html")).then(r => r || caches.match("./")))
  );
});

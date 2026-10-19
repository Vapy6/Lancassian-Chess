// Network first, cache as fallback, so updates show up but the game also opens offline.
const C = 'lancassian-v9', FILES = ['./', 'index.html', 'worldbuilder.html', 'map.html', 'map-data.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'assets/dnd_5e_charactersheet_formfillable.pdf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});

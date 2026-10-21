// Офлайн-режим «Меркурий 3D»: всё приложение лежит в кэше телефона.
// При каждом обновлении файлов build.ps1 меняет VERSION, и телефон подхватывает новую версию.
const VERSION = 'merc3d-20261021-201553';
const CORE = ['./', './index.html', './manifest.webmanifest', './vendor/three.min.js', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Страница: сначала сеть (чтобы видеть обновления), без сети — из кэша
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Шрифты Google: кэшируем при первом открытии с интернетом
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
      }).catch(() => new Response('', { status: 503 })))
    );
    return;
  }

  // Остальные файлы приложения: из кэша, иначе из сети
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});

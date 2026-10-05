// Si cambias algún archivo de la app, sube este número para que el móvil descargue la versión nueva.
const VERSION = 'finanzas-v3';
const FUENTES = 'gastos-fuentes';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== FUENTES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La propia app: primero red (para recibir actualizaciones), si no hay conexión, caché.
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(
        fetch(req)
          .then((r) => {
            const copia = r.clone();
            caches.open(VERSION).then((c) => c.put('./index.html', copia));
            return r;
          })
          .catch(() => caches.match('./index.html'))
      );
      return;
    }
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }

  // Tipografía: se guarda la primera vez para que funcione sin conexión.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FUENTES).then(async (c) => {
        const guardada = await c.match(req);
        if (guardada) return guardada;
        const r = await fetch(req);
        c.put(req, r.clone());
        return r;
      })
    );
  }
  // Las llamadas a Google Apps Script no pasan por la caché.
});

// Service worker mínimo del shell offline de Velmeya (GEN-35).
// Se mantiene adrede pequeño: sin precache completo de builds con hashes ni
// adopción de Workbox en esta fase; los límites están descritos en docs/ARCHITECTURE.md.
const CACHE = 'velmeya-shell-v1'
const RECURSOS_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon.svg',
  '/icons/maskable.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(RECURSOS_SHELL)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys()
      await Promise.all(
        claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave)),
      )
      await self.clients.claim()
    })(),
  )
})

const mismoOrigen = (url) => new URL(url).origin === self.location.origin

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !mismoOrigen(request.url)) return

  // Navegaciones: red-primero con respuesta de red o shell en caché (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const respuesta = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, respuesta.clone())
          return respuesta
        } catch {
          const cache = await caches.open(CACHE)
          return (
            (await cache.match(request)) ??
            (await cache.match('/')) ??
            Response.error()
          )
        }
      })(),
    )
    return
  }

  // Estáticos mismo origen: caché-primero; si falta, red y guardar en caché.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const enCache = await cache.match(request)
      if (enCache) return enCache
      try {
        const respuesta = await fetch(request)
        if (respuesta.ok) cache.put(request, respuesta.clone())
        return respuesta
      } catch {
        return Response.error()
      }
    })(),
  )
})

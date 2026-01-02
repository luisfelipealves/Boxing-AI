
// Service Worker V5.0.0 - FORCE DESTROY OLD CACHE
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('SW: Removendo cache antigo:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptor para garantir que não estamos servindo nada do cache
self.addEventListener('fetch', (event) => {
    // Não faz cache de nada, sempre busca na rede para garantir versão nova
    return;
});

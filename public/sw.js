// Service Worker สำหรับ PWA
// Cache version
const CACHE_NAME = 'ne-doc-form-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

// Install event - Cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache only essential files, let others be cached on demand
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('[Service Worker] Some files failed to cache:', error);
        });
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Skip Firebase and external API requests (always use network)
  if (
    url.origin.includes('firebase') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('google.com') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('recaptcha')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Don't cache if not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response
            const responseToCache = fetchResponse.clone();

            // Cache the fetched response (for static assets)
            if (url.pathname.startsWith('/assets/') || 
                url.pathname === '/' || 
                url.pathname === '/index.html' ||
                url.pathname.includes('.svg') ||
                url.pathname.includes('.png') ||
                url.pathname.includes('.jpg') ||
                url.pathname.includes('.jpeg')) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return fetchResponse;
          })
          .catch(() => {
            // If fetch fails, return offline page if available
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});


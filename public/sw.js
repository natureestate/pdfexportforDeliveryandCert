// Service Worker สำหรับ PWA
// Cache version - จะถูก inject โดย Vite plugin ระหว่าง build
const CACHE_NAME = 'ne-doc-form-__BUILD_VERSION__';
const BUILD_VERSION = '__BUILD_VERSION__';

// ไฟล์ที่ต้องใช้ network-first strategy (ไม่ควร cache)
const NETWORK_FIRST_PATHS = [
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

// Install event - Cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache only essential static files, ไม่ cache index.html และ manifest.json
        return cache.addAll([
          '/icon-192x192.svg',
          '/icon-512x512.svg'
        ]).catch((error) => {
          console.warn('[Service Worker] Some files failed to cache:', error);
        });
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // ลบ cache เก่าทั้งหมดที่ไม่ตรงกับ cache name ปัจจุบัน
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

// Fetch event - Network-first สำหรับ index.html และ manifest.json, Cache-first สำหรับ assets
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
    url.origin.includes('recaptcha') ||
    url.origin.includes('aistudiocdn.com')
  ) {
    return;
  }

  // ตรวจสอบว่าเป็นไฟล์ที่ต้องใช้ network-first หรือไม่
  const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => 
    url.pathname === path || url.pathname.endsWith(path)
  );

  if (isNetworkFirst) {
    // Network-first strategy สำหรับ index.html และ manifest.json
    event.respondWith(
      fetch(event.request)
        .then((fetchResponse) => {
          // ถ้า fetch สำเร็จ ให้ return response โดยไม่ cache
          if (fetchResponse && fetchResponse.status === 200) {
            return fetchResponse;
          }
          // ถ้า fetch ล้มเหลว ให้ลองหาใน cache
          return caches.match(event.request);
        })
        .catch(() => {
          // ถ้า network ล้มเหลว ให้ลองหาใน cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first strategy สำหรับ assets (JS, CSS, images)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // ถ้ามีใน cache ให้ return จาก cache
          if (response) {
            return response;
          }

          // ถ้าไม่มีใน cache ให้ fetch จาก network
          return fetch(event.request)
            .then((fetchResponse) => {
              // Don't cache if not a valid response
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }

              // Clone the response
              const responseToCache = fetchResponse.clone();

              // Cache assets ที่มี hash (ไฟล์ใน /assets/)
              if (url.pathname.startsWith('/assets/')) {
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
  }
});


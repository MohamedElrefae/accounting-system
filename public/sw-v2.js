// Service Worker for Performance Optimization - V2.0.2
const CACHE_NAME = 'accounting-app-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/vite.svg'
];

// Handle different types of requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Google Fonts and Material Icons (Stale-While-Revalidate)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidateStrategy(request, 'fonts-cache'));
    return;
  }

  // 2. Local API requests - network first
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  }
  // 3. Static Assets (Scripts, Styles) - cache first
  else if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirstStrategy(request));
  }
  // 4. Images - cache first with network fallback
  else if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request));
  }
  // 5. Everything else (including HTML) - network first
  else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// Stale-While-Revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null); // Silent fail for background fetch

  return cachedResponse || fetchPromise;
}

// Network first strategy (good for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for fallback
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Network fetch failed or offline, trying cache:', request.url);
  }

  // Network failed or returned error, try cache
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (cacheErr) {
    console.warn('SW: Cache lookup failed:', cacheErr);
  }

  // Final fallback for failed fetches to avoid unhandled rejection
  // For HTML requests, return a generic offline page if possible, otherwise status 503
  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Cache first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Cache miss and network failed:', request.url);
  }

  // Both failed, return a fallback instead of throwing
  return new Response('Asset not found offline', { status: 404 });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when back online
  console.log('SW: Background sync triggered');
}

/* ============================================
   COFFEE POS — SERVICE WORKER
   Offline-first + Cache
   ============================================ */

var CACHE_NAME = 'coffee-pos-v2';
var urlsToCache = [
  './',
  './index.html',
  './style.css',
  './utils.js',
  './storage.js',
  './firebase-sync.js',
  './app.js',
  './views-pos.js',
  './views-menu.js',
  './views-orders.js',
  './views-report.js',
  './views-stock.js',
  './modals.js',
  './admin.js',
  './export.js',
  './manifest.json'
];

/* Install */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

/* Activate — clean old caches */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) {
          return n !== CACHE_NAME;
        }).map(function(n) {
          return caches.delete(n);
        })
      );
    })
  );
  self.clients.claim();
});

/* Fetch — cache first, fallback network */
self.addEventListener('fetch', function(e) {
  /* Skip non-GET and Firebase requests */
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf('firestore.googleapis.com') !== -1) return;
  if (url.indexOf('googleapis.com') !== -1) return;
  if (url.indexOf('gstatic.com') !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        /* Return cache, also fetch fresh copy */
        var fetchPromise = fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {});
        return cached;
      }
      /* No cache — fetch from network */
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
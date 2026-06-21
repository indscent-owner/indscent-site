var CACHE_NAME = 'indscent-v6';
var STATIC_ASSETS = [
  '/assets/logo.jpg',
  '/home.css',
  '/client.css',
  '/client.js',
  '/recent.css',
  '/admin.css',
  '/bundles.css',
  '/fragrances.js'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  var url = event.request.url;

  // Only cache specific static assets — never cache HTML pages
  var isStaticAsset = STATIC_ASSETS.some(function(asset) {
    return url.endsWith(asset) || url.includes(asset + '?');
  });

  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(function() {
        return caches.match(event.request);
      })
    );
  }
  // All other requests (HTML pages, images) go straight to network — no caching
});
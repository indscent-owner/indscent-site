var CACHE_NAME = 'indscent-v8';
var APP_SHELL = [
  '/',
  '/home/',
  '/share/',
  '/recent/',
  '/client/',
  '/gallery/',
  '/admin/login/',
  '/manifest.json',
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
      return cache.addAll(APP_SHELL).catch(function() {
        return Promise.resolve();
      });
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

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(new URL('/home/', self.location.origin).href, response.clone());
          return response;
        });
      }).catch(function() {
        return caches.match(new URL('/home/', self.location.origin).href)
          || caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (!response || !response.ok) return response;
      return caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/home/');
      });
    })
  );
});
// PRISMA Übergabeprotokoll – Service Worker
// Bei jedem App-Update: CACHE_VERSION erhöhen (z.B. v2, v3...)
// Dadurch wird der alte Cache automatisch gelöscht und die neue Version geladen.

var CACHE_VERSION = "prisma-uebergabe-v16";

var ASSETS = [
  "index.html",
  "manifest.json",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

// Install: Assets cachen
self.addEventListener("install", function(e) {
  self.skipWaiting(); // Sofort aktivieren
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        // Einzelne fehlende Assets nicht blockieren
        return Promise.resolve();
      });
    })
  );
});

// Activate: Alte Caches löschen
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_VERSION;
        }).map(function(k) {
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first für index.html (immer aktuell),
// Cache-first für statische Assets (Icons etc.)
self.addEventListener("fetch", function(e) {
  var url = e.request.url;
  var isHTML = e.request.mode === "navigate" ||
               url.indexOf("index.html") > -1 ||
               (e.request.headers.get("accept") || "").indexOf("text/html") > -1;

  if (isHTML) {
    // Network-first: neueste Version laden, Cache als Fallback (offline)
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var copy = resp.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(e.request, copy);
        });
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(r) {
          return r || caches.match("index.html");
        });
      })
    );
  } else {
    // Cache-first für Assets
    e.respondWith(
      caches.match(e.request).then(function(r) {
        return r || fetch(e.request).then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE_VERSION).then(function(cache) {
            cache.put(e.request, copy);
          });
          return resp;
        });
      }).catch(function() {
        return fetch(e.request);
      })
    );
  }
});

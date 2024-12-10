self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("media-cache").then((cache) => {
      // You can cache some common files during the install phase if necessary
      console.log("Service Worker installed and cache opened.");
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Clean up old caches if necessary
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== "media-cache") {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Allow the new service worker to take control immediately
  self.skipWaiting();
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Avoid caching the service worker script itself
  if (event.request.url.includes("service-worker.js")) {
    return;
  }

  // Match video files (.mp4, .webm, .ogg, .mov)
  if (event.request.url.match(/\.(mp4|webm|ogg|mov)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            // Only cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open("media-cache").then((cache) => {
                console.log(`Caching video: ${event.request.url}`);
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
        );
      })
    );
  }

  // Match image files (.jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, .tiff)
  else if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open("media-cache").then((cache) => {
                console.log(`Caching image: ${event.request.url}`);
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
        );
      })
    );
  }
});

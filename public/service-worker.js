const CACHE_NAME = "media-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log("Service Worker installed and cache opened.");
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // Avoid caching the service worker script itself
  if (requestUrl.includes("service-worker.js")) {
    return;
  }

  // Handle video files
  if (requestUrl.match(/\.(mp4|webm|ogg|mov)$/)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          // Clone the request to ensure no Range header
          const modifiedRequest = new Request(event.request.url, {
            method: "GET",
            headers: new Headers({}),
          });

          const response = await fetch(modifiedRequest);
          if (response.ok && response.status === 200) {
            const responseClone = response.clone();
            await cache.put(event.request, responseClone);
          }
          return response;
        } catch (error) {
          console.error(
            `Failed to fetch and cache video: ${requestUrl}`,
            error
          );
          return new Response("Video not available offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        }
      })()
    );
  }

  // Handle image files
  else if (requestUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request)
            .then((response) => {
              if (response.ok && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch((error) => {
              console.error(`Failed to fetch image: ${requestUrl}`, error);
              return cachedResponse;
            })
        );
      })
    );
  }
});

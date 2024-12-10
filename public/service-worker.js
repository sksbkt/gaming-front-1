self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("media-cache").then((cache) => {
      // Cache specific resources here if needed.
      console.log("Service Worker installed and cache opened.");
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Match video files (.mp4, .webm, .ogg, .mov)
  if (event.request.url.match(/\.(mp4|webm|ogg|mov)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached video if available, otherwise fetch from network
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            // Clone the response to cache it for future requests
            const responseClone = response.clone();
            caches.open("media-cache").then((cache) => {
              cache.put(event.request, responseClone);
            });
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
        // Return cached image if available, otherwise fetch from network
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            // Clone the response to cache it for future requests
            const responseClone = response.clone();
            caches.open("media-cache").then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
        );
      })
    );
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("video-cache").then((cache) => {
      return cache.addAll([
        "/videos/", // Add video URLs here
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/videos/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

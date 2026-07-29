const CACHE = 'raee-cafe-v29';
const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './tables-sync.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        ASSETS.map(asset =>
          cache.add(new Request(asset, { cache: 'reload' }))
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function injectTableSync(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();

  if (!html.includes('tables-sync.js')) {
    const script =
      '<script src="./tables-sync.js?v=29" defer></script>';

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${script}\n</body>`);
    } else {
      html += script;
    }
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async response => {
          const originalCopy = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put('./index.html', originalCopy);
          });

          return injectTableSync(response);
        })
        .catch(async () => {
          const cached =
            (await caches.match('./index.html')) ||
            (await caches.match(request));

          if (!cached) {
            return new Response('Offline', {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            });
          }

          return injectTableSync(cached);
        })
    );

    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() =>
      caches.match(request)
    )
  );
});
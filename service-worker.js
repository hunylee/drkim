const CACHE_NAME = 'drkim-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/보고서/dashboard.html',
  '/보고서/report.html',
  '/보고서/chart.html',
  '/보고서/meeting-result.html',
  '/보고서/diagram.svg',
  '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] 캐시 설치');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 페치 이벤트 - Network first, Cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;

  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // 유효한 응답이면 캐시에 저장
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // 네트워크 오류 시 캐시에서 반환
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || new Response('오프라인 상태입니다. 이전에 로드된 콘텐츠를 표시합니다.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          });
        });
      })
  );
});

// 백그라운드 동기 (선택사항)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/api/sync')
        .then(response => console.log('[Service Worker] 동기 완료'))
        .catch(err => console.log('[Service Worker] 동기 실패:', err))
    );
  }
});

// 푸시 알림 (선택사항)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '새로운 알림입니다',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%237c6fff" width="192" height="192"/><text x="50%" y="50%" font-size="100" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">김</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%237c6fff" width="192" height="192"/></svg>',
    vibrate: [200, 100, 200],
    tag: 'drkim-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('김비서', options)
  );
});

// 알림 클릭
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

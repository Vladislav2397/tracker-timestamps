// Service Worker для Timestamp Tracker PWA
const CACHE_NAME = 'timestamp-tracker-v1';
const STATIC_CACHE_NAME = 'timestamp-tracker-static-v1';
const DYNAMIC_CACHE_NAME = 'timestamp-tracker-dynamic-v1';

// Ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/tracker-timestamps/',
  '/tracker-timestamps/index.html',
  '/tracker-timestamps/manifest.json',
  '/tracker-timestamps/icon-192x192.png',
  '/tracker-timestamps/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем старые кэши
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем запросы к внешним доменам
  if (url.origin !== location.origin) {
    return;
  }
  
  // Стратегия кэширования для разных типов ресурсов
  if (request.destination === 'document') {
    // Для HTML страниц: Network First
    event.respondWith(networkFirstStrategy(request));
  } else if (request.destination === 'script' || request.destination === 'style') {
    // Для JS/CSS: Cache First
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'image') {
    // Для изображений: Cache First
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Для остальных ресурсов: Network First
    event.respondWith(networkFirstStrategy(request));
  }
});

// Стратегия Cache First
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Стратегия Network First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback для HTML страниц
    if (request.destination === 'document') {
      return caches.match('/tracker-timestamps/index.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Периодическая синхронизация (если поддерживается)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Здесь можно добавить логику синхронизации данных
  }
});

// Обработка push уведомлений (если понадобится в будущем)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/tracker-timestamps/icon-192x192.png',
      badge: '/tracker-timestamps/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Открыть приложение',
          icon: '/tracker-timestamps/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/tracker-timestamps/icon-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/tracker-timestamps/')
    );
  }
});

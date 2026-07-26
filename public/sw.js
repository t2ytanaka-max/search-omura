const CACHE_NAME = 'search-omura-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.png',
  '/manifest.json'
];

// インストール時に基本アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 旧キャッシュの消去
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// キャッシュ優先（Stale-While-Revalidate）でのリクエストフェッチ
// Firebase通信や国土地理院マップタイルは IndexedDB やネットワークに直接流す
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firestore (googleapis) やマップタイルはサービスワーカーキャッシュから除外
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis') ||
    url.hostname.includes('cyberjapandata')
  ) {
    return;
  }

  // GETリクエストのみをキャッシュ対象とする
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // キャッシュを即座に返しつつ、バックグラウンドで最新版を取得・更新
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {}); // 圏外時はエラー抑止
        
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // アプリ起動に必要なアセット(ViteでビルドされたJSやCSS)を動的にキャッシュ
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch((err) => {
        // オフライン時のナビゲーションエラーはキャッシュ版のindex.htmlを返す
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
      });
    })
  );
});

// バックグラウンド・スリープ中の端末画面を起動・点灯させるプッシュ通知受信用ハンドラー
self.addEventListener('push', (event) => {
  let data = { title: '🚨 本部からの緊急指示', body: '新しい指示を受信しました。' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '本部からの指示が届いています。',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [1000, 500, 1000, 500, 1000],
    tag: 'instruction-alert',
    renotify: true,
    requireInteraction: true, // 画面点灯＆ユーザー操作まで固定表示
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 本部からの緊急指示', options)
  );
});

// ロック画面・スリープ中の通知タップ時にアプリを最前面表示
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

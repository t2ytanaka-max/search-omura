// OSレベル・スリープ中Web Notification APIユーティリティ

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn("Failed to request notification permission:", e);
    return 'denied';
  }
};

export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const sendOSNotification = (title, body, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // サービスワーカーが利用可能であれば ServiceWorkerRegistration.showNotification を優先
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body: body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [1000, 500, 1000, 500, 1000],
          tag: 'instruction-alert',
          renotify: true,
          requireInteraction: true, // ユーザーが操作するまで画面に固定
          data: options.data || {},
          ...options
        });
      }).catch(() => {
        // フォールバック: 通常の Notification API
        createStandardNotification(title, body, options);
      });
    } else {
      createStandardNotification(title, body, options);
    }
    return true;
  } catch (e) {
    console.warn("Failed to send OS Notification:", e);
    return false;
  }
};

const createStandardNotification = (title, body, options = {}) => {
  try {
    const notification = new Notification(title, {
      body: body,
      icon: '/pwa-192x192.png',
      vibrate: [1000, 500, 1000, 500, 1000],
      tag: 'instruction-alert',
      renotify: true,
      requireInteraction: true,
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn("Standard notification failed:", e);
  }
};

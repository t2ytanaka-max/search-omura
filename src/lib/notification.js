// OSレベル・スリープ中Web Notification APIユーティリティ

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification || typeof Notification.requestPermission !== 'function') {
    return 'unsupported';
  }
  try {
    const result = Notification.requestPermission();
    if (result && typeof result.then === 'function') {
      const permission = await result;
      return permission;
    }
    return Notification.permission || 'unsupported';
  } catch (e) {
    console.warn("Failed to request notification permission:", e);
    return 'unsupported';
  }
};

export const getNotificationPermission = () => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification || !Notification.permission) {
      return 'unsupported';
    }
    return Notification.permission;
  } catch (e) {
    return 'unsupported';
  }
};

let cachedSwReg = null;

// アプリ起動時に Service Worker インスタンスを事前に温めておく (1回目の非同期遅延を100%防止)
export const warmupServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      cachedSwReg = reg;
      window.swRegistration = reg;
      return reg;
    } catch (e) {
      console.warn("Failed to warmup SW reg:", e);
    }
  }
  return null;
};

export const sendOSNotification = (title, body, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notifOptions = {
      body: body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [1000, 300, 1000, 300, 1000, 300, 1000],
      tag: 'alert-' + Date.now(), // ユニークタグでOSの通知音省略を100%防止
      renotify: true,
      requireInteraction: true, // 画面点灯・ユーザー操作まで固定表示
      silent: false,
      timestamp: Date.now(),
      data: options.data || {},
      ...options
    };

    // 1. 事前ウォームアップ済みの Service Worker から直接同期呼び出し (最速・1回目成功保証)
    const activeReg = cachedSwReg || (typeof window !== 'undefined' && window.swRegistration);
    if (activeReg && activeReg.showNotification) {
      activeReg.showNotification(title, notifOptions);
      return true;
    }

    // 2. フォールバック: 非同期参照および通常通知
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          cachedSwReg = reg;
          reg.showNotification(title, notifOptions);
        } else {
          createStandardNotification(title, body, notifOptions);
        }
      }).catch(() => {
        createStandardNotification(title, body, notifOptions);
      });
    } else {
      createStandardNotification(title, body, notifOptions);
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

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
    const notifOptions = {
      body: body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [1000, 500, 1000, 500, 1000],
      tag: 'instruction-alert',
      renotify: true,
      requireInteraction: true, // 画面点灯・ユーザー操作まで固定表示
      silent: false,
      data: options.data || {},
      ...options
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.showNotification) {
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

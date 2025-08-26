export const installPWA = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ('beforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        e.prompt().then((result: any) => {
          resolve(result.outcome === 'accepted');
        });
      });
    } else {
      resolve(false);
    }
  });
};

export const registerServiceWorker = (): void => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const showNotification = (title: string, body: string): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    });
  }
};
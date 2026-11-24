import { getIntl } from '@umijs/max';
import { message } from 'antd';
import defaultSettings from '../config/defaultSettings';
import { clearAppCaches, registerAppServiceWorker } from './utils/pwa-update';

const { pwa } = defaultSettings;
const isHttps = document.location.protocol === 'https:';
const isLocalhost =
  document.location.hostname === 'localhost' ||
  document.location.hostname === '127.0.0.1';

const appScope = new URL(APP_PUBLIC_PATH, window.location.origin).href;

// if pwa is true
if (pwa) {
  // Notify user if offline now
  window.addEventListener('sw.offline', () => {
    message.warning(getIntl().formatMessage({ id: 'app.pwa.offline' }));
  });

  // Register service worker
  if ('serviceWorker' in navigator && (isHttps || isLocalhost)) {
    const register = () => {
      registerAppServiceWorker(navigator.serviceWorker, appScope, () => {}).catch(
        (error) => {
          console.warn('Service worker registration failed:', error);
        },
      );
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // Notify offline status
    window.addEventListener('offline', () => {
      window.dispatchEvent(new CustomEvent('sw.offline'));
    });
  }
} else if ('serviceWorker' in navigator && isHttps) {
  void navigator.serviceWorker
    .getRegistration(appScope)
    .then(async (registration) => {
      if (registration?.scope === appScope) await registration.unregister();
      await clearAppCaches(appScope, window.caches);
    })
    .catch((error) => console.warn('Service worker cleanup failed:', error));
}

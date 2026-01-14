import apiClient from "../apiclient";

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Unregister any existing service workers for local development
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('[ServiceWorker] Unregistered existing service worker');
      }
    });
    
    // Skip registration in development to avoid offline page issues
    if (import.meta.env.DEV) {
      console.log('[ServiceWorker] Skipping registration in development mode');
      return;
    }
    
    const register = () => {
      try {
        // Use static Service Worker file
        const swUrl = '/sw.js';

        console.log(`[ServiceWorker] Attempting to register SW at: ${swUrl}`);

        navigator.serviceWorker.register(swUrl)
          .then(registration => {
            console.log('[ServiceWorker] Registration successful with scope: ', registration.scope);
          })
          .catch(error => {
            console.error('[ServiceWorker] Registration failed: ', error);
          });
      } catch (e) {
        console.error('[ServiceWorker] Failed to construct SW URL:', e);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }
}

import { useEffect } from 'react';
import { usePwaStore } from 'utils/pwa-store';

export function PwaListener() {
  const { setDeferredPrompt, setAppInstalled } = usePwaStore();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
    };

    const handleAppInstalled = () => {
      setAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setDeferredPrompt, setAppInstalled]);

  return null;
}

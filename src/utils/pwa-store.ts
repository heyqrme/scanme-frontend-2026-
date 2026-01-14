import { create } from 'zustand';
import { isIOSDevice } from './pwa-utils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isIOS: boolean;
  isAppInstalled: boolean;
  
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setAppInstalled: (installed: boolean) => void;
  install: () => Promise<boolean>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isIOS: isIOSDevice(),
  isAppInstalled: window.matchMedia('(display-mode: standalone)').matches,

  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
  
  setAppInstalled: (installed) => set({ isAppInstalled: installed }),

  install: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        set({ deferredPrompt: null, isInstallable: false });
        return true;
      }
    } catch (err) {
      console.error('Error during PWA install:', err);
    }
    
    return false;
  }
}));

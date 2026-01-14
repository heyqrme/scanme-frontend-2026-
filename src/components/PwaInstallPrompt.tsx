import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "../utils/cn";
import { ArrowDownToLine, X, Share2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Add custom animation for slide up
  useEffect(() => {
    // Add a style element to the document head if it doesn't exist yet
    if (!document.querySelector('#pwa-prompt-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'pwa-prompt-styles';
      styleEl.textContent = `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease forwards;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App is already installed, don't show the prompt
    }

    // Check if prompt was recently dismissed
    const promptDismissed = localStorage.getItem('pwaPromptDismissed');
    if (promptDismissed && Date.now() - parseInt(promptDismissed) < 7 * 24 * 60 * 60 * 1000) {
      // Don't show if dismissed in the last 7 days
      return;
    }

    // Check for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);

    // If on iOS, show the banner with iOS-specific instructions
    if (isIOS) {
      // Show prompt after the user has interacted with the site
      const handleUserInteraction = () => {
        setShowBanner(true);
        // Remove the event listeners after showing the banner
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('scroll', handleUserInteraction);
      };
      
      window.addEventListener('click', handleUserInteraction);
      window.addEventListener('scroll', handleUserInteraction);
      
      // Fallback: If no interaction after 15 seconds, show anyway
      setTimeout(() => {
        setShowBanner(true);
      }, 15000);
      
      return () => {
        window.removeEventListener('click', handleUserInteraction);
        window.removeEventListener('scroll', handleUserInteraction);
      };
      return;
    }

    // For other devices, handle the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Show the install prompt after a short delay
      // For better UX, show prompt after user has been active on the site
      const handleUserEngagement = () => {
        // On mobile, show banner instead of dialog for better UX
        const isMobileDevice = window.innerWidth <= 768;
        if (isMobileDevice) {
          setShowBanner(true);
        } else {
          setIsOpen(true);
        }
        
        // Remove listeners after showing
        window.removeEventListener('click', handleUserEngagement);
        window.removeEventListener('scroll', handleUserEngagement);
      };
      
      window.addEventListener('click', handleUserEngagement);
      window.addEventListener('scroll', handleUserEngagement);
      
      // Fallback: If no engagement after 15 seconds
      setTimeout(() => {
        handleUserEngagement();
      }, 15000);
      
      return () => {
        window.removeEventListener('click', handleUserEngagement);
        window.removeEventListener('scroll', handleUserEngagement);
      };
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the saved prompt as it can't be used again
    setDeferredPrompt(null);
    setIsInstallable(false);
    setIsOpen(false);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIsOpen(false);
    // Remember that the user dismissed the prompt
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // Nothing to show if not installable and not on iOS
  if (!isInstallable && !isIOSDevice) return null;

  return (
    <>
      {/* Mobile Banner - more visible and persistent */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-violet-900 to-purple-900 text-white p-4 z-50 border-t border-violet-700 animate-slide-up shadow-lg shadow-purple-900/30">
          <button 
            className="absolute top-2 right-2 text-white/80 hover:text-white"
            onClick={handleDismiss}
          >
            <X size={20} />
          </button>
          
          <div className="flex flex-col max-w-md mx-auto">
            <img 
              src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250115_142622_Facebook.jpg?t=1712640101" 
              alt="ScanMe Logo" 
              className="w-12 h-12 rounded-lg"
            />
            
            <div className="flex w-full items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg">Add ScanMe to Home Screen</h3>
                <p className="text-sm text-gray-200">
                  {isIOSDevice 
                    ? 'Tap the share button and then "Add to Home Screen"' 
                    : 'Install our app for the best experience'}
                </p>
              </div>
              
              {isIOSDevice ? (
                <Share2 className="animate-pulse h-6 w-6" />
              ) : (
                <Button 
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                  onClick={handleInstall}
                >
                  Install
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Desktop Dialog - for non-mobile devices */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={cn(
          "dark bg-black/90 border-violet-800/50 text-white max-w-md",
          "backdrop-blur-lg")}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              Get the ScanMe App
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Install ScanMe on your device for the best experience and offline access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-800 flex items-center justify-center">
                <ArrowDownToLine className="w-12 h-12 text-white" />
              </div>
              <p className="text-sm text-gray-300">Add to home screen for quick access</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={handleDismiss}>Later</Button>
            <Button 
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white" 
              onClick={handleInstall}>
              Install Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

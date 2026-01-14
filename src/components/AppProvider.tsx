import { ReactNode, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Toaster, toast } from "sonner";
import { ErrorBoundary } from "react-error-boundary";
import { APP_BASE_PATH } from "app";
import { useAuthStore } from "../utils/auth-store";
import { useChatStore } from "../utils/chat-store";
import { HeaderNavigation } from "./HeaderNavigation";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { ChatListener } from "./ChatListener";
import { GuideBot } from "./GuideBot";
import { PresenceListener } from "./PresenceListener";
import { registerServiceWorker } from "../utils/serviceWorkerRegistration";

interface Props {
  children: ReactNode;
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
        <pre className="p-4 bg-muted rounded text-xs overflow-auto max-h-[200px]">
          {error.message}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 */
export const AppProvider = ({ children }: Props) => {
  // Initialize the auth store listener on app startup
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Set the dark theme globally
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("diagonal-lines");
  }, []);

  // Register Service Worker for offline support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Helmet>
        <title>ScanMe - Social QR Connection</title>
        <meta name="description" content="Connect with friends via unique QR codes in this social community for young adults" />
        {/* Manifest is loaded from head.html via static file */}
      </Helmet>
      
      <Toaster position="top-center" theme="dark" richColors closeButton />
      <PwaInstallPrompt />
      <ChatListener />
      <PresenceListener />
      <GuideBot />
      <HeaderNavigation />
      <div className="pt-16">
        {children}
      </div>
    </ErrorBoundary>
  );
};

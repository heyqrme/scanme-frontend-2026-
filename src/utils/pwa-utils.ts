import { APP_BASE_PATH } from "app";
import { PRODUCTION_URL } from "./config";

// PWA installation utilities

/**
 * Get a shareable PWA installation link for the app
 * This forms a URL that directly opens the app in a browser, ready for installation
 */
export function getPwaInstallUrl(): string {
  // If a production URL is configured, use it for sharing/installing
  if (PRODUCTION_URL) {
    return PRODUCTION_URL;
  }

  // Fallback for when no production URL is set (e.g. local dev only)
  // Get the base app URL
  // Ensure we handle potential double slashes if APP_BASE_PATH starts with /
  const path = APP_BASE_PATH.startsWith('/') ? APP_BASE_PATH : `/${APP_BASE_PATH}`;
  const baseUrl = `${window.location.origin}${path}`;
  
  // Create a URL that can be shared
  return baseUrl;
}

/**
 * Check if the device is an iOS device
 */
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Check if the app is already installed as a PWA
 */
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Get installation instructions based on device
 */
export function getInstallInstructions(): string {
  if (isIOSDevice()) {
    return "To install, open this link in Safari, tap the share icon, and select 'Add to Home Screen'";
  }
  
  // For Android/desktop
  return "Open this link in Chrome, Edge, or a compatible browser and follow the installation prompt";
}

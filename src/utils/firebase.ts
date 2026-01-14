// Import from the shared auth module to avoid duplicate initialization
import { firebaseApp, firebaseAuth, firestore, firebaseStorage } from "../app/auth/firebase";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Export the instances directly, aliased to match previous usage
export const auth = firebaseAuth;
export const db = firestore;
// Use the firebaseStorage from auth/firebase which is correctly configured
export const storage = firebaseStorage;
export const app = firebaseApp;

// Initialize analytics if supported
let analyticsInstance = null;
try {
  analyticsInstance = getAnalytics(firebaseApp);
} catch (e) {
  console.warn("Firebase Analytics initialization failed or not supported:", e);
}
export const analytics = analyticsInstance;

// Export alias re-exports to match previous usage
export { firebaseAuth, firestore };

// Helper to get auth token reliably by waiting for auth state
export const getSecureAuthToken = async (): Promise<string | null> => {
  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser?.getIdToken() ?? null;
};

// A promise that resolves immediately with the instances
export const firebasePromise = Promise.resolve({
  app: firebaseApp,
  auth: firebaseAuth,
  db: firestore,
  storage: firebaseStorage,
  analytics: analyticsInstance
});

console.log("FIREBASE_DEBUG: Using shared Firebase initialization from 'app/auth/firebase'.");

import { create } from "zustand";

// Firebase imports
import {
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  getAuth,
} from "firebase/auth";

import { doc, setDoc, getDoc, updateDoc, getFirestore } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "./firebase"; // Import from our new single source of truth

// Define the user interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}

// Define the store interface
interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  auth: any; // Add auth to state
  db: any;   // Add db to state
  
  // Initialize the auth state
  init: () => () => void; // init will now set the state
  
  // Authentication methods
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Admin methods
  checkAdminStatus: () => Promise<boolean>;
  isAdmin: () => boolean;
  setAdminStatus: (userId: string, isAdmin: boolean) => Promise<void>;
  
  // Error handling
  clearError: () => void;
}

// Create the auth store
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  auth: null, // Default to null
  db: null,   // Default to null
  
  init: () => {
    if (!auth) {
      console.error("Auth instance not initialized in useAuthStore");
      return () => {};
    }

    // Now, this will work because `auth` is initialized at the module level
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (!db) {
           console.error("Firestore db not initialized in useAuthStore");
           // Proceed with limited user info if db is missing
           const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAdmin: false,
          };
          set({ user, loading: false, error: "Database connection failed" });
          return;
        }

        // Get the user document to check for admin status
        getDoc(doc(db, "users", firebaseUser.uid)).then((docSnap) => {
          // Convert Firebase user to our User interface
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAdmin: docSnap.exists() ? docSnap.data().isAdmin || false : false,
          };
          set({ user, loading: false, error: null });
        }).catch((error) => {
          console.error("Error fetching user document:", error);
          // Fallback to basic user info without admin status
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAdmin: false,
          };
          set({ user, loading: false, error: "Failed to fetch user details." });
        });
      } else {
        set({ user: null, loading: false, error: null });
      }
    });
    // The returned function will be called when the component unmounts
    return unsubscribe;
  },
  
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The auth state listener will set the user and loading to false
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      toast.error(`Login failed: ${error.message}`);
      return false;
    }
  },
  
  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user exists in Firestore, if not create a new user document
      const userRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          createdAt: new Date(),
        });
      }
      // The auth state listener will set the user and loading to false
      return true;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      toast.error(`Google login failed: ${error.message}`);
      return false;
    }
  },
  
  signup: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        photoURL: null,
        createdAt: new Date(),
        isAdmin: false, // Explicitly set isAdmin to false
      });
      
      // The auth state listener will set the user and loading to false
      toast.success("Account created successfully!");
    } catch (error: any) {
      set({ error: error.message, loading: false });
      toast.error(`Signup failed: ${error.message}`);
    }
  },
  
  logout: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      // No need to set user to null here as the auth state listener will handle it
      toast.success("Logged out successfully!");
    } catch (error: any) {
      set({ error: error.message, loading: false });
      toast.error(`Logout failed: ${error.message}`);
    }
  },
  
  // Check if current user is admin - returns promise for async operations
  checkAdminStatus: async () => {
    const { user } = get(); // Get instance from state
    if (!user) return false;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const isAdmin = userDoc.data().isAdmin || false;
        // Update the user object in the store if it's different
        if (user.isAdmin !== isAdmin) {
          set({ user: { ...user, isAdmin } });
        }
        return isAdmin;
      }
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  },
  
  // Synchronous check for admin status from current user state
  isAdmin: () => {
    const { user } = get();
    return user?.isAdmin || false;
  },
  
  // Set admin status for a user (admin-only operation)
  setAdminStatus: async (userId, isAdmin) => {
    const { user } = get(); // Get instance from state
    if (!user?.isAdmin) {
      throw new Error("Permission denied.");
    }
    
    try {
      await updateDoc(doc(db, "users", userId), { isAdmin });
      toast.success(`User admin status ${isAdmin ? 'granted' : 'revoked'} successfully`);
      
      // If updating the current user, update the local state
      if (userId === user.uid) {
        set({ user: { ...user, isAdmin } });
      }
    } catch (error: any) {
      toast.error(`Failed to update admin status: ${error.message}`);
      throw error;
    }
  },
  
  // Clear error
  clearError: () => set({ error: null }),
}));

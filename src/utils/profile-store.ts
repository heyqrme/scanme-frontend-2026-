import { create } from "zustand";
import { toast } from "sonner";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { db, storage, auth } from "./firebase";
import { useAuthStore } from "./auth-store";
import { apiClient } from "app";

// Re-export storage from the correct firebase instance
// DEPRECATED: This is now handled in firebase.ts
// export const storage = firebaseAuth ? firebaseAuth.storage : null;

// Define user profile interface
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  location?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  interests?: string[];
  instagram?: string;
  facebook?: string;
  twitter?: string;
  phoneNumber?: string;
  whatsapp?: string;
  tiktok?: string;
  birthdate?: string;
  profileCompleted?: boolean;
  createdAt?: any;
  friends: string[];
  isPrivate?: boolean;
  relationshipStatus?: 'Single' | 'Looking' | 'Just Friends' | 'Taken' | 'Prefer not to say' | null;
  partnerId?: string | null;
  vibe?: 'Rage' | 'Chill' | 'Neon' | 'Dark' | 'Retro' | null;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  appleMusicUrl?: string;
  lastActive?: any; // Timestamp or Date
  veteranStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  veteranProofUrl?: string;
  tapProgress?: {
    preSeparationCounseling?: boolean;
    vaBenefitsBriefing?: boolean;
    capstoneReview?: boolean;
    medicalRecords?: boolean;
    dd214?: boolean;
    resume?: boolean;
    financialPlanning?: boolean;
    employmentWorkshop?: boolean;
  };
}

// Define profile store interface
interface ProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  
  // Initialize/load profile
  loadProfile: (userId: string) => Promise<UserProfile | null>;
  
  // Check if profile exists and is complete
  checkProfileStatus: (userId: string) => Promise<{exists: boolean, isComplete: boolean}>;
  
  // Update profile methods
  updateProfile: (data: Partial<UserProfile>, file?: File | null) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<string>;
  
  // Clear profile state
  clearProfile: () => void;
  clearError: () => void;
}

// Create profile store
export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  isProfileComplete: false,
  
  // Load user profile from Firestore
  loadProfile: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const profileData = userSnap.data() as UserProfile;
        set({ 
          profile: profileData,
          isProfileComplete: profileData.profileCompleted || false,
          isLoading: false 
        });
        return profileData;
      } else {
        set({ profile: null, isProfileComplete: false, isLoading: false });
        return null;
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  // Check if profile exists and is complete
  checkProfileStatus: async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const profileData = userSnap.data() as UserProfile;
        const isComplete = profileData.profileCompleted || false;
        return { exists: true, isComplete };
      } else {
        return { exists: false, isComplete: false };
      }
    } catch (error) {
      console.error("Error checking profile status:", error);
      return { exists: false, isComplete: false };
    }
  },
  
  // Update profile
  updateProfile: async (data, file) => {
    const { user } = useAuthStore.getState();
    
    if (!user || !user.uid) {
      toast.error("You must be logged in to update your profile");
      throw new Error("User not authenticated");
    }
    
    set({ isLoading: true, error: null });
    
    try {
      let photoURL: string | undefined = undefined;

      // Step 1: Upload picture if it exists - use Firebase Storage directly
      if (file) {
        console.log("UPLOAD_DEBUG: Uploading profile picture directly to Firebase Storage...");
        try {
          const timestamp = Date.now();
          const storageRef = ref(storage, `profiles/${user.uid}/${timestamp}_${file.name}`);
          
          console.log("UPLOAD_DEBUG: Uploading to path:", `profiles/${user.uid}/${timestamp}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          photoURL = await getDownloadURL(snapshot.ref);
          console.log("UPLOAD_DEBUG: Upload successful, URL:", photoURL);
        } catch (uploadError: any) {
          console.error("UPLOAD_DEBUG: Firebase Storage upload exception:", uploadError);
          throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
        }
      }
      
      const userRef = doc(db, "users", user.uid);
      
      // Step 2: Prepare all data for update
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      // Add photoURL to data if it was uploaded
      if (photoURL) {
        updateData.photoURL = photoURL;
      }
      
      // Step 3: Update the document in Firestore (create if doesn't exist)
      await setDoc(userRef, updateData, { merge: true });
      
      // Update Firebase Auth profile if needed
      if (auth.currentUser) {
        try {
           const authUpdates: {displayName?: string | null, photoURL?: string | null} = {};
           if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
           if (photoURL) authUpdates.photoURL = photoURL;
           
           if (Object.keys(authUpdates).length > 0) {
             await updateAuthProfile(auth.currentUser, authUpdates);
             
             // Update the auth store to reflect changes immediately
             // We create a new object to trigger state updates
             useAuthStore.setState(state => {
               if (!state.user) return state;
               return {
                 user: { ...state.user, ...authUpdates } as any
               };
             });
           }
        } catch (authError) {
          console.warn("Failed to update Firebase Auth profile:", authError);
          // Non-blocking error
        }
      }

      // Step 4: Optimistically update the profile in the store
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...updateData } : null,
      }));

      toast.success("Profile updated successfully");

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
      // Re-throw the error so the component knows the update failed
      throw error;
    } finally {
      // Step 5: ALWAYS reset loading state
      set({ isLoading: false });
    }
  },
  
  // Upload profile picture (Now primarily a helper, not used by component directly)
  uploadProfilePicture: async (file) => {
    const { user } = useAuthStore.getState();
    
    if (!user || !user.uid) {
      console.error("UPLOAD_DEBUG: User not authenticated at start of upload.");
      throw new Error("User not authenticated");
    }
    
    console.log("UPLOAD_DEBUG: Starting profile picture upload for user:", user.uid);
    
    try {
      // Upload directly to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `profiles/${user.uid}/${timestamp}_${file.name}`);
      
      console.log("UPLOAD_DEBUG: Uploading to path:", `profiles/${user.uid}/${timestamp}_${file.name}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log("UPLOAD_DEBUG: Successfully retrieved download URL:", downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error("UPLOAD_DEBUG: Error during profile picture upload:", error);
      toast.error(`Failed to upload profile picture: ${error.message}`);
      throw error;
    }
  },
  
  // Clear profile
  clearProfile: () => set({ profile: null, isProfileComplete: false }),
  
  // Clear error
  clearError: () => set({ error: null })
}));

// Export a function to check and redirect if profile is incomplete
export const checkAndRedirectProfile = async (userId: string, navigate: any) => {
  const { exists, isComplete } = await useProfileStore.getState().checkProfileStatus(userId);
  
  if (!exists) {
    // If profile doesn't exist, redirect to profile setup
    navigate('/profile-setup');
    return false;
  }
  
  if (!isComplete) {
    // If profile exists but is incomplete, redirect to profile setup
    navigate('/profile-setup');
    return false;
  }
  
  // Profile exists and is complete
  return true;
};

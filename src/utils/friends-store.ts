import { create } from "zustand";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { firestore as db } from "./firebase";
import { useAuthStore } from "./auth-store";
import { useProfileStore, UserProfile } from "./profile-store";
import { apiClient } from "app";
import { APP_BASE_PATH } from "app";
import { PRODUCTION_URL } from "./config";

// Friend request status enum
export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined"
}

// Friend request interface
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt?: Date;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  sender?: {
    displayName: string | null;
    photoURL: string | null;
  };
  receiver?: {
    displayName: string | null;
    photoURL: string | null;
  };
}

// Friend interface (with profile data)
export interface Friend {
  id: string;
  userId: string;
  displayName: string | null;
  photoURL: string | null;
  relationshipStatus?: 'Single' | 'Looking' | 'Just Friends' | null;
  bio?: string;
  tags?: string[];
  addedAt: Date;
  lastActive?: Date;
}

// FriendsStore interface
interface FriendsStore {
  friends: Friend[];
  memberFriends: Friend[];
  sentRequests: FriendRequest[];
  receivedRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Friend list methods
  fetchFriends: () => Promise<Friend[]>;
  fetchMemberFriends: (userId: string) => Promise<Friend[]>;
  fetchFriendById: (friendId: string) => Promise<Friend | null>;
  
  // Friend request methods
  fetchSentRequests: () => Promise<FriendRequest[]>;
  fetchReceivedRequests: () => Promise<FriendRequest[]>;
  subscribeToReceivedRequests: () => () => void;
  
  // Core friendship methods
  sendFriendRequest: (receiverId: string, location?: { lat: number; lng: number; address?: string }) => Promise<FriendRequest | null>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  declineFriendRequest: (requestId: string) => Promise<boolean>;
  cancelFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  
  // QR code friend request handling
  handleQrCodeFriendRequest: (scannedUserId: string, location?: { lat: number; lng: number; address?: string }) => Promise<FriendRequest | null>;
  
  // Utility methods
  clearError: () => void;
  resetState: () => void;
}

// Helper function to convert Firestore data to FriendRequest object
const convertFriendRequest = (doc: any): FriendRequest => {
  const data = doc.data();
  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
    location: data.location,
  };
};

// Create Friends Store
export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends: [],
  memberFriends: [],
  sentRequests: [],
  receivedRequests: [],
  isLoading: false,
  error: null,
  
  // Fetch user's friends
  fetchFriends: async () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to view friends" });
      toast.error("You must be logged in to view friends");
      return [];
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get user profile to access the friends array
      const profileRef = doc(db, "users", user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        set({ isLoading: false, error: "User profile not found" });
        return [];
      }
      
      const profileData = profileSnap.data() as UserProfile;
      const friendIds = profileData.friends || [];
      
      if (friendIds.length === 0) {
        set({ friends: [], isLoading: false });
        return [];
      }
      
      // Fetch each friend's profile
      const friendsData: Friend[] = [];
      
      for (const friendId of friendIds) {
        const friendProfileRef = doc(db, "users", friendId);
        const friendProfileSnap = await getDoc(friendProfileRef);
        
        if (friendProfileSnap.exists()) {
          const friendProfile = friendProfileSnap.data() as UserProfile & { tags?: string[] };
          
          friendsData.push({
            id: friendProfileSnap.id,
            userId: friendProfile.uid,
            displayName: friendProfile.displayName,
            photoURL: friendProfile.photoURL,
            relationshipStatus: friendProfile.relationshipStatus,
            bio: friendProfile.bio,
            tags: friendProfile.tags,
            addedAt: new Date(), // Would be more accurate from a relation collection
            lastActive: friendProfile.lastActive?.toDate(),
          });
        }
      }
      
      set({ friends: friendsData, isLoading: false });
      return friendsData;
    } catch (error: any) {
      console.error("Error fetching friends:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // Fetch another member's friends (public view)
  fetchMemberFriends: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Get target user profile to access the friends array
      const profileRef = doc(db, "users", userId);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        set({ isLoading: false, error: "User profile not found" });
        return [];
      }
      
      const profileData = profileSnap.data() as UserProfile;
      const friendIds = profileData.friends || [];
      
      if (friendIds.length === 0) {
        set({ memberFriends: [], isLoading: false });
        return [];
      }
      
      // Fetch each friend's profile
      const friendsData: Friend[] = [];
      
      for (const friendId of friendIds) {
        const friendProfileRef = doc(db, "users", friendId);
        const friendProfileSnap = await getDoc(friendProfileRef);
        
        if (friendProfileSnap.exists()) {
          const friendProfile = friendProfileSnap.data() as UserProfile & { tags?: string[] };
          
          friendsData.push({
            id: friendProfileSnap.id,
            userId: friendProfile.uid,
            displayName: friendProfile.displayName,
            photoURL: friendProfile.photoURL,
            relationshipStatus: friendProfile.relationshipStatus,
            bio: friendProfile.bio,
            tags: friendProfile.tags,
            addedAt: new Date(), // Not strictly accurate but needed for Friend interface
            lastActive: friendProfile.lastActive?.toDate(),
          });
        }
      }
      
      set({ memberFriends: friendsData, isLoading: false });
      return friendsData;
    } catch (error: any) {
      console.error("Error fetching member friends:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },
  
  // Fetch a specific friend by ID
  fetchFriendById: async (friendId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to view friends" });
      toast.error("You must be logged in to view friends");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Check if this user is actually a friend
      const profileRef = doc(db, "users", user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        set({ isLoading: false, error: "User profile not found" });
        return null;
      }
      
      const profileData = profileSnap.data() as UserProfile;
      const friendIds = profileData.friends || [];
      
      if (!friendIds.includes(friendId)) {
        set({ isLoading: false, error: "This user is not your friend" });
        return null;
      }
      
      // Fetch friend's profile
      const friendProfileRef = doc(db, "users", friendId);
      const friendProfileSnap = await getDoc(friendProfileRef);
      
      if (!friendProfileSnap.exists()) {
        set({ isLoading: false, error: "Friend profile not found" });
        return null;
      }
      
      const friendProfile = friendProfileSnap.data() as UserProfile & { tags?: string[] };
      
      const friend: Friend = {
        id: friendProfileSnap.id,
        userId: friendProfile.uid,
        displayName: friendProfile.displayName,
        photoURL: friendProfile.photoURL,
        relationshipStatus: friendProfile.relationshipStatus,
        bio: friendProfile.bio,
        tags: friendProfile.tags,
        addedAt: new Date(), // Would be more accurate from a relation collection
        lastActive: friendProfile.lastActive?.toDate(),
      };
      
      set({ isLoading: false });
      return friend;
    } catch (error: any) {
      console.error("Error fetching friend:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  // Fetch sent friend requests
  fetchSentRequests: async () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to view friend requests" });
      toast.error("You must be logged in to view friend requests");
      return [];
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Query friend requests where current user is the sender
      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", user.uid),
        where("status", "==", FriendRequestStatus.PENDING)
      );
      
      const querySnapshot = await getDocs(requestsQuery);
      
      // Convert to FriendRequest objects
      const requests: FriendRequest[] = querySnapshot.docs.map(convertFriendRequest);
      
      // Fetch receiver profiles
      const requestsWithProfiles = await Promise.all(requests.map(async (req) => {
        try {
          const userRef = doc(db, "users", req.receiverId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            return {
              ...req,
              receiver: {
                displayName: userData.displayName,
                photoURL: userData.photoURL
              }
            };
          }
        } catch (e) {
          console.error(`Error fetching profile for receiver ${req.receiverId}`, e);
        }
        return req;
      }));
      
      set({ sentRequests: requestsWithProfiles, isLoading: false });
      return requestsWithProfiles;
    } catch (error: any) {
      console.error("Error fetching sent friend requests:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },
  
  // Fetch received friend requests
  fetchReceivedRequests: async () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to view friend requests" });
      toast.error("You must be logged in to view friend requests");
      return [];
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Query friend requests where current user is the receiver
      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("receiverId", "==", user.uid),
        where("status", "==", FriendRequestStatus.PENDING)
      );
      
      const querySnapshot = await getDocs(requestsQuery);
      
      // Convert to FriendRequest objects
      const requests: FriendRequest[] = querySnapshot.docs.map(convertFriendRequest);
      
      // Fetch sender profiles
      const requestsWithProfiles = await Promise.all(requests.map(async (req) => {
        try {
          const userRef = doc(db, "users", req.senderId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            return {
              ...req,
              sender: {
                displayName: userData.displayName,
                photoURL: userData.photoURL
              }
            };
          }
        } catch (e) {
          console.error(`Error fetching profile for sender ${req.senderId}`, e);
        }
        return req;
      }));
      
      set({ receivedRequests: requestsWithProfiles, isLoading: false });
      return requestsWithProfiles;
    } catch (error: any) {
      console.error("Error fetching received friend requests:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // Subscribe to received friend requests
  subscribeToReceivedRequests: () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      return () => {};
    }
    
    const requestsQuery = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid),
      where("status", "==", FriendRequestStatus.PENDING)
    );
    
    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      const requests: FriendRequest[] = snapshot.docs.map(convertFriendRequest);
      
      // Fetch sender profiles
      const requestsWithProfiles = await Promise.all(requests.map(async (req) => {
        try {
          const userRef = doc(db, "users", req.senderId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            return {
              ...req,
              sender: {
                displayName: userData.displayName,
                photoURL: userData.photoURL
              }
            };
          }
        } catch (e) {
          console.error(`Error fetching profile for sender ${req.senderId}`, e);
        }
        return req;
      }));
      
      set({ receivedRequests: requestsWithProfiles });
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for friend requests subscription. User might not be fully authorized yet.", error.message);
      } else {
        console.error("Error subscribing to friend requests:", error);
      }
    });
    
    return unsubscribe;
  },
  
  // Send a friend request
  sendFriendRequest: async (receiverId, location) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to send a friend request" });
      toast.error("You must be logged in to send a friend request");
      return null;
    }
    
    if (user.uid === receiverId) {
      set({ error: "You cannot send a friend request to yourself" });
      toast.error("You cannot send a friend request to yourself");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Check if receiver exists
      const receiverRef = doc(db, "users", receiverId);
      const receiverSnap = await getDoc(receiverRef);
      
      if (!receiverSnap.exists()) {
        set({ error: "User not found", isLoading: false });
        toast.error("User not found");
        return null;
      }
      
      // Check if already friends
      const senderRef = doc(db, "users", user.uid);
      const senderSnap = await getDoc(senderRef);
      
      if (senderSnap.exists()) {
        const senderData = senderSnap.data() as UserProfile;
        const friendIds = senderData.friends || [];
        
        if (friendIds.includes(receiverId)) {
          set({ error: "You are already friends with this user", isLoading: false });
          toast.error("You are already friends with this user");
          return null;
        }
      }
      
      // Check if a request already exists
      const existingRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", user.uid),
        where("receiverId", "==", receiverId),
        where("status", "==", FriendRequestStatus.PENDING)
      );
      
      const existingRequestsSnap = await getDocs(existingRequestsQuery);
      
      if (!existingRequestsSnap.empty) {
        set({ error: "You've already sent a friend request to this user", isLoading: false });
        toast.error("You've already sent a friend request to this user");
        return null;
      }
      
      // Check if they've sent a request to you
      const reverseRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", receiverId),
        where("receiverId", "==", user.uid),
        where("status", "==", FriendRequestStatus.PENDING)
      );
      
      const reverseRequestsSnap = await getDocs(reverseRequestsQuery);
      
      if (!reverseRequestsSnap.empty) {
        set({ error: "This user has already sent you a friend request", isLoading: false });
        toast.error("This user has already sent you a friend request");
        return null;
      }
      
      // Create friend request
      const requestData: Omit<FriendRequest, "id"> = {
        senderId: user.uid,
        receiverId,
        status: FriendRequestStatus.PENDING,
        createdAt: new Date(),
      };

      if (location) {
        requestData.location = location;
      }
      
      const requestRef = doc(collection(db, "friendRequests"));
      await setDoc(requestRef, requestData);
      
      const newRequest: FriendRequest = {
        id: requestRef.id,
        ...requestData
      };
      
      // Update state
      const { sentRequests } = get();
      set({ 
        sentRequests: [...sentRequests, newRequest],
        isLoading: false 
      });
      
      toast.success("Friend request sent");

      // Send email notification (fire and forget)
      try {
        // We already fetched receiver data above
        const receiverData = receiverSnap.data() as UserProfile;
        
        if (receiverData.email) {
          const profileUrl = PRODUCTION_URL || window.location.origin + APP_BASE_PATH;
          
          apiClient.notify_friend_request({
            receiver_email: receiverData.email,
            sender_name: user.displayName || "Someone",
            profile_url: `${profileUrl}/profile?tab=friends`,
            scan_location: location?.address,
            receiver_id: receiverId
          });
        }
      } catch (err) {
        console.error("Failed to trigger notification email", err);
      }

      return newRequest;
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to send friend request: ${error.message}`);
      return null;
    }
  },
  
  // Handle friend request from QR code
  handleQrCodeFriendRequest: async (scannedUserId, location) => {
    return get().sendFriendRequest(scannedUserId, location);
  },
  
  // Accept a friend request
  acceptFriendRequest: async (requestId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to accept a friend request" });
      toast.error("You must be logged in to accept a friend request");
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Call the backend API to handle the acceptance logic securely
      await apiClient.accept_friend_request({ requestId });
      
      // Update state (optimistically remove from received requests)
      const { receivedRequests } = get();
      set({
        receivedRequests: receivedRequests.filter(req => req.id !== requestId),
        isLoading: false
      });
      
      // Reload friends list to get the updated list from backend/firestore
      await get().fetchFriends();
      
      toast.success("Friend request accepted");
      return true;
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to accept friend request: ${error.message}`);
      return false;
    }
  },
  
  // Decline a friend request
  declineFriendRequest: async (requestId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to decline a friend request" });
      toast.error("You must be logged in to decline a friend request");
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get request data
      const requestRef = doc(db, "friendRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        set({ error: "Friend request not found", isLoading: false });
        toast.error("Friend request not found");
        return false;
      }
      
      const requestData = requestSnap.data() as FriendRequest;
      
      // Verify the request is for this user
      if (requestData.receiverId !== user.uid) {
        set({ error: "You cannot decline this friend request", isLoading: false });
        toast.error("You cannot decline this friend request");
        return false;
      }
      
      // Update request status
      await updateDoc(requestRef, {
        status: FriendRequestStatus.DECLINED,
        updatedAt: serverTimestamp(),
      });
      
      // Update state
      const { receivedRequests } = get();
      set({
        receivedRequests: receivedRequests.filter(req => req.id !== requestId),
        isLoading: false
      });
      
      toast.success("Friend request declined");
      return true;
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to decline friend request: ${error.message}`);
      return false;
    }
  },
  
  // Cancel a sent friend request
  cancelFriendRequest: async (requestId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to cancel a friend request" });
      toast.error("You must be logged in to cancel a friend request");
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get request data
      const requestRef = doc(db, "friendRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        set({ error: "Friend request not found", isLoading: false });
        toast.error("Friend request not found");
        return false;
      }
      
      const requestData = requestSnap.data() as FriendRequest;
      
      // Verify the request is from this user
      if (requestData.senderId !== user.uid) {
        set({ error: "You cannot cancel this friend request", isLoading: false });
        toast.error("You cannot cancel this friend request");
        return false;
      }
      
      // Delete the request
      await deleteDoc(requestRef);
      
      // Update state
      const { sentRequests } = get();
      set({
        sentRequests: sentRequests.filter(req => req.id !== requestId),
        isLoading: false
      });
      
      toast.success("Friend request canceled");
      return true;
    } catch (error: any) {
      console.error("Error canceling friend request:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to cancel friend request: ${error.message}`);
      return false;
    }
  },
  
  // Remove a friend
  removeFriend: async (friendId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to remove a friend" });
      toast.error("You must be logged in to remove a friend");
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Remove from user's friends list
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        friends: arrayRemove(friendId)
      });
      
      // Remove from friend's friends list
      const friendRef = doc(db, "users", friendId);
      await updateDoc(friendRef, {
        friends: arrayRemove(user.uid)
      });
      
      // Update state
      const { friends } = get();
      set({
        friends: friends.filter(friend => friend.userId !== friendId),
        isLoading: false
      });
      
      toast.success("Friend removed");
      return true;
    } catch (error: any) {
      console.error("Error removing friend:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to remove friend: ${error.message}`);
      return false;
    }
  },
  
  // Utility methods
  clearError: () => set({ error: null }),
  resetState: () => set({ 
    friends: [], 
    memberFriends: [],
    sentRequests: [], 
    receivedRequests: [], 
    error: null, 
    isLoading: false 
  }),
}));

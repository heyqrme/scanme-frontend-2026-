import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  collection, 
  where,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { firestore as db } from "../utils/firebase";
import { useAuthStore } from "../utils/auth-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageCircleIcon } from "lucide-react";
import { UserProfile } from "../utils/profile-store";
import { usePresenceStore } from "../utils/presence-store";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function PresenceListener() {
  const { user } = useAuthStore();
  const { setOnlineUsers } = usePresenceStore();
  const navigate = useNavigate();
  // Use ref to track online friends without triggering re-renders/re-subscriptions
  const onlineFriendsRef = useRef<Set<string>>(new Set());
  const processingRef = useRef<boolean>(false);
  const initialLoadRef = useRef<boolean>(true);

  // Update my own lastActive status
  useEffect(() => {
    if (!user) return;

    const updateStatus = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          lastActive: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    // Update immediately on mount
    updateStatus();

    // Update periodically
    const interval = setInterval(updateStatus, UPDATE_INTERVAL_MS);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // Listen to friends' status
  useEffect(() => {
    if (!user) return;

    // We listen to users who have me as a friend (reciprocal friendship)
    // This is more efficient than fetching my friend list and then listening to each ID
    const q = query(
      collection(db, "users"),
      where("friends", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const newOnlineFriends = new Set<string>();
      const changes: { id: string; name: string; photoURL: string | null }[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as UserProfile;
        const lastActive = data.lastActive instanceof Timestamp 
          ? data.lastActive.toDate().getTime() 
          : 0;

        const isOnline = (now - lastActive) < ONLINE_THRESHOLD_MS;

        if (isOnline) {
          newOnlineFriends.add(doc.id);

          // If they weren't online before, and this isn't the initial load, track as a change
          if (!onlineFriendsRef.current.has(doc.id) && !initialLoadRef.current) {
             changes.push({
               id: doc.id,
               name: data.displayName || "A friend",
               photoURL: data.photoURL
             });
          }
        }
      });

      onlineFriendsRef.current = newOnlineFriends;
      
      // Update global store
      setOnlineUsers(newOnlineFriends);
      
      initialLoadRef.current = false;

      // Show notifications for new online friends
      // Debounce slightly to avoid flood on reconnect
      if (changes.length > 0 && !processingRef.current) {
        processingRef.current = true;
        
        // Show max 3 notifications at once to avoid spam
        changes.slice(0, 3).forEach((friend) => {
          toast(
            <div className="flex flex-col gap-2 w-full">
              <p className="font-medium text-sm">
                {friend.name} is online
              </p>
              <Button 
                size="sm" 
                variant="default"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 h-8 text-xs"
                onClick={() => {
                  navigate(`/member?id=${friend.id}&action=chat`);
                  toast.dismiss();
                }}
              >
                <MessageCircleIcon className="w-3 h-3 mr-2" />
                Chat Now
              </Button>
            </div>,
            {
              duration: 5000,
              position: "bottom-right",
            }
          );
        });

        setTimeout(() => {
          processingRef.current = false;
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [user, navigate]); // Removed onlineFriends dependency

  return null;
}

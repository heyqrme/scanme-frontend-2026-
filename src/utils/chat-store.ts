import { create } from "zustand";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from "firebase/firestore";
import { firestore as db } from "./firebase";
import { useAuthStore } from "./auth-store";

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  updatedAt: Date;
  isUnread?: boolean;
}

interface ChatStore {
  activeChatId: string | null;
  messages: Message[];
  chats: Chat[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setActiveChat: (chatId: string | null) => void;
  getChatId: (friendId: string) => string;
  createChatIfNotExists: (friendId: string) => Promise<string>;
  
  // Real-time subscriptions
  subscribeToMessages: (chatId: string) => Unsubscribe;
  subscribeToChats: (onMessage?: (senderId: string, content: string) => void) => Unsubscribe;
  
  // Message operations
  sendMessage: (chatId: string, content: string) => Promise<boolean>;
  markAsRead: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeChatId: null,
  messages: [],
  chats: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  
  setActiveChat: (chatId) => {
    set({ activeChatId: chatId });
    // If opening a chat, mark it as read immediately
    if (chatId) {
      get().markAsRead(chatId);
    }
  },
  
  getChatId: (friendId) => {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("User not authenticated");
    
    // Create a consistent chat ID by sorting user IDs
    const participants = [user.uid, friendId].sort();
    return `${participants[0]}_${participants[1]}`;
  },
  
  createChatIfNotExists: async (friendId) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error("You must be logged in to chat");
      throw new Error("User not authenticated");
    }
    
    const chatId = get().getChatId(friendId);
    const chatRef = doc(db, "chats", chatId);
    
    try {
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, friendId],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      
      return chatId;
    } catch (error: any) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat");
      throw error;
    }
  },
  
  subscribeToMessages: (chatId) => {
    set({ isLoading: true, messages: [] });
    
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
        };
      });
      
      set({ messages, isLoading: false });
    }, (error) => {
      console.error("Error subscribing to messages:", error);
      set({ error: error.message, isLoading: false });
    });
    
    return unsubscribe;
  },
  
  subscribeToChats: (onMessage) => {
    const { user } = useAuthStore.getState();
    if (!user) return () => {};
    
    if (!db) {
      console.error("Firestore db is not initialized in chat-store");
      return () => {};
    }

    try {
      set({ isLoading: true }); // Set loading state when subscription starts
      
      const chatsRef = collection(db, "chats");
      // Removing orderBy for now to avoid potential index/permission issues
      const q = query(
        chatsRef, 
        where("participants", "array-contains", user.uid)
      );
      
      let isFirstRun = true;

      const unsubscribe = onSnapshot(q, (snapshot) => {
        
        // Check for new messages to notify
        if (!isFirstRun && onMessage) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data();
              const lastMsg = data.lastMessage;
              
              // Notify if:
              // 1. There is a last message
              // 2. It wasn't sent by me
              // 3. The chat is not currently active (open)
              const { activeChatId } = useChatStore.getState();
              
              if (lastMsg && lastMsg.senderId !== user.uid && activeChatId !== change.doc.id) {
                onMessage(lastMsg.senderId, lastMsg.content);
              }
            }
          });
        }

        const chats: Chat[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const lastReadMap = data.lastRead || {};
          const myLastRead = lastReadMap[user.uid]?.toDate() || new Date(0);
          
          // If timestamp is null (pending write), treat it as "now" so it bubbles up and counts as unread
          const lastMsgTime = data.lastMessage?.timestamp?.toDate() || new Date();
          
          // A chat is unread if:
          // 1. It has a last message
          // 2. The last message was not sent by me
          // 3. The last message is newer than my last read time
          // 4. The chat is not currently active
          const isUnread = !!data.lastMessage && 
                           data.lastMessage.senderId !== user.uid && 
                           lastMsgTime > myLastRead;

          return {
            id: doc.id,
            participants: data.participants,
            lastMessage: data.lastMessage ? {
              content: data.lastMessage.content,
              senderId: data.lastMessage.senderId,
              timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
            } : undefined,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            isUnread
          };
        });
        
        // Sort client-side instead
        chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        
        // Calculate total unread count
        // Exclude the currently active chat from the count
        const { activeChatId } = useChatStore.getState();
        const unreadCount = chats.filter(c => c.isUnread && c.id !== activeChatId).length;
        
        set({ chats, unreadCount, isLoading: false }); // Clear loading state
        isFirstRun = false;
      }, (error) => {
        if (error.code === 'permission-denied') {
          console.warn("Permission denied for chat subscription. User might not be fully authorized yet.", error.message);
        } else {
          console.error("Error subscribing to chats:", error);
        }
        set({ isLoading: false }); // Clear loading state on error
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up chat subscription:", error);
      set({ isLoading: false }); // Clear loading state on setup error
      return () => {};
    }
  },
  
  sendMessage: async (chatId, content) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error("You must be logged in to send messages");
      return false;
    }
    
    if (!content.trim()) return false;
    
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const chatRef = doc(db, "chats", chatId);
      
      // Add message
      await addDoc(messagesRef, {
        senderId: user.uid,
        content: content.trim(),
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update chat with last message
      await updateDoc(chatRef, {
        lastMessage: {
          content: content.trim(),
          senderId: user.uid,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }
  },
  
  markAsRead: async (chatId) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        [`lastRead.${user.uid}`]: serverTimestamp()
      });
      
      // Optimistically update local state
      set(state => {
        const updatedChats = state.chats.map(chat => {
          if (chat.id === chatId) {
            return { ...chat, isUnread: false };
          }
          return chat;
        });
        
        return {
          chats: updatedChats,
          unreadCount: updatedChats.filter(c => c.isUnread).length
        };
      });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  }
}));

import React, { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "../utils/chat-store";
import { useFriendsStore } from "../utils/friends-store";
import { useAuthStore } from "../utils/auth-store";
import { formatDistanceToNow } from "date-fns";
import { ChatDialog } from "./ChatDialog";
import { MessageCircleIcon } from "lucide-react";
import { format } from "date-fns";
import { getAvatarFallbackText, getRelationshipGradientClass, getSafeImageUrl } from "../utils/avatar-utils";

interface MessagesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessagesSheet({ isOpen, onClose }: MessagesSheetProps) {
  const user = useAuthStore(state => state.user);
  const chats = useChatStore(state => state.chats);
  const isLoading = useChatStore(state => state.isLoading);
  const friends = useFriendsStore(state => state.friends);
  const fetchFriends = useFriendsStore(state => state.fetchFriends);
  
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const hasFetchedRef = useRef(false);

  // Ensure friends are loaded when sheet opens, but only once per open
  React.useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      fetchFriends();
      hasFetchedRef.current = true;
    } else if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen, fetchFriends]);

  // Filter valid chats and map to display data
  const displayChats = React.useMemo(() => {
    if (!isOpen) return [];
    
    try {
      return chats.map(chat => {
        if (!chat.participants || !Array.isArray(chat.participants)) return null;
        
        const friendId = chat.participants.find(id => id !== user?.uid);
        if (!friendId) return null;
        
        const friend = friends.find(f => f.userId === friendId);
        
        // If friend not found in store (maybe not loaded yet), use placeholder or basic info if available
        // For now we'll skip if friend details aren't available, but in real app we'd fetch them
        return {
          chatId: chat.id,
          friendId,
          friend,
          lastMessage: chat.lastMessage,
          updatedAt: chat.updatedAt,
          isUnread: chat.isUnread
        };
      }).filter(Boolean);
    } catch (err) {
      console.error("Error mapping chats:", err);
      return [];
    }
  }, [chats, friends, user, isOpen]);

  const handleChatClick = (chat: any) => {
    if (chat.friend) {
      setSelectedFriend(chat.friend);
      setIsChatOpen(true);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md bg-gray-900 border-gray-800 text-white p-0">
          <SheetHeader className="p-6 border-b border-gray-800">
            <SheetTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Messages
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              Your recent conversations
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="flex flex-col p-4 space-y-2">
              {isLoading && chats.length === 0 ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/20 animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-gray-700/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-gray-700/50 rounded" />
                      <div className="h-3 w-3/4 bg-gray-700/50 rounded" />
                    </div>
                  </div>
                ))
              ) : displayChats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircleIcon className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-2">Start a conversation from the Members page</p>
                </div>
              ) : (
                displayChats.map((chat: any) => (
                  <div
                    key={chat.chatId}
                    onClick={() => handleChatClick(chat)}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                      chat.isUnread 
                        ? "bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30" 
                        : "bg-gray-800/30 border border-transparent hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border border-gray-700">
                        <AvatarImage src={getSafeImageUrl(chat.friend?.photoURL)} />
                        <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(chat.friend?.relationshipStatus)} text-white`}>
                          {getAvatarFallbackText(chat.friend?.displayName, chat.friend?.relationshipStatus)}
                        </AvatarFallback>
                      </Avatar>
                      {chat.isUnread && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-purple-500 rounded-full border-2 border-black"></span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className={`truncate text-sm font-medium ${chat.isUnread ? 'text-white' : 'text-gray-300'}`}>
                          {chat.friend?.displayName || "Unknown User"}
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${chat.isUnread ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                        {chat.lastMessage?.senderId === user?.uid && "You: "}
                        {chat.lastMessage?.content || "No messages"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Chat Dialog */}
      {selectedFriend && (
        <ChatDialog
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedFriend(null);
          }}
          friend={{
            id: selectedFriend.id || selectedFriend.userId, // Handle both friend object formats
            userId: selectedFriend.userId,
            displayName: selectedFriend.displayName,
            photoURL: selectedFriend.photoURL,
            addedAt: selectedFriend.addedAt || new Date()
          }}
        />
      )}
    </>
  );
}

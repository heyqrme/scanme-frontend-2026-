import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, LoaderIcon, X } from "lucide-react";
import { useChatStore } from "utils/chat-store";
import { useAuthStore } from "utils/auth-store";
import { Friend } from "utils/friends-store";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
}

export function ChatDialog({ isOpen, onClose, friend }: ChatDialogProps) {
  const { user } = useAuthStore();
  const { 
    createChatIfNotExists, 
    subscribeToMessages, 
    sendMessage, 
    messages, 
    isLoading,
    setActiveChat
  } = useChatStore();
  
  const [messageText, setMessageText] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Initialize chat when dialog opens
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    
    const initChat = async () => {
      if (isOpen && friend && user) {
        try {
          const id = await createChatIfNotExists(friend.userId);
          setChatId(id);
          setActiveChat(id);
          unsubscribe = subscribeToMessages(id);
        } catch (error) {
          console.error("Failed to init chat:", error);
        }
      }
    };
    
    initChat();
    
    return () => {
      unsubscribe();
      setChatId(null);
      setActiveChat(null);
    };
  }, [isOpen, friend, user, createChatIfNotExists, subscribeToMessages, setActiveChat]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!chatId || !messageText.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(chatId, messageText);
      setMessageText("");
    } finally {
      setIsSending(false);
    }
  };
  
  if (!friend) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gray-950 border-gray-800 text-white p-0 overflow-hidden h-[600px] flex flex-col">
        <DialogHeader className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm z-10">
          <DialogTitle className="sr-only">Chat with {friend?.displayName || "Friend"}</DialogTitle>
          <DialogDescription className="sr-only">
            Conversation history and messaging with {friend?.displayName || "your friend"}.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-purple-500/50">
                <AvatarImage src={getSafeImageUrl(friend.photoURL)} />
                <AvatarFallback className="bg-purple-900 text-purple-200">
                  {friend.displayName?.substring(0, 2).toUpperCase() || "FR"}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-white">{friend.displayName || "Friend"}</DialogTitle>
                <DialogDescription className="text-xs text-gray-400">
                  Chat conversation
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4 pb-4">
            {isLoading && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <LoaderIcon className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No messages yet.</p>
                <p className="text-sm">Say hello to {friend.displayName}!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isMe 
                          ? "bg-purple-600 text-white rounded-tr-none" 
                          : "bg-gray-800 text-gray-100 rounded-tl-none"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? "text-purple-200" : "text-gray-400"}`}>
                        {format(msg.timestamp, "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              name="message"
              id="message-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="bg-gray-800 border-gray-700 text-white focus-visible:ring-purple-500"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!messageText.trim() || isSending || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
            >
              {isSending ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

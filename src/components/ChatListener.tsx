import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../utils/auth-store";
import { useChatStore } from "../utils/chat-store";

export function ChatListener() {
  const navigate = useNavigate();
  const { subscribeToChats } = useChatStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (user) {
      try {
        unsubscribe = subscribeToChats((senderId, content) => {
          toast.info("New message received", {
            description: content.length > 30 ? content.substring(0, 30) + "..." : content,
            action: {
              label: "View",
              onClick: () => navigate(`/member?id=${senderId}`)
            }
          });
        });
      } catch (error) {
        console.error("Failed to subscribe to chats:", error);
      }
    }
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user, subscribeToChats, navigate]);

  return null;
}

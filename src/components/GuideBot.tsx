import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleHelp, X, Send, MessageCircle, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "app";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useGuideStore } from "utils/guide-store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function GuideBot() {
  const { isOpen, setIsOpen } = useGuideStore();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hi! I'm your AI Helper. Ask me anything about friends, QR codes, or the store!" 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Add user message
    const newHistory = [...messages, { role: "user", content: userMsg } as Message];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Call backend
      const response = await apiClient.chat_with_guide({ 
        message: userMsg,
        history: messages 
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("GuideBot Error:", error);
      toast.error("Sorry, I couldn't reach the guide server right now.");
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Do not show on auth pages if desired, but user said "new users" so maybe yes?
  // I'll keep it everywhere for now.

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className="w-[350px] md:w-[400px] h-[500px] flex flex-col shadow-2xl border-purple-500/30 bg-gray-900/95 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-purple-900/80 to-blue-900/80 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
                    <div className="relative h-10 w-10 bg-black rounded-full flex items-center justify-center border border-white/20">
                      <CircleHelp className="h-6 w-6 text-cyan-400" />
                    </div>
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-black transform translate-x-1/4 translate-y-1/4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">AI Helper</h3>
                    <p className="text-[10px] text-cyan-200 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Powered
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Chat Area */}
              <ScrollArea className="flex-1 p-4 bg-black/20">
                <div className="flex flex-col gap-4">
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                          msg.role === 'user' 
                            ? 'bg-purple-600 text-white rounded-tr-none' 
                            : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
                        }`}
                      >
                         {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 bg-gray-900 border-t border-white/10">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                  <Input 
                    name="query"
                    id="guide-query"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about features..." 
                    className="pr-10 bg-black/40 border-gray-700 focus-visible:ring-purple-500/50 text-white"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="absolute right-1 top-1 bottom-1 h-8 w-8 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all"
                    disabled={!input.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

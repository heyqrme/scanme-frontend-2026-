import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "components/Logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "utils/auth-store";
import { usePostStore } from "utils/post-store";
import { useEventStore } from "utils/event-store";
import { MomentsPost } from "@/components/MomentsPost";
import { MomentsEvent } from "@/components/MomentsEvent";
import { Loader2, ArrowUp, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

function FeedErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black text-white p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Something went wrong with the feed</h2>
      <p className="text-gray-400 mb-6 max-w-md text-sm font-mono bg-gray-900 p-2 rounded border border-gray-800 overflow-auto">
        {error.message}
      </p>
      <Button 
        onClick={resetErrorBoundary}
        className="bg-purple-600 hover:bg-purple-700"
      >
        Try Again
      </Button>
    </div>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { posts, isLoading: postsLoading, fetchAllPosts } = usePostStore();
  const { events, isLoading: eventsLoading, fetchEvents } = useEventStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllPosts();
    fetchEvents();
  }, [fetchAllPosts, fetchEvents]);

  const feedItems = useMemo(() => {
    const postItems = posts.map(post => {
      // Use created date for sorting, safely handling invalid dates
      let date = new Date(post.createdAt).getTime();
      if (isNaN(date)) date = Date.now();

      return {
        type: 'post' as const,
        data: post,
        date
      };
    });

    const eventItems = events.map(event => {
      // Use event date for sorting (future events appear at top)
      let date = new Date(event.date).getTime();
      if (isNaN(date)) date = Date.now(); 
      
      return {
        type: 'event' as const,
        data: event,
        date
      };
    });

    // Combine and sort descending (newest/furthest future first)
    return [...postItems, ...eventItems].sort((a, b) => b.date - a.date);
  }, [posts, events]);

  const isLoading = postsLoading || eventsLoading;

  // Simple intersection observer to track active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-black h-[calc(100dvh-4rem)] w-full overflow-hidden relative">
      {/* HeaderNavigation is already in AppProvider */}
      
      <ErrorBoundary FallbackComponent={FeedErrorFallback} onReset={() => window.location.reload()}>
        {/* Feed Container */}
        <div 
          ref={containerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading && feedItems.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 snap-start">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
              <p className="text-gray-400 animate-pulse">Loading your feed...</p>
            </div>
          ) : feedItems.length > 0 ? (
            feedItems.map((item, index) => (
              <div key={`${item.type}-${item.data.id}`} className="w-full h-full snap-start shrink-0">
                  {item.type === 'post' ? (
                    <MomentsPost 
                      post={item.data} 
                      isActive={index === activeIndex} 
                    />
                  ) : (
                    <MomentsEvent 
                      event={item.data} 
                      isActive={index === activeIndex} 
                    />
                  )}
              </div>
            ))
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 snap-start p-8 text-center">
              <div className="bg-gray-800/50 p-8 rounded-2xl backdrop-blur-sm border border-gray-700 max-w-sm">
                  <h2 className="text-2xl font-bold text-white mb-2">It's quiet here...</h2>
                  <p className="text-gray-400 mb-6">No posts or events yet. Be the first to light up the feed!</p>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 h-12 text-lg font-medium"
                    onClick={() => navigate('/profile')}
                  >
                    Create a Post
                  </Button>
              </div>
            </div>
          )}

          {/* End of Feed Indicator */}
          {!isLoading && feedItems.length > 0 && (
               <div className="h-40 w-full snap-start flex flex-col items-center justify-center bg-black text-gray-500 pb-20">
                  <p className="mb-2">You're all caught up!</p>
                  <ArrowUp className="w-6 h-6 animate-bounce opacity-50" />
               </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}

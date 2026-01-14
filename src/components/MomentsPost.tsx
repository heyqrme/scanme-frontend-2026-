import React, { useState } from "react";
import { format } from "date-fns";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { usePostStore, Post } from "utils/post-store";
import { useAuthStore } from "utils/auth-store";
import { isVideoUrl, isYouTubeUrl } from "utils/url-helpers";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { SafeVideoPlayer } from "@/components/SafeVideoPlayer";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface MomentsPostProps {
  post: Post;
  isActive: boolean;
}

// Helper for safe date formatting
const safeFormat = (date: any, formatStr: string) => {
  try {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    return format(dateObj, formatStr);
  } catch (e) {
    console.error("Date formatting error:", e);
    return "";
  }
};

export function MomentsPost({ post, isActive }: MomentsPostProps) {
  const { user } = useAuthStore();
  const { likePost, unlikePost, addComment, deleteComment } = usePostStore();
  
  // Debug log
  // console.log(`Rendering post ${post.id}, isLiked: ${user ? post.likes.includes(user.uid) : false}, user: ${user ? user.uid : 'null'}`);
  
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  // Track double tap for like animation
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const isLiked = user ? post.likes.includes(user.uid) : false;
  const isAuthor = user ? post.authorId === user.uid : false;

  const handleLike = async () => {
    console.log("handleLike clicked", { postId: post.id, userId: user?.uid, isLiked });
    if (!user) {
      toast.error("Please login to like posts");
      return;
    }
    
    // Trigger heart animation
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);

    try {
      if (isLiked) {
        console.log("Unliking post...");
        await unlikePost(post.id);
      } else {
        console.log("Liking post...");
        await likePost(post.id);
      }
    } catch (error) {
      console.error("Error in handleLike:", error);
      toast.error("Failed to update like status");
    }
  };

  const handleDoubleTap = () => {
    console.log("handleDoubleTap triggered");
    if (!isLiked) {
      handleLike();
    } else {
        // Just show animation if already liked
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleAddComment submitted", { newComment, user: user?.uid });
    
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      await addComment(post.id, newComment);
      setNewComment("");
    } catch (error) {
      console.error("Error in handleAddComment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this comment?")) {
      await deleteComment(post.id, commentId);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.authorName}`,
          text: post.content,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const safeImageURL = getSafeImageUrl(post.imageURL);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden snap-start shrink-0">
      {/* Background/Media Layer */}
      <div className="absolute inset-0 bg-gray-900" onDoubleClick={handleDoubleTap}>
        {safeImageURL ? (
          (isVideoUrl(safeImageURL) || isYouTubeUrl(safeImageURL)) ? (
             <div className="w-full h-full pointer-events-none">
               <SafeVideoPlayer
                 url={safeImageURL}
                 playing={isActive}
                 muted={isMuted}
                 loop={true}
                 controls={false}
                 width="100%"
                 height="100%"
                 config={{
                   file: {
                     attributes: {
                       style: { objectFit: 'cover', width: '100%', height: '100%' }
                     }
                   },
                   youtube: {
                     playerVars: { 
                       showinfo: 0,
                       controls: 0,
                       modestbranding: 1,
                       rel: 0
                     }
                   }
                 }}
               />
             </div>
          ) : (
            <img 
              src={safeImageURL} 
              alt="Post content" 
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
            />
          )
        ) : (
            // Fallback for text-only posts - nice gradient background
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center p-8">
                 <p className="text-2xl md:text-4xl font-bold text-center text-white leading-relaxed">
                    {post.content.length > 200 ? post.content.substring(0, 200) + "..." : post.content}
                 </p>
            </div>
        )}
        
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* Volume Control */}
      {(isVideoUrl(post.imageURL) || isYouTubeUrl(post.imageURL)) && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="absolute top-24 right-4 z-40 p-2 bg-black/40 rounded-full text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* Double Tap Heart Animation */}
      <AnimatePresence>
        {showLikeAnimation && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="w-32 h-32 fill-white text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Overlay - Bottom Left */}
      <div className="absolute bottom-20 left-4 right-16 z-10 pointer-events-none text-shadow-sm">
         <div className="flex items-center gap-3 mb-3 pointer-events-auto cursor-pointer" onClick={() => { /* Navigate to profile */ }}>
            <Avatar className="w-10 h-10 border-2 border-white/20">
                <AvatarImage src={getSafeImageUrl(post.authorPhotoURL)} />
                <AvatarFallback className="bg-purple-600 text-white">
                    {post.authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg drop-shadow-md">@{post.authorName}</span>
              {post.isSensitive && (
                <Badge variant="destructive" className="text-[10px] px-1 h-5 border-none">
                  18+
                </Badge>
              )}
            </div>
         </div>

         <div className="pointer-events-auto">
             {safeImageURL && (
                 <p className="text-gray-100 text-sm md:text-base line-clamp-3 mb-1">
                     {post.content}
                 </p>
             )}
             <p className="text-xs text-gray-400">{safeFormat(post.createdAt, 'PPp')}</p>
         </div>
      </div>

      {/* Action Sidebar - Bottom Right */}
      <div className="absolute bottom-24 right-2 z-50 flex flex-col gap-6 items-center">
        <div className="flex flex-col items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm h-12 w-12 text-white cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  handleLike();
                }}
            >
                <Heart className={`h-7 w-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </Button>
            <span className="text-xs font-medium text-white drop-shadow-md">{post.likes.length}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
            <Drawer>
                <DrawerTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm h-12 w-12 text-white"
                    >
                        <MessageCircle className="h-7 w-7 text-white" />
                    </Button>
                </DrawerTrigger>
                <span className="text-xs font-medium text-white drop-shadow-md">{post.comments.length}</span>
                
                <DrawerContent className="bg-gray-900 border-t border-gray-800 max-h-[80vh]">
                    <div className="mx-auto w-full max-w-md">
                        <DrawerHeader>
                            <DrawerTitle className="text-white">Comments ({post.comments.length})</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4 h-[50vh] overflow-y-auto space-y-4">
                             {post.comments.length > 0 ? (
                                post.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 text-white">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={getSafeImageUrl(comment.authorPhotoURL)} />
                                            <AvatarFallback className="bg-gray-700">{comment.authorName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-300">{comment.authorName}</span>
                                                <span className="text-xs text-gray-500">{safeFormat(comment.createdAt, 'MMM d')}</span>
                                            </div>
                                            <p className="text-sm text-gray-300">{comment.content}</p>
                                        </div>
                                         {(user && (user.uid === comment.authorId || isAuthor)) && (
                                            <button 
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-gray-500 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                     <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                                     <p>No comments yet</p>
                                 </div>
                             )}
                        </div>
                        <DrawerFooter className="pt-2 pb-8">
                            {user ? (
                                <form onSubmit={handleAddComment} className="flex gap-2">
                                    <Input 
                                        name="comment"
                                        id={`moment-comment-${post.id}`}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..." 
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                    <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmittingComment}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            ) : (
                                <Button disabled className="w-full">Login to comment</Button>
                            )}
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>

        <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm h-12 w-12 text-white"
            onClick={handleShare}
        >
            <Share2 className="h-7 w-7 text-white" />
        </Button>
        
        <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm h-12 w-12 text-white"
        >
            <MoreHorizontal className="h-7 w-7 text-white" />
        </Button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { format } from "date-fns";
import { HeartIcon, MessageCircleIcon, PencilIcon, TrashIcon, ShareIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePostStore, Post, Comment } from "utils/post-store";
import { useAuthStore } from "utils/auth-store";
import { isVideoUrl, isYouTubeUrl } from "utils/url-helpers";
import { toast } from "sonner";
import { SafeVideoPlayer } from "@/components/SafeVideoPlayer";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onEdit?: (post: Post) => void;
}

export function PostCard({ post, onDelete, onEdit }: PostCardProps) {
  const { user } = useAuthStore();
  const { likePost, unlikePost, addComment, deleteComment } = usePostStore();
  
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isLiked = user ? post.likes.includes(user.uid) : false;
  const isAuthor = user ? post.authorId === user.uid : false;

  const handleToggleLike = async () => {
    if (!user) {
      toast.error("Please login to like posts");
      return;
    }
    
    if (isLiked) {
      await unlikePost(post.id);
    } else {
      await likePost(post.id);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    await addComment(post.id, newComment);
    setNewComment("");
    setIsSubmittingComment(false);
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

  return (
    <Card className="bg-gray-800/40 border-gray-700 mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getSafeImageUrl(post.authorPhotoURL)} alt={post.authorName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                {post.authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{post.authorName}</CardTitle>
                {post.isSensitive && (
                  <Badge variant="destructive" className="text-[10px] px-1 h-5">
                    18+
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {format(post.createdAt, 'PPp')}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-1">
            {isAuthor && (
              <>
                {onEdit && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => onEdit(post)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                    onClick={() => onDelete(post.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-100 whitespace-pre-line">{post.content}</p>
        {post.imageURL && (
          <div className="mt-3 rounded-lg overflow-hidden bg-black/20">
            {(isVideoUrl(post.imageURL) || isYouTubeUrl(post.imageURL)) ? (
              <div className="w-full aspect-video">
                <SafeVideoPlayer 
                  url={post.imageURL}
                  controls={true}
                  width="100%"
                  height="100%"
                  playsinline={true}
                />
              </div>
            ) : (
              <img 
                src={post.imageURL} 
                alt="Post image" 
                className="w-full h-auto object-cover max-h-[500px]"
                loading="lazy"
              />
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-3 flex flex-col items-start w-full">
        <div className="flex items-center space-x-4 w-full border-t border-gray-700/50 pt-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center space-x-1 ${isLiked ? 'text-pink-500 hover:text-pink-600' : 'text-gray-400 hover:text-pink-500'}`}
            onClick={handleToggleLike}
          >
            <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{post.likes.length || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center space-x-1 ${showComments ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircleIcon className="h-4 w-4" />
            <span>{post.comments.length || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center space-x-1 text-gray-400 hover:text-white ml-auto"
            onClick={handleShare}
          >
            <ShareIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Comments Section */}
        {showComments && (
          <div className="w-full mt-4 space-y-4">
            {post.comments.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 bg-gray-900/30 p-3 rounded-lg">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={getSafeImageUrl(comment.authorPhotoURL)} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-purple-600 to-blue-600">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-gray-300">{comment.authorName}</span>
                        <span className="text-xs text-gray-500">{format(comment.createdAt, 'MMM d, p')}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                    </div>
                    {(user && (user.uid === comment.authorId || isAuthor)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-red-500"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">No comments yet. Be the first!</p>
            )}
            
            {user && (
              <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
                <Input
                  name="comment"
                  id={`comment-${post.id}`}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-gray-900/50 border-gray-700"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Post
                </Button>
              </form>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Heart, MessageCircle, Share2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/utils/auth-store";
import { toast } from "sonner";
import { 
  getVideosByCategory, 
  getAllVideos, 
  uploadVideo, 
  likeVideo, 
  unlikeVideo, 
  shareVideo,
  type Video,
  type VideoCategory 
} from "@/services/flipService";
import { FlipLogoAnimated } from "@/components/FlipLogo";

// Video categories with emojis and colors
const CATEGORIES = [
  { id: "laugh" as VideoCategory, label: "Laugh", emoji: "😂", color: "#FFD700" },
  { id: "cry" as VideoCategory, label: "Cry", emoji: "😢", color: "#4A90E2" },
  { id: "shock" as VideoCategory, label: "Shock", emoji: "😱", color: "#FF6B6B" },
  { id: "pets" as VideoCategory, label: "Pets", emoji: "🐾", color: "#50C878" },
] as const;

type Category = VideoCategory;

export default function Flip() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [isPlaying, setIsPlaying] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showWheel, setShowWheel] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuthStore();

  // Fetch videos when category changes
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const fetchedVideos = selectedCategory === "all" 
          ? await getAllVideos(50)
          : await getVideosByCategory(selectedCategory, 50);
        setVideos(fetchedVideos);
        setCurrentVideoIndex(0);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast.error("Failed to load videos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [selectedCategory]);

  // Keep wheel visible when no videos
  useEffect(() => {
    if (videos.length === 0) {
      setShowWheel(true);
    } else {
      // Auto-hide wheel after selection when there are videos
      const timer = setTimeout(() => setShowWheel(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, videos.length]);

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "down" && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else if (direction === "up" && currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) handleScroll("down");
      else handleScroll("up");
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentVideoIndex, videos.length]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Minimalist Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <FlipLogoAnimated className="h-6 w-6 text-white" />
          <h1 className="text-xl font-bold text-white">Flip</h1>
        </div>
      </div>

      {/* Vertical Category Wheel - Right Side */}
      <AnimatePresence>
        {showWheel && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <VerticalCategoryWheel
              categories={CATEGORIES}
              selected={selectedCategory}
              onSelect={(cat) => {
                setSelectedCategory(cat);
                setCurrentVideoIndex(0);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Toggle Button - Top Right */}
      <motion.button
        onClick={() => setShowWheel(!showWheel)}
        className="absolute top-16 right-4 z-30 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-2xl">
          {CATEGORIES.find(c => c.id === selectedCategory)?.emoji || "🎬"}
        </span>
      </motion.button>

      {/* Flip Navigation Arrows */}
      {!loading && videos.length > 0 && (
        <>
          {currentVideoIndex > 0 && (
            <motion.button
              onClick={() => handleScroll("up")}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
          )}
          
          {currentVideoIndex < videos.length - 1 && (
            <motion.button
              onClick={() => handleScroll("down")}
              className="absolute bottom-1/3 left-1/2 -translate-x-1/2 z-30 w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          )}
        </>
      )}

      {/* Floating Upload Button - Bottom Right */}
      {user && (
        <motion.button
          onClick={() => setShowUpload(true)}
          className="absolute bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Upload className="w-6 h-6" />
        </motion.button>
      )}

      {/* Video Feed */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-lg">Loading videos...</div>
            </div>
          ) : videos.length > 0 ? (
            <motion.div
              key={currentVideoIndex}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <VideoPlayer
                video={videos[currentVideoIndex]}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                videoRef={videoRef}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <p className="text-white text-lg">No videos yet in this category</p>
              {user && (
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Be the first to upload!
                </Button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Category Wheel Component - Spinning Carousel
function CategoryWheel({ 
  categories, 
  selected, 
  onSelect 
}: { 
  categories: typeof CATEGORIES;
  selected: Category | "all";
  onSelect: (cat: Category | "all") => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const allCategories = [{ id: "all" as const, label: "All", emoji: "🎬", color: "#9333EA" }, ...categories];
  
  const selectedIndex = allCategories.findIndex(c => c.id === selected);
  const targetRotation = -(selectedIndex * (360 / allCategories.length));

  useEffect(() => {
    setRotation(targetRotation);
  }, [targetRotation]);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startX;
    setRotation(prev => prev + delta * 0.5);
    setStartX(clientX);
  };

  const handleEnd = () => {
    setIsDragging(false);
    
    // Snap to nearest category
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const segmentAngle = 360 / allCategories.length;
    const nearestIndex = Math.round(normalizedRotation / segmentAngle) % allCategories.length;
    const snapRotation = nearestIndex * segmentAngle;
    
    setRotation(snapRotation);
    
    // Select the category at top position (accounting for reversed rotation)
    const categoryIndex = (allCategories.length - Math.round(snapRotation / segmentAngle)) % allCategories.length;
    onSelect(allCategories[categoryIndex].id);
  };

  return (
    <div className="absolute bottom-20 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Selection Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full z-50 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-4 border-white/30 rounded-full z-40" />
        
        {/* Spinning Wheel */}
        <motion.div
          ref={wheelRef}
          className="relative w-64 h-64 mx-auto cursor-grab active:cursor-grabbing"
          animate={{ rotate: rotation }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
        >
          {/* Wheel Background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-xl shadow-2xl border-4 border-white/20" />
          
          {/* Category Segments */}
          {allCategories.map((cat, index) => {
            const angle = (index * 360) / allCategories.length;
            const isActive = cat.id === selected;
            
            return (
              <div
                key={cat.id}
                className="absolute inset-0"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-4">
                  <motion.div
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                      isActive ? "scale-125" : "scale-100"
                    }`}
                    style={{
                      backgroundColor: isActive ? cat.color : "rgba(255,255,255,0.1)",
                      border: isActive ? `3px solid ${cat.color}` : "2px solid rgba(255,255,255,0.3)",
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-3xl transform" style={{ transform: `rotate(-${rotation + angle}deg)` }}>
                      {cat.emoji}
                    </span>
                  </motion.div>
                </div>
              </div>
            );
          })}
          
          {/* Center Hub */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">SPIN</span>
            </div>
          </div>
        </motion.div>

        {/* Category Label */}
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-2 mx-auto w-fit"
        >
          <p className="text-white font-bold text-lg">
            {allCategories.find(c => c.id === selected)?.label || "All"}
          </p>
        </motion.div>

        {/* Swipe Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.5 }}
          className="text-white/60 text-center text-sm mt-2"
        >
          🔄 Spin or tap to select category
        </motion.p>
      </div>
    </div>
  );
}

// Vertical Category Wheel Component - Mobile Optimized
function VerticalCategoryWheel({ 
  categories, 
  selected, 
  onSelect 
}: { 
  categories: typeof CATEGORIES;
  selected: Category | "all";
  onSelect: (cat: Category | "all") => void;
}) {
  const allCategories = [{ id: "all" as const, label: "All", emoji: "🎬", color: "#9333EA" }, ...categories];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
      {allCategories.map((cat) => {
        const isActive = cat.id === selected;
        
        return (
          <motion.button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="relative flex flex-col items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Category Button */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border-2 transition-all ${
                isActive 
                  ? "scale-125 border-white bg-black/80" 
                  : "scale-100 border-white/30 bg-black/40"
              }`}
              style={{
                backgroundColor: isActive ? `${cat.color}40` : undefined,
              }}
            >
              <span className="text-2xl">{cat.emoji}</span>
            </div>
            
            {/* Label - Only show for active */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-16 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg whitespace-nowrap"
              >
                <p className="text-white text-xs font-bold">{cat.label}</p>
              </motion.div>
            )}
          </motion.button>
        );
      })}
      
      {/* Swipe Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 text-[10px] text-center mt-2 leading-tight"
      >
        Tap<br/>to<br/>filter
      </motion.p>
    </div>
  );
}

// Video Player Component
function VideoPlayer({
  video,
  isPlaying,
  onTogglePlay,
  videoRef,
}: {
  video: Video;
  isPlaying: boolean;
  onTogglePlay: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const [liked, setLiked] = useState(false);
  const { user } = useAuthStore();

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like videos");
      return;
    }
    
    try {
      if (liked) {
        await unlikeVideo(video.id, user.uid);
        setLiked(false);
        toast.success("Unliked");
      } else {
        await likeVideo(video.id, user.uid);
        setLiked(true);
        toast.success("Liked!");
      }
    } catch (error) {
      toast.error("Failed to update like");
    }
  };

  const handleShare = async () => {
    try {
      await shareVideo(video.id);
      if (navigator.share) {
        await navigator.share({
          title: `Check out this ${video.category} video!`,
          text: video.caption || "Check out this Flip video!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <div className="relative w-full max-w-md h-full bg-black">
      {/* Video */}
      {video.videoUrl ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          loop
          playsInline
          onClick={onTogglePlay}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
          <p className="text-white text-lg">Video loading...</p>
        </div>
      )}

      {/* Pause overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-20 h-20 text-white/80" />
        </div>
      )}

      {/* Video info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={video.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userName}`}
                alt={video.userName}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="text-white font-semibold">{video.userName}</span>
            </div>
            <p className="text-white text-sm">{video.caption || ""}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 items-center ml-4">
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1"
            >
              <Heart
                className={`w-8 h-8 ${liked ? "fill-red-500 text-red-500" : "text-white"}`}
              />
              <span className="text-white text-xs">{video.likes + (liked ? 1 : 0)}</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-8 h-8 text-white" />
              <span className="text-white text-xs">{video.comments}</span>
            </button>

            <button onClick={handleShare} className="flex flex-col items-center gap-1">
              <Share2 className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload Modal Component
function UploadModal({ onClose }: { onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("laugh");
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video must be less than 100MB");
        return;
      }
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a video file");
        return;
      }
      setVideoFile(file);
      toast.success("Video selected!");
    }
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error("Please sign in to upload videos");
      return;
    }
    
    if (!videoFile) {
      toast.error("Please select a video");
      return;
    }

    setUploading(true);
    try {
      await uploadVideo(videoFile, user.uid, selectedCategory, caption);
      toast.success("Video uploaded successfully!");
      onClose();
      // Refresh page to show new video
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Upload Flip</h2>

        {/* Video upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Video (Max 100MB)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">
              {videoFile ? videoFile.name : "Click to upload video"}
            </p>
          </div>
        </div>

        {/* Category selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedCategory === cat.id
                    ? "bg-white/20 scale-105"
                    : "bg-white/5 hover:bg-white/10"
                }`}
                style={{
                  borderColor: selectedCategory === cat.id ? cat.color : "transparent",
                  borderWidth: 2,
                }}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs text-white">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-white/5 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-600 text-white hover:bg-white/10"
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!videoFile || uploading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload Flip"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

import React from "react";
import { Dialog, DialogContent, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
// import ReactPlayer from "react-player"; // Removed to use lazy load below
import { Media, MediaType } from "utils/media-gallery-store";
import { format } from "date-fns";
import { SafeVideoPlayer } from "./SafeVideoPlayer";

interface MediaViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  media: Media | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function MediaViewerDialog({ 
  isOpen, 
  onClose, 
  media, 
  onNext, 
  onPrev,
  hasNext = false,
  hasPrev = false
}: MediaViewerDialogProps) {
  if (!media) return null;

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "ArrowRight" && onNext && hasNext) {
        onNext();
      } else if (e.key === "ArrowLeft" && onPrev && hasPrev) {
        onPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onNext, onPrev, hasNext, hasPrev, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-screen-xl w-full h-[90vh] bg-black/95 border-gray-800 p-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        <DialogDescription className="sr-only">
          View photos and videos in full screen
        </DialogDescription>
        {/* Header / Controls */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white">
            <p className="font-medium text-sm">{media.title || (media.type === MediaType.IMAGE ? "Photo" : "Video")}</p>
            <p className="text-xs text-gray-400">{format(new Date(media.createdAt), 'PPp')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={onClose}>
              <XIcon className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {/* Navigation Buttons */}
          {hasPrev && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-4 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/10 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </Button>
          )}
          
          {hasNext && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-white/20 border border-white/10 hidden md:flex"
              onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            >
              <ChevronRightIcon className="h-8 w-8" />
            </Button>
          )}

          {/* Media Content */}
          <div className="w-full h-full flex items-center justify-center p-4 md:p-10">
            {media.type === MediaType.IMAGE && (
              <img 
                src={media.url} 
                alt={media.title || "Media"} 
                className="max-w-full max-h-full object-contain"
              />
            )}
            
            {(media.type === MediaType.VIDEO || media.type === MediaType.YOUTUBE) && (
              <div className="w-full h-full max-w-5xl max-h-[80vh] aspect-video bg-black flex items-center justify-center">
                 <SafeVideoPlayer
                    key={media.id}
                    url={media.url}
                    width="100%"
                    height="100%"
                    controls
                    playing={isOpen} // Auto-play when opened
                    config={{
                      file: { attributes: { controlsList: 'nodownload' } },
                      youtube: { playerVars: { showinfo: 0 } }
                    }}
                  />
              </div>
            )}
            
            {media.type === MediaType.AUDIO && (
              <div className="text-center p-10 bg-gray-900 rounded-2xl border border-gray-800">
                <div className="w-24 h-24 bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                   {/* Icon placeholder - using emoji for simplicity if needed, but better to pass icon */}
                   <span className="text-4xl">🎵</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{media.title || "Audio Track"}</h3>
                <audio controls src={media.url} className="w-full min-w-[300px]" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

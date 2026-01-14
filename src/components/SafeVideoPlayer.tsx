import React, { Suspense, useState, useEffect } from 'react';
import { Loader2, AlertCircle, PlayCircle, ExternalLink } from 'lucide-react';
import { isYouTubeUrl, normalizeYouTubeUrl } from '../utils/url-helpers';

// Lazy load ReactPlayer to prevent build issues and reduce bundle size
const ReactPlayer = React.lazy(() => import('react-player'));

interface SafeVideoPlayerProps {
  url: string;
  playing?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  width?: string | number;
  height?: string | number;
  onEnded?: () => void;
  playsinline?: boolean;
  light?: boolean | string; // For thumbnail preview
  loop?: boolean;
  volume?: number;
  config?: any; // Allow passing ReactPlayer config
}

export function SafeVideoPlayer(props: SafeVideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [isPlaying, setIsPlaying] = useState(props.playing || false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Normalize YouTube URLs (especially Shorts) to standard watch URLs for better compatibility
  const videoUrl = isYouTubeUrl(props.url) ? normalizeYouTubeUrl(props.url) : props.url;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (videoUrl) {
      console.log(`[ScanMe Debug] SafeVideoPlayer mounted/updated with URL: ${videoUrl}`);
    }
  }, [videoUrl]);

  // Sync internal state if prop changes
  useEffect(() => {
    if (props.playing !== undefined) {
      setIsPlaying(props.playing);
    }
  }, [props.playing]);

  // Prevent hydration mismatch
  if (!isClient) {
    return <div className={`bg-gray-900/50 animate-pulse ${props.className}`} style={{ width: props.width || '100%', height: props.height || '100%' }} />;
  }

  // Handle empty URL immediately
  if (!props.url || !props.url.trim()) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-900 text-gray-400 ${props.className}`} style={{ width: props.width || '100%', height: props.height || '100%' }}>
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-xs">No video source</span>
      </div>
    );
  }

  // Common error view
  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-900 text-gray-400 ${props.className}`} style={{ width: props.width || '100%', height: props.height || '100%' }}>
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-xs">Video unavailable</span>
        <span className="text-[10px] mt-1 text-red-500 text-center px-2 break-all">
             {errorDetails || "Format or CORS issue"}
        </span>
        {props.url && (
          <a 
            href={props.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open directly
          </a>
        )}
      </div>
    );
  }

  return (
    <Suspense 
      fallback={
        <div className={`flex items-center justify-center bg-gray-900 ${props.className}`} style={{ width: props.width || '100%', height: props.height || '100%' }}>
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      }
    >
      <div className={`relative w-full h-full bg-black group ${props.className}`}>
        {/* Play Button Overlay - Clickable to force play */}
        {!isPlaying && !hasError && !isBuffering && (
          <div 
            className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              console.log(`[ScanMe Debug] Play button clicked for: ${videoUrl}`);
              setIsPlaying(true);
            }}
          >
            <div className="bg-black/40 rounded-full p-4 backdrop-blur-sm border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-200 hover:bg-black/60">
               <PlayCircle className="w-12 h-12 text-white/90" fill="white" fillOpacity={0.2} />
            </div>
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
             <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
          </div>
        )}

        {/* Debug Link (Visible on Hover) */}
        <a 
          href={videoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-full hover:bg-black/80 text-white/70 hover:text-white"
          title="Open video in new tab (Debug)"
        >
          <ExternalLink className="w-3 h-3" />
        </a>

        {isYouTubeUrl(videoUrl) ? (
          <ReactPlayer
            {...props}
            key={videoUrl} // Force remount on URL change
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying} // Control playback with internal or external state
            onReady={() => console.log(`[ScanMe Debug] Video player ready: ${videoUrl}`)}
            onStart={() => {
               console.log(`[ScanMe Debug] Video started playing: ${videoUrl}`);
               setIsPlaying(true);
               setIsBuffering(false);
            }}
            onPlay={() => {
              setIsPlaying(true);
              setIsBuffering(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
               setIsPlaying(false);
               props.onEnded?.();
            }}
            onBuffer={() => {
              console.log(`[ScanMe Debug] Video buffering: ${videoUrl}`);
              setIsBuffering(true);
            }}
            onBufferEnd={() => setIsBuffering(false)}
            onError={(e: any) => { // Type as any to handle various error shapes
              console.error(`[ScanMe Debug] Video playback error for ${videoUrl}:`, e);
              setHasError(true);
              setIsBuffering(false);
              
              // Try to extract useful error info
              let msg = "Playback error";
              if (e && typeof e === 'object') {
                  if (e.target && e.target.error) {
                      const code = e.target.error.code;
                      const message = e.target.error.message;
                      if (code === 1) msg = "Aborted";
                      if (code === 2) msg = "Network error";
                      if (code === 3) msg = "Decode error";
                      if (code === 4) msg = "Format not supported";
                      if (message) msg += `: ${message}`;
                  } else if (e.type) {
                      msg = `Error: ${e.type}`;
                  }
              } else if (typeof e === 'string') {
                  msg = e;
              } else if (typeof e === 'number') {
                  // ReactPlayer sometimes returns just a number (e.g. YouTube error codes)
                  if (e === 100) msg = "Video not found or private";
                  if (e === 101 || e === 150) msg = "Embedding disabled by video owner (copyright restriction)";
                  else msg = `Error code: ${e}`;
              }
              
              // If we have a URL but no specific error, it's often a format issue with ReactPlayer's auto-detection
              // especially for Signed URLs from Firebase which might not end in .mp4
              if (msg === "Playback error" && !isYouTubeUrl(videoUrl)) {
                   msg = "Format/Network error";
              }
              
              setErrorDetails(msg);
            }}
            config={{
              youtube: {
                playerVars: { 
                  showinfo: 0, 
                  modestbranding: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                  ...props.config?.youtube?.playerVars
                },
                ...props.config?.youtube
              },
              ...props.config
            }}
          />
        ) : (
          <video
            src={videoUrl}
            className={`w-full h-full object-contain ${props.className}`}
            controls={props.controls}
            playsInline
            loop={props.loop}
            muted={props.muted}
            preload="auto"
            crossOrigin="anonymous"
            onClick={(e) => {
               // Optional: Toggle play on click if controls are hidden or custom behavior needed
               // But usually native controls handle this fine.
            }}
            onPlay={() => {
               console.log(`[ScanMe Debug] Native Video started playing`);
               setIsPlaying(true);
               setIsBuffering(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
               setIsPlaying(false);
               props.onEnded?.();
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={(e) => {
               console.error(`[ScanMe Debug] Native Video error:`, e.currentTarget.error);
               setHasError(true);
               setIsBuffering(false);
               setErrorDetails(e.currentTarget.error?.message || "Playback error");
            }}
            ref={(ref) => {
               if (ref) {
                 // Sync playing state if prop changes
                 if (isPlaying && ref.paused) ref.play().catch(e => console.error("Play failed", e));
                 if (!isPlaying && !ref.paused) ref.pause();
                 if (props.volume !== undefined) ref.volume = props.volume;
               }
            }}
          />
        )}
      </div>
    </Suspense>
  );
}

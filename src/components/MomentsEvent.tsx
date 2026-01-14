import React from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket, Share2, ArrowRight, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Event } from "utils/event-store";
import { toast } from "sonner";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface MomentsEventProps {
  event: Event;
  isActive: boolean;
}

export function MomentsEvent({ event, isActive }: MomentsEventProps) {
  const navigate = useNavigate();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: `${window.location.origin}/event-detail?id=${event.id}`,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/event-detail?id=${event.id}`);
      toast.success("Event link copied to clipboard");
    }
  };

  const eventDate = new Date(event.date);
  const isInvalidDate = isNaN(eventDate.getTime());
  const safeImageURL = getSafeImageUrl(event.imageURL);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden snap-start shrink-0">
      {/* Background/Media Layer */}
      <div className="absolute inset-0 bg-gray-900">
        {safeImageURL ? (
          <img 
            src={safeImageURL} 
            alt={event.title} 
            className="w-full h-full object-cover opacity-80"
            loading="lazy"
          />
        ) : (
            // Fallback gradient for events without image
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-900 to-black flex items-center justify-center">
                 <Calendar className="w-32 h-32 text-white/10" />
            </div>
        )}
        
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
        
        {/* Event specific highlight effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 mix-blend-overlay pointer-events-none" />
      </div>

      {/* Content Overlay - Bottom Left */}
      <div className="absolute bottom-20 left-4 right-16 z-10 pointer-events-none text-shadow-sm">
         <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className="inline-block px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold uppercase tracking-wider drop-shadow-md">
                Upcoming Event
            </span>
            {event.supportsScanning && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neon-blue/80 text-white text-xs font-bold uppercase tracking-wider drop-shadow-md border border-neon-blue/50">
                <ScanBarcode className="w-3 h-3" />
                Scan Enabled
              </span>
            )}
         </div>
         <div className="mb-2">
            <h2 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg uppercase italic">
                {event.title}
            </h2>
         </div>

         <div className="space-y-2 pointer-events-auto text-gray-200">
            <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="font-medium">{isInvalidDate ? "Date TBA" : format(eventDate, 'PPP p')}</span>
            </div>
            <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="font-medium truncate">{event.location}</span>
            </div>
            {event.ticketPrice && (
                <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-green-400">{event.ticketPrice}</span>
                </div>
            )}
            
            <p className="text-sm text-gray-300 line-clamp-2 mt-2 max-w-[85%]">
                {event.description}
            </p>
            
            <Button 
                onClick={() => navigate(`/event-detail?id=${event.id}`)}
                className="mt-4 bg-white text-black hover:bg-gray-200 rounded-full px-6 font-bold flex items-center gap-2"
            >
                View Details <ArrowRight className="w-4 h-4" />
            </Button>
         </div>
      </div>

      {/* Action Sidebar - Bottom Right */}
      <div className="absolute bottom-24 right-2 z-20 flex flex-col gap-6 items-center">
        <div className="flex flex-col items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm h-12 w-12 text-white"
                onClick={handleShare}
            >
                <Share2 className="h-7 w-7 text-white" />
            </Button>
            <span className="text-xs font-medium text-white drop-shadow-md">Share</span>
        </div>
        
        <div className="flex flex-col items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-purple-600/80 hover:bg-purple-600 backdrop-blur-sm h-12 w-12 text-white animate-pulse"
                onClick={() => navigate(`/event-detail?id=${event.id}`)}
            >
                <Ticket className="h-6 w-6 text-white" />
            </Button>
            <span className="text-xs font-medium text-white drop-shadow-md">Get Tix</span>
        </div>
      </div>
    </div>
  );
}

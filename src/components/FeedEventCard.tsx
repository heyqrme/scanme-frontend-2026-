import React from "react";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Event } from "utils/event-store";
import { useAuthStore } from "utils/auth-store";
import { toast } from "sonner";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface FeedEventCardProps {
  event: Event;
}

export function FeedEventCard({ event }: FeedEventCardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const safeImageURL = getSafeImageUrl(event.imageURL);

  const handleDetailsClick = () => {
    if (user) {
      navigate(`/event-detail?id=${event.id}`);
    } else {
      toast.info("Please sign up to view event details");
      navigate('/signup');
    }
  };

  const handleTicketsClick = () => {
    if (user) {
      navigate(`/event-detail?id=${event.id}`);
    } else {
      toast.info("Please sign up to get tickets");
      navigate('/signup');
    }
  };

  return (
    <Card className="bg-gray-900/60 border-gray-700 mb-6 border hover:border-pink-500/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600/20 p-2 rounded-full">
              <CalendarIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Upcoming Event</span>
              <CardTitle className="text-lg text-white">{event.title}</CardTitle>
            </div>
          </div>
          <div className="text-right">
             <p className="text-sm font-semibold text-gray-300">
                {(() => {
                  try {
                    return format(new Date(event.date), 'MMM d');
                  } catch (e) {
                    return 'Date TBA';
                  }
                })()}
             </p>
             <p className="text-xs text-gray-500">
                {(() => {
                  try {
                    return format(new Date(event.date), 'h:mm a');
                  } catch (e) {
                    return '';
                  }
                })()}
             </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {safeImageURL && (
          <div className="mb-4 rounded-lg overflow-hidden relative aspect-video">
            <img 
              src={safeImageURL} 
              alt={event.title} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30">
               <span className="text-white font-bold text-xs">
                 {event.price && event.price > 0 ? `$${event.price}` : "FREE"}
               </span>
            </div>
          </div>
        )}
        
        <p className="text-gray-300 line-clamp-2 mb-3">{event.description}</p>
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPinIcon className="h-4 w-4 text-gray-500" />
          <span>{event.location || "Location TBA"}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-4 flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={handleDetailsClick}
        >
          Details
        </Button>
        <Button 
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
          onClick={handleTicketsClick}
        >
          <TicketIcon className="w-4 h-4 mr-2" />
          Tickets
        </Button>
      </CardFooter>
    </Card>
  );
}

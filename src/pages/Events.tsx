import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEventStore } from "utils/event-store";
import { useAuthStore } from "utils/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, PlusIcon, TicketIcon, ZapIcon, ScanBarcode } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Events() {
  const navigate = useNavigate();
  const { events, fetchEvents, isLoading } = useEventStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter out military events from the main feed
  const publicEvents = events.filter(event => event.category !== 'military');

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-black z-0 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 neo-glow">
              Events
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Discover upcoming parties and experiences</p>
            
            <div className="mt-6 max-w-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-gray-300 leading-relaxed">
                <span className="font-bold text-white">ScanMe</span> users check into events instantly by having their unique code scanned at the entrance. Event hosts can also scan users throughout the event to unlock exclusive perks, fast access, and special product discounts.
              </p>
              <p className="text-gray-500 text-sm mt-2 italic">
                *Note: Not all events participate in scanning features.
              </p>
            </div>
          </div>
          
          {user?.isAdmin && (
            <Button 
              onClick={() => navigate("/create-event")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-900/20"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : publicEvents.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-800 rounded-xl bg-gray-900/30 backdrop-blur-sm">
            <ZapIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No Events Yet</h3>
            <p className="text-gray-400 text-lg">Stay tuned for the next big drop!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publicEvents.map((event, index) => (
              <div 
                key={event.id}
                className="group relative bg-gray-900/80 border border-gray-800 hover:border-pink-500/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)] flex flex-col"
              >
                {/* Price Badge */}
                <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md border border-purple-500/30 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {event.price && event.price > 0 ? `$${event.price}` : "FREE"}
                </div>

                {/* Scan Enabled Badge */}
                {event.supportsScanning && (
                  <div className="absolute top-3 right-3 z-20 bg-neon-blue/20 backdrop-blur-md border border-neon-blue/50 text-neon-blue text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                    <ScanBarcode className="w-3 h-3 mr-1" />
                    SCAN ENABLED
                  </div>
                )}

                <div className="relative aspect-[4/3] overflow-hidden">
                  {event.imageURL ? (
                    <img 
                      src={event.imageURL} 
                      alt={event.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <CalendarIcon className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                  
                  {/* Date Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-5 pt-12 bg-gradient-to-t from-black to-transparent">
                    <p className="text-purple-400 font-bold text-sm mb-1 uppercase tracking-wider">
                      {(() => {
                          try {
                            return format(new Date(event.date), 'MMM d, yyyy • h:mm a');
                          } catch (e) {
                            return 'Date TBA';
                          }
                        })()}
                    </p>
                    <h3 className="text-2xl font-bold text-white leading-tight group-hover:text-pink-400 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                    <MapPinIcon className="h-4 w-4 text-gray-500" />
                    <span className="line-clamp-1">{event.location || "Location TBA"}</span>
                  </div>
                  
                  <div className="mt-auto flex gap-3">
                    <Button 
                      className="flex-1 bg-white/5 hover:bg-purple-600 hover:text-white border border-gray-700 hover:border-purple-500 text-white transition-all duration-300 group-hover:border-purple-500/50 h-12"
                      onClick={() => {
                        if (user) {
                          navigate(`/event-detail?id=${event.id}`);
                        } else {
                          toast.info("Please sign up to view event details");
                          navigate('/signup');
                        }
                      }}
                    >
                      Details
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-900/20 h-12"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (user) {
                          navigate(`/event-detail?id=${event.id}`);
                        } else {
                          toast.info("Please sign up to get tickets");
                          navigate('/signup');
                        }
                      }}
                    >
                      <TicketIcon className="w-4 h-4 mr-2" />
                      Tickets
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

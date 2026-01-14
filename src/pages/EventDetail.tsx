import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEventStore } from "utils/event-store";
import { useAuthStore } from "utils/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, differenceInTime, intervalToDuration } from "date-fns";
import { CalendarIcon, MapPinIcon, ArrowLeftIcon, TicketIcon, Share2Icon, ClockIcon, UsersIcon, ExternalLinkIcon, X, Edit2Icon, CalendarPlus, ScanBarcode, ZapIcon } from "lucide-react";
import { toast } from "sonner";
import { EventCheckIn } from "@/components/EventCheckIn";
import { BuyTicketDialog } from "@/components/BuyTicketDialog";

export default function EventDetail() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, isLoading, error } = useEventStore();
  const { user } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showScanInfo, setShowScanInfo] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signup");
      return;
    }

    if (id) {
      fetchEvent(id);
    }
  }, [id, user, fetchEvent, navigate]);

  // Countdown timer logic
  useEffect(() => {
    if (!currentEvent?.date) return;

    const calculateTimeLeft = () => {
      const difference = new Date(currentEvent.date).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null); // Event started or passed
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [currentEvent]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleGetTickets = () => {
    if (currentEvent?.ticketLink) {
      window.open(currentEvent.ticketLink, '_blank');
    } else if (currentEvent?.price && currentEvent.price > 0) {
      if (!user) {
        toast.error("Please login to purchase tickets");
        navigate("/login");
        return;
      }
      setShowTicketDialog(true);
    } else {
      toast.info("This event is free or tickets are available at the door.");
    }
  };

  const handleAddToCalendar = () => {
    if (!currentEvent) return;

    const startDate = new Date(currentEvent.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const googleCalendarUrl = new URL("https://calendar.google.com/calendar/render");
    googleCalendarUrl.searchParams.append("action", "TEMPLATE");
    googleCalendarUrl.searchParams.append("text", currentEvent.title);
    googleCalendarUrl.searchParams.append("dates", `${formatDate(startDate)}/${formatDate(endDate)}`);
    googleCalendarUrl.searchParams.append("details", currentEvent.description);
    googleCalendarUrl.searchParams.append("location", currentEvent.location || "");

    window.open(googleCalendarUrl.toString(), '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !currentEvent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Event Not Found</h2>
        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-black z-0 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/")}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Events
            </Button>

            {user?.isAdmin && (
              <Button
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                onClick={() => navigate(`/edit-event?id=${id}`)}
              >
                <Edit2Icon className="mr-2 h-4 w-4" />
                Edit Event
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full"
            onClick={() => navigate("/")}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-purple-900/20 relative group">
              {currentEvent.imageURL ? (
                <div className="aspect-video w-full relative">
                  <img 
                    src={currentEvent.imageURL} 
                    alt={currentEvent.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              ) : (
                 <div className="aspect-video w-full bg-gray-900 flex items-center justify-center border-b border-gray-800">
                   <CalendarIcon className="w-24 h-24 text-gray-700" />
                 </div>
              )}
              
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-purple-600/40">
                    Upcoming Event
                  </span>
                  {currentEvent.price === 0 && (
                    <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-green-600/40">
                      Free Entry
                    </span>
                  )}
                  {currentEvent.supportsScanning && (
                    <button 
                      onClick={() => setShowScanInfo(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-neon-blue/20 backdrop-blur-md border border-neon-blue/50 text-neon-blue text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-neon-blue/20 hover:bg-neon-blue/30 transition-colors cursor-pointer"
                    >
                      <ScanBarcode className="w-3 h-3" />
                      Scan Enabled
                    </button>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                  {currentEvent.title}
                </h1>
                <div className="flex items-center text-gray-300 text-sm md:text-base gap-4">
                   <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4 text-pink-500" /> {currentEvent.location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {currentEvent.description}
                </div>
              </CardContent>
            </Card>

            {/* Live Check-ins */}
            <EventCheckIn eventId={currentEvent.id} eventDate={currentEvent.date} />
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Ticket / Action Card */}
            <Card className="bg-gray-900/80 border-purple-500/30 backdrop-blur-md shadow-xl shadow-purple-900/20 sticky top-8">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Price</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {currentEvent.price && currentEvent.price > 0 ? `$${currentEvent.price}` : "Free"}
                      </span>
                      {currentEvent.price && currentEvent.price > 0 && <span className="text-sm text-gray-400">/ person</span>}
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded-full hover:bg-white/10 cursor-pointer transition-colors" onClick={handleShare}>
                    <Share2Icon className="w-5 h-5 text-gray-400 hover:text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date & Time */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-purple-500/50 transition-colors">
                    <CalendarIcon className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{format(new Date(currentEvent.date), "EEEE, MMMM do")}</p>
                      <p className="text-sm text-gray-400">{format(new Date(currentEvent.date), "yyyy")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 -mt-1 -mr-1"
                      onClick={handleAddToCalendar}
                      title="Add to Google Calendar"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <ClockIcon className="w-5 h-5 text-pink-400 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">{format(new Date(currentEvent.date), "h:mm a")}</p>
                      <p className="text-sm text-gray-400">Don't be late!</p>
                    </div>
                  </div>
                </div>

                {/* Countdown */}
                {timeLeft && (
                  <div className="py-4 border-t border-b border-white/10">
                    <p className="text-xs text-center text-gray-400 mb-2 uppercase tracking-widest">Event Starts In</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-xl font-bold text-white bg-black/40 rounded p-1 font-mono">{timeLeft.days}</div>
                        <div className="text-[10px] text-gray-500 mt-1">DAYS</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white bg-black/40 rounded p-1 font-mono">{timeLeft.hours}</div>
                        <div className="text-[10px] text-gray-500 mt-1">HRS</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white bg-black/40 rounded p-1 font-mono">{timeLeft.minutes}</div>
                        <div className="text-[10px] text-gray-500 mt-1">MINS</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-neon-pink bg-black/40 rounded p-1 font-mono animate-pulse">{timeLeft.seconds}</div>
                        <div className="text-[10px] text-gray-500 mt-1">SECS</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Proof Mock */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-gray-700 flex items-center justify-center text-xs font-bold">
                        {["A", "J", "M"][i-1]}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-400"><span className="text-white font-bold">42+</span> people going</p>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all duration-300"
                  onClick={handleGetTickets}
                >
                  <TicketIcon className="w-5 h-5 mr-2" />
                  {currentEvent.price && currentEvent.price > 0 ? "Buy Tickets" : "RSVP Now"}
                  {currentEvent.ticketLink && <ExternalLinkIcon className="w-4 h-4 ml-2 opacity-70" />}
                </Button>
                
                {currentEvent.ticketLink && (
                  <p className="text-xs text-center text-gray-500">
                    You will be redirected to the ticket vendor website.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {currentEvent && (
          <BuyTicketDialog 
            open={showTicketDialog} 
            onOpenChange={setShowTicketDialog}
            event={{
              id: currentEvent.id,
              title: currentEvent.title,
              price: currentEvent.price || 0,
              date: currentEvent.date
            }}
            onSuccess={() => {
              navigate("/profile"); // Or refresh to show status
            }}
          />
        )}

        {/* Scan Info Dialog */}
        <Dialog open={showScanInfo} onOpenChange={setShowScanInfo}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-neon-blue text-xl">
                <ScanBarcode className="w-6 h-6" />
                Scanning Features
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                How scanning works at this event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-gray-300 leading-relaxed">
                <span className="font-bold text-white">ScanMe</span> users check into events instantly by having their unique code scanned at the entrance.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Event hosts can also scan users throughout the event to unlock exclusive perks, fast access, and special product discounts.
              </p>
              <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-lg mt-2">
                <p className="text-sm text-purple-200 flex items-start gap-3">
                  <ZapIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Look for staff with scanners to participate and unlock rewards!</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

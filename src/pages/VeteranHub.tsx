import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/utils/auth-store";
import { useProfileStore } from "@/utils/profile-store";
import { useEventStore } from "@/utils/event-store";
import { Shield, Star, ShoppingBag, MessageCircle, Lock, Users, ArrowLeft, Trophy, Calendar, Plus, Share2, Ticket as TicketIcon } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { TAPDashboard } from "@/components/TAPDashboard";
import { apiClient } from "app";
import { useState } from "react";

interface Ticket {
  id: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: string;
  qrCodeData: string;
}

export default function VeteranHub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();
  const { events, fetchEvents, isLoading: eventsLoading } = useEventStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadProfile(user.uid);
      // TODO: Implement Firebase-based ticket system
      // apiClient.get_my_tickets().then(res => res.json()).then(data => setTickets(data)).catch(err => console.error("Failed to load tickets", err));
    }
  }, [user, loadProfile]);

  useEffect(() => {
    fetchEvents('military');
  }, [fetchEvents]);

  if (authLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login?next=/veteran-hub" replace />;

  const isVerified = profile?.veteranStatus === 'verified';

  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading profile...</div>;

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto bg-gray-900/50 p-6 rounded-full w-24 h-24 flex items-center justify-center border-2 border-gray-800">
            <Lock className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-200">
            Military & Vets Locked
          </h1>
          <p className="text-gray-400">
            This area is exclusive to verified veterans. Verify your service status to unlock special perks, community features, and discounts.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button 
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-semibold"
              onClick={() => navigate("/veteran-verification")}
            >
              Verify Status
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleShareCrisisLine = async () => {
    const url = "https://www.veteranscrisisline.net/";
    const title = "Veterans Crisis Line";
    const text = "Immediate crisis support for Veterans.";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="relative h-64 bg-gradient-to-b from-green-900/40 to-black overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579912437766-79b884d59301?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        
        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-8 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-green-400 pl-0 hover:bg-transparent hover:text-green-300">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          <div className="w-full text-center mb-6">
            <p className="text-green-400 font-bold text-xl md:text-2xl uppercase tracking-widest drop-shadow-md">
              Welcome & Thank you for serving our country
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <Badge className="bg-green-600/20 text-green-400 border-green-600/50 mb-3 hover:bg-green-600/30">
                <Shield className="w-3 h-3 mr-1" /> Verified Veteran
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Military & Vets</h1>
              <p className="text-gray-400 max-w-xl">
                Your exclusive command center for veteran-only perks, community discussions, and events.
              </p>
            </div>
            {/* User Stat (Placeholder) */}
            <div className="hidden md:block text-right">
              <div className="text-2xl font-bold text-yellow-500">Tier 1</div>
              <div className="text-sm text-gray-500">Member Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 space-y-12">
        
        {/* Quick Actions / Featured */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ y: -5 }} className="h-full">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 h-full hover:border-green-800/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-900/20 flex items-center justify-center mb-2 group-hover:bg-green-900/30 transition-colors">
                  <ShoppingBag className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="group-hover:text-green-400 transition-colors">Exclusive Store</CardTitle>
                <CardDescription>Gear available only to verified members.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  <span className="text-green-400 font-bold">20% OFF</span> sitewide automatically applied.
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="h-full">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 h-full hover:border-blue-800/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-900/20 flex items-center justify-center mb-2 group-hover:bg-blue-900/30 transition-colors">
                  <MessageCircle className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="group-hover:text-blue-400 transition-colors">The Mess Hall</CardTitle>
                <CardDescription>Private chat channels and forums.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-black"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-black"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-black flex items-center justify-center text-xs text-black font-bold">+42</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Active now</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="h-full">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 h-full hover:border-yellow-800/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-yellow-900/20 flex items-center justify-center mb-2 group-hover:bg-yellow-900/30 transition-colors">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <CardTitle className="group-hover:text-yellow-400 transition-colors">Challenges</CardTitle>
                <CardDescription>Weekly veteran-only missions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                  <div className="bg-yellow-500 h-2 rounded-full w-[60%]"></div>
                </div>
                <p className="text-xs text-gray-400">Current mission: Operation Fit (60% complete)</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* TAP Dashboard */}
        <TAPDashboard />

        {/* My Activity Passes */}
        {tickets.length > 0 && (
          <div>
             <h2 className="text-2xl font-bold mb-4 flex items-center">
                <TicketIcon className="w-5 h-5 mr-2 text-green-500" />
                My Activity Passes
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map(ticket => (
                    <Card key={ticket.id} className="bg-gray-800/80 border-l-4 border-l-green-500 border-y-gray-700 border-r-gray-700 relative overflow-hidden group hover:bg-gray-800 transition-colors">
                        <div className="absolute right-16 top-0 bottom-0 border-l-2 border-dashed border-gray-700/50"></div>
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full"></div>
                        
                        <CardContent className="p-4 flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="font-bold text-lg text-white group-hover:text-green-400 transition-colors">{ticket.eventTitle}</h3>
                                <p className="text-sm text-gray-400 mb-1">{ticket.eventDate ? format(new Date(ticket.eventDate), 'PPP p') : 'Date TBA'}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-900/50 text-green-400 border-green-800 px-1.5 py-0.5 text-[10px] uppercase">
                                      {ticket.status}
                                  </Badge>
                                  <span className="text-xs text-gray-500 truncate max-w-[150px]">{ticket.eventLocation}</span>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 rounded ml-2 shadow-lg">
                                <QRCodeSVG value={ticket.qrCodeData} size={60} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
             </div>
          </div>
        )}

        {/* Content Feed Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" /> 
              MWR & Base Activities
            </h2>
            {user?.isAdmin && (
              <Button 
                size="sm" 
                onClick={() => navigate("/create-event")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Create Event
              </Button>
            )}
          </div>
          
          {eventsLoading ? (
            <div className="text-center py-10">Loading events...</div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.slice(0, 4).map((event) => (
                <Card key={event.id} className="bg-gray-900 border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
                   <div className="h-48 bg-gray-800 relative">
                     {event.imageURL ? (
                       <img 
                         src={event.imageURL} 
                         alt={event.title} 
                         className="w-full h-full object-cover opacity-80"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-gray-800">
                         <Calendar className="w-12 h-12 text-gray-600" />
                       </div>
                     )}
                     <Badge className="absolute top-4 left-4 bg-purple-600">
                       {event.date ? format(new Date(event.date), 'MMM d') : 'Upcoming'}
                     </Badge>
                     {event.price && event.price > 0 && (
                        <Badge className="absolute top-4 right-4 bg-black/50 backdrop-blur-md">
                          ${event.price}
                        </Badge>
                     )}
                   </div>
                   <CardHeader>
                     <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                     <CardDescription className="line-clamp-1">{event.location || "Location TBA"}</CardDescription>
                   </CardHeader>
                   <CardFooter>
                     <Button 
                        className="w-full bg-white text-black hover:bg-gray-200"
                        onClick={() => navigate(`/event-detail?id=${event.id}`)}
                     >
                        View Details
                     </Button>
                   </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-800">
              <p className="text-gray-400 mb-4">No upcoming military events scheduled.</p>
              {user?.isAdmin && (
                <Button variant="outline" onClick={() => navigate("/create-event")}>
                  Schedule First Event
                </Button>
              )}
            </div>
          )}
          
          <div className="mt-8">
             <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" /> 
                Resources
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                   <div className="h-48 bg-red-600 p-4 flex flex-col items-center justify-center relative text-center">
                     <Shield className="w-16 h-16 text-white mb-2 animate-pulse" />
                     <h3 className="text-3xl font-black text-white tracking-wider uppercase">Scan For Help</h3>
                     <p className="text-red-100 font-semibold mt-1">Immediate Crisis Support</p>
                   </div>
                   <CardHeader>
                     <CardTitle>VA Mental Health Services</CardTitle>
                     <CardDescription>Access mental health information, resources, and support for Veterans.</CardDescription>
                   </CardHeader>
                   <CardContent className="flex flex-col items-center justify-center pt-0 pb-4">
                     <div className="bg-white p-3 rounded-lg mb-2 mt-2">
                       <QRCodeSVG 
                         value="https://www.veteranscrisisline.net/" 
                         size={120}
                         fgColor="#000000"
                         bgColor="#ffffff"
                       />
                     </div>
                     <p className="text-xs text-gray-400 text-center mt-1">Scan for immediate crisis support (Veterans Crisis Line)</p>
                   </CardContent>
                   <CardFooter className="flex gap-2">
                     <Button 
                       variant="outline" 
                       className="flex-1"
                       onClick={() => window.open("https://www.mentalhealth.va.gov/", "_blank")}
                     >
                       Visit Website
                     </Button>
                     <Button 
                       variant="secondary"
                       className="flex-1 bg-red-900/30 text-red-200 hover:bg-red-900/50 border border-red-800"
                       onClick={handleShareCrisisLine}
                     >
                       <Share2 className="w-4 h-4 mr-2" /> Share
                     </Button>
                   </CardFooter>
                </Card>
             </div>
          </div>
        </div>

        {/* Community Highlight */}
        <div className="bg-gray-900/30 rounded-2xl p-8 border border-gray-800 text-center">
           <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
           <h3 className="text-xl font-semibold mb-2">Member Directory</h3>
           <p className="text-gray-400 max-w-lg mx-auto mb-6">
             Find other veterans near you. Connect based on branch, service years, or interests.
           </p>
           <Button variant="secondary" onClick={() => navigate("/members?filter=military")}>Browse Directory</Button>
        </div>

      </div>
    </div>
  );
}

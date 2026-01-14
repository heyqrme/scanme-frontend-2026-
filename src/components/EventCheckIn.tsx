import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "utils/auth-store";
import { Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPinIcon, UserCheck, Users, Eye, EyeOff, Ghost, Filter, InfoIcon, QrCodeIcon, MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { apiClient } from "app";
import { NetworkCard } from "@/components/NetworkCard";

interface CheckIn {
  userId: string;
  displayName: string;
  photoURL?: string;
  timestamp: { _seconds: number, _nanoseconds: number } | string | Date; 
  status: 'here' | 'going';
  icebreaker?: string;
  visibility?: 'public' | 'friends_only' | 'anonymous';
  tags?: string[];
}

interface EventCheckInProps {
  eventId: string;
  eventDate: Date;
}

export function EventCheckIn({ eventId, eventDate }: EventCheckInProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [userStatus, setUserStatus] = useState<'here' | 'going' | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Rich Check-in State
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [icebreaker, setIcebreaker] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [tagsInput, setTagsInput] = useState("");
  
  // Wall Filter State
  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'here'
  
  const [showHelp, setShowHelp] = useState(false);

  const fetchCheckIns = useCallback(async () => {
    if (!eventId) return;
    try {
      const response = await apiClient.list_check_ins({ eventId });
      const data = await response.json();
      
      // Sort by timestamp desc
      const sortedData = data.sort((a: any, b: any) => {
        // Handle various timestamp formats (Firestore timestamp object, string, etc)
        const getTime = (t: any) => {
          if (t?._seconds) return t._seconds * 1000;
          if (typeof t === 'string') return new Date(t).getTime();
          return 0;
        };
        return getTime(b.timestamp) - getTime(a.timestamp);
      });

      setCheckins(sortedData as CheckIn[]);

      // Update current user status
      if (user) {
        const myCheckIn = sortedData.find((c: any) => c.userId === user.uid);
        setUserStatus(myCheckIn?.status || null);
      }
    } catch (error) {
      console.error("Error fetching check-ins:", error);
    }
  }, [eventId, user]);

  // Initial fetch and polling
  useEffect(() => {
    fetchCheckIns();
    const interval = setInterval(fetchCheckIns, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchCheckIns]);

  const handleRichCheckIn = async () => {
    if (!user) {
      toast.error("Please login to check in");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      // Parse tags
      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

      await apiClient.check_in_event({ eventId }, { 
        status: 'here',
        icebreaker,
        visibility: visibility as any, // Cast to match enum if needed
        tags
      });
      
      toast.success("You've checked in!");
      setIsCheckInOpen(false);
      setUserStatus('here');
      fetchCheckIns(); 
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in");
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleCheckIn = async (status: 'here' | 'going') => {
    if (!user) {
      toast.error("Please login to check in");
      navigate("/login");
      return;
    }

    // If status is 'here', we should use the rich check-in dialog instead, 
    // unless this function is called directly for some reason.
    // But for "Going", we keep simple check-in.
    
    setLoading(true);
    try {
      await apiClient.check_in_event({ eventId }, { status });
      toast.success("You're on the list!");
      fetchCheckIns();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to remove your check-in?")) return;

    setLoading(true);
    try {
      await apiClient.remove_check_in({ eventId });
      toast.success("You've been removed from the list");
      setUserStatus(null); // Optimistic update
      fetchCheckIns(); // Refresh immediately
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("Failed to remove check-in");
    } finally {
      setLoading(false);
    }
  };

  // Filter checkins based on active tab
  const filteredCheckins = checkins.filter(c => {
    // Hide anonymous users from the visible grid
    if (c.visibility === 'anonymous') return false;

    if (activeTab === 'here') return c.status === 'here';
    return true;
  });

  // Check if event is happening today (for "I'm Here" enablement)
  const isToday = new Date().toDateString() === new Date(eventDate).toDateString();
  // Or maybe allow it within 24 hours? Let's stick to simple logic for now.
  // The user asked for "Check In" as primary.
  
  const hereCount = checkins.filter(c => c.status === 'here').length;
  const goingCount = checkins.filter(c => c.status === 'going').length;

  // Helper to format timestamp safely
  const formatTime = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp?._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return 'Just now';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Live Networking Wall
              </h2>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                title="How it works"
              >
                <InfoIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              See who's here and break the ice!
            </p>
         </div>
         
         {/* Main Action Buttons */}
          <div className="flex gap-3 w-full md:w-auto">
            {userStatus === 'here' ? (
               <Button
                variant="default"
                className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                onClick={handleCheckOut}
                disabled={loading}
              >
                <MapPinIcon className="w-4 h-4 mr-2" />
                Checked In
              </Button>
            ) : (
              <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none border-green-600/50 text-green-500 hover:bg-green-500/10"
                    disabled={loading}
                  >
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    I'm Here
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Check In to Event</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Let others know you're here and what you're up for!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="icebreaker" className="text-purple-400">Icebreaker / Bio</Label>
                      <Input
                        id="icebreaker"
                        name="icebreaker"
                        placeholder="Ask me about... / Here to party!"
                        value={icebreaker}
                        onChange={(e) => setIcebreaker(e.target.value)}
                        className="bg-black/50 border-gray-700 focus:border-purple-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-purple-400">Visibility</Label>
                      <RadioGroup value={visibility} onValueChange={setVisibility} className="grid grid-cols-1 gap-2">
                        <div className={`flex items-center space-x-3 space-y-0 rounded-md border p-3 ${visibility === 'public' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700'}`}>
                          <RadioGroupItem value="public" id="public" />
                          <Label htmlFor="public" className="flex flex-1 items-center gap-2 cursor-pointer font-normal">
                             <Eye className="w-4 h-4 text-blue-400" />
                             <div>
                               <span className="font-semibold block">Public</span>
                               <span className="text-xs text-gray-400">Visible on the Networking Wall</span>
                             </div>
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-3 space-y-0 rounded-md border p-3 ${visibility === 'friends_only' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700'}`}>
                          <RadioGroupItem value="friends_only" id="friends_only" />
                          <Label htmlFor="friends_only" className="flex flex-1 items-center gap-2 cursor-pointer font-normal">
                             <Users className="w-4 h-4 text-green-400" />
                             <div>
                               <span className="font-semibold block">Friends Only</span>
                               <span className="text-xs text-gray-400">Visible only to friends</span>
                             </div>
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-3 space-y-0 rounded-md border p-3 ${visibility === 'anonymous' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700'}`}>
                          <RadioGroupItem value="anonymous" id="anonymous" />
                          <Label htmlFor="anonymous" className="flex flex-1 items-center gap-2 cursor-pointer font-normal">
                             <Ghost className="w-4 h-4 text-gray-400" />
                             <div>
                               <span className="font-semibold block">Incognito</span>
                               <span className="text-xs text-gray-400">Hidden from the list, but counted</span>
                             </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags" className="text-purple-400">Tags (Optional)</Label>
                      <Input
                        id="tags"
                        name="tags"
                        placeholder="Networking, Dancing, Tech (comma separated)"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="bg-black/50 border-gray-700 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCheckInOpen(false)} className="border-gray-700 text-gray-400 hover:text-white">Cancel</Button>
                    <Button onClick={handleRichCheckIn} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">Check In</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Button
              variant={userStatus === 'going' ? "default" : "outline"}
              className={`flex-1 md:flex-none ${userStatus === 'going' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-600/50 text-purple-400 hover:bg-purple-500/10'}`}
              onClick={() => userStatus === 'going' ? handleCheckOut() : handleSimpleCheckIn('going')}
              disabled={loading}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {userStatus === 'going' ? "Going" : "I'm Going"}
            </Button>
          </div>
      </div>
      
      {/* How It Works Guide */}
      {showHelp && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <InfoIcon className="w-4 h-4 text-purple-400" />
            How to use the Networking Wall
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="bg-purple-500/10 p-2 rounded-lg h-fit">
                <MapPinIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white text-sm font-medium mb-1">1. Check In</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Tap "I'm Here" to join the wall. Choose your visibility (Public, Friends Only, or Incognito).
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-pink-500/10 p-2 rounded-lg h-fit">
                <QrCodeIcon className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h4 className="text-white text-sm font-medium mb-1">2. Scan & Connect</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Scan other attendees' QR badges to view their profile and add them as a friend instantly.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg h-fit">
                <MessageCircleIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white text-sm font-medium mb-1">3. Break the Ice</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  See who's nearby and use their "Ask me about..." prompts to start a conversation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            All Guests ({goingCount + hereCount})
          </TabsTrigger>
          <TabsTrigger value="here" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Here Now ({hereCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid */}
      {filteredCheckins.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCheckins.map((checkin) => (
            <NetworkCard key={checkin.userId} checkin={checkin} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-gray-800 border-dashed">
          <Ghost className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No one found in this filter.</p>
        </div>
      )}
    </div>
  );
}

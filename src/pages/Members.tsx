import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, where, query, limit } from "firebase/firestore";
import { firestore as db } from "../utils/firebase";
import { useAuthStore } from "../utils/auth-store";
import { useFriendsStore } from "../utils/friends-store";
import { UserProfile } from "../utils/profile-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlusIcon, SearchIcon, LoaderIcon, UserIcon, MessageCircleIcon, TrashIcon, XCircleIcon, HeartIcon, CheckIcon, XIcon, MapPinIcon, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { ChatDialog } from "@/components/ChatDialog";
import { apiClient } from "app";
import { Leaderboard } from "@/components/Leaderboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  getAvatarFallbackText, 
  getRelationshipBorderColorClass, 
  getRelationshipGradientClass,
  getSafeImageUrl
} from "../utils/avatar-utils";
import { FriendRequest } from "../utils/friends-store";

interface Member {
  id: string;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  profileCompleted: boolean;
  location?: string;
  bio?: string;
  relationshipStatus?: string;
  createdAt: Date;
  isFriend: boolean;
  hasPendingRequest: boolean;
  hasReceivedRequest?: FriendRequest;
}

export default function Members() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    friends, 
    sentRequests, 
    receivedRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    cancelFriendRequest,
    fetchReceivedRequests,
    fetchSentRequests
  } = useFriendsStore();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isMilitaryFilter, setIsMilitaryFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRequestIds, setLoadingRequestIds] = useState<string[]>([]);
  
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("explore");

  // Initialize filters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('relationshipStatus');
    const filter = searchParams.get('filter');
    
    if (status) {
      setStatusFilter(status);
    } else {
      setStatusFilter(null);
    }

    if (filter === 'military') {
      setIsMilitaryFilter(true);
    } else {
      setIsMilitaryFilter(false);
    }
  }, [location.search]);

  // Load requests on mount
  useEffect(() => {
    if (user) {
      fetchReceivedRequests();
      fetchSentRequests();
    }
  }, [user, fetchReceivedRequests, fetchSentRequests]);
  
  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!user) {
        navigate("/login");
        return;
      }
      
      setIsLoading(true);
      try {
        // Base query conditions
        const constraints = [
          where("profileCompleted", "==", true),
          limit(100)
        ];

        // Add veteran filter if active
        if (isMilitaryFilter) {
          constraints.unshift(where("veteranStatus", "==", "verified"));
        }

        // Get all members who have completed their profile
        const membersQuery = query(
          collection(db, "users"),
          ...constraints
        );
        
        const snapshot = await getDocs(membersQuery);
        
        // Extract current friends IDs and pending request IDs
        const friendIds = friends.map(friend => friend.userId);
        const pendingRequestIds = sentRequests.map(req => req.receiverId);
        
        // Create a map of sender IDs to received requests for O(1) lookup
        const receivedRequestMap = new Map();
        receivedRequests.forEach(req => {
            receivedRequestMap.set(req.senderId, req);
        });
        
        // Map to member objects
        const membersList: Member[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          
          // Skip the current user
          if (doc.id === user.uid) return;

          // Skip private profiles
          if (data.isPrivate) return;

          // Extra safety check for military filter on client side in case of index issues (or if we want to be doubly sure)
          if (isMilitaryFilter && data.veteranStatus !== 'verified') return;
          
          membersList.push({
            id: doc.id,
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            profileCompleted: data.profileCompleted,
            location: data.location,
            bio: data.bio,
            relationshipStatus: data.relationshipStatus,
            createdAt: data.createdAt?.toDate() || new Date(),
            isFriend: friendIds.includes(doc.id),
            hasPendingRequest: pendingRequestIds.includes(doc.id),
            hasReceivedRequest: receivedRequestMap.get(doc.id)
          });
        });
        
        // Sort by newest members first
        membersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setMembers(membersList);
        // Initial filter will be handled by the filter effect
      } catch (error) {
        console.error("Error loading members:", error);
        toast.error("Failed to load members");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMembers();
  }, [user, navigate, friends, sentRequests, receivedRequests, isMilitaryFilter]);
  
  // Handle search and filtering
  useEffect(() => {
    let result = members;

    // Filter by relationship status
    if (statusFilter) {
      result = result.filter(member => member.relationshipStatus === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        member => 
          member.displayName?.toLowerCase().includes(term) ||
          member.location?.toLowerCase().includes(term)
      );
    }
    
    setFilteredMembers(result);
  }, [searchTerm, statusFilter, members]);
  
  // Clear status filter
  const clearStatusFilter = () => {
    setStatusFilter(null);
    // Update URL without reloading (keep military filter if present)
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('relationshipStatus');
    navigate(`/members?${searchParams.toString()}`, { replace: true });
  };

  const clearMilitaryFilter = () => {
    setIsMilitaryFilter(false);
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('filter');
    navigate(`/members?${searchParams.toString()}`, { replace: true });
  }
  
  // Handle friend request
  const handleFriendRequest = async (memberId: string) => {
    if (loadingRequestIds.includes(memberId)) return;
    
    setLoadingRequestIds(prev => [...prev, memberId]);
    try {
      const result = await sendFriendRequest(memberId);
      
      if (result) {
        toast.success("Friend request sent!");
        
        // Update local state
        setMembers(prev => 
          prev.map(member => 
            member.id === memberId 
              ? { ...member, hasPendingRequest: true } 
              : member
          )
        );
        
        setFilteredMembers(prev => 
          prev.map(member => 
            member.id === memberId 
              ? { ...member, hasPendingRequest: true } 
              : member
          )
        );
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setLoadingRequestIds(prev => prev.filter(id => id !== memberId));
    }
  };
  
  // View profile
  const viewProfile = (memberId: string) => {
    navigate(`/member?id=${memberId}`);
  };
  
  const handleMessage = (member: Member) => {
    setSelectedMember(member);
    setIsChatOpen(true);
  };
  
  // Handle delete user
  const handleDeleteUser = async (uid: string) => {
    if (!user?.isAdmin) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete_user({ uid });
      
      // Remove user from local state
      setMembers(prev => prev.filter(m => m.uid !== uid));
      setFilteredMembers(prev => prev.filter(m => m.uid !== uid));
      
      toast.success("User deleted successfully");
      setMemberToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (!user) return null;
  
  // Helper to find user details for requests (since store only has request data)
  // In a real app we might want to fetch these users or include them in the request data
  // For now we'll try to match with loaded members or show a placeholder
  const getRequestUserDetails = (userId: string) => {
    const member = members.find(m => m.uid === userId);
    return member || { 
      displayName: "Unknown User", 
      photoURL: null, 
      id: "unknown",
      uid: userId 
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-gray-900 text-white pt-16 px-4 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 mb-2 neo-glow glow-text">
            {isMilitaryFilter ? "Military Community" : "Community Members"}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {isMilitaryFilter 
              ? "Connect with verified veterans and service members" 
              : "Discover and connect with other members of the ScanMe community"}
          </p>
        </div>
        
        <Tabs defaultValue="explore" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-gray-900/80 border border-gray-800 p-1">
              <TabsTrigger value="explore" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-6">
                Explore
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-6">
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-6 relative">
                Requests
                {receivedRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                    {receivedRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-6">
                Sent
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="explore" className="space-y-8">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row items-center gap-4 max-w-2xl mx-auto w-full">
              {/* Search bar */}
              <div className="relative w-full md:flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900/60 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="w-full md:w-48">
                <Select 
                  value={statusFilter || "all"} 
                  onValueChange={(val) => {
                    const newValue = val === "all" ? null : val;
                    if (newValue) {
                      navigate(`/members?relationshipStatus=${encodeURIComponent(newValue)}`);
                    } else {
                      navigate('/members');
                    }
                  }}
                >
                  <SelectTrigger className="bg-gray-900/60 border-gray-700 text-white w-full">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Looking">Looking</SelectItem>
                    <SelectItem value="Just Friends">Just Friends</SelectItem>
                    <SelectItem value="Taken">Taken</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Active Filter Badge - Display if status filter is active */}
            <div className="flex justify-center -mt-4 gap-2 flex-wrap">
              {isMilitaryFilter && (
                <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/30 px-3 py-1.5 rounded-full text-sm text-green-200 animate-in fade-in zoom-in duration-300">
                  <Shield className="h-3 w-3 fill-green-400/20" />
                  <span>Verified Veterans Only</span>
                  <button 
                    onClick={clearMilitaryFilter}
                    className="ml-1 hover:text-white transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              {statusFilter && (
                <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 px-3 py-1.5 rounded-full text-sm text-purple-200 animate-in fade-in zoom-in duration-300">
                  <HeartIcon className="h-3 w-3 fill-purple-400/20" />
                  <span>Status: {statusFilter}</span>
                  <button 
                    onClick={clearStatusFilter}
                    className="ml-1 hover:text-white transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoaderIcon className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map(member => {
                  // Check if user is online (active in last 5 minutes)
                  const isOnline = member.lastActive && (new Date().getTime() - member.lastActive.getTime() < 5 * 60 * 1000);
                  
                  return (
                    <Card 
                      key={member.id} 
                      className={`bg-black/40 border transition-all duration-300 overflow-hidden group hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] relative backdrop-blur-sm ${
                        isOnline ? 'border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-purple-500/20'
                      }`}
                    >
                      {/* Cyberpunk/Nightlife decorative elements */}
                      <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent ${isOnline ? 'via-green-500' : 'via-purple-500'} to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all"></div>
                      
                      <CardHeader className="relative z-10 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className={`h-16 w-16 ring-2 ring-offset-2 ring-offset-black transition-all ${
                                getRelationshipBorderColorClass(member.relationshipStatus, isOnline)
                              }`}>
                                <AvatarImage src={getSafeImageUrl(member.photoURL)} className="object-cover" />
                                <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(member.relationshipStatus)} text-white font-bold text-lg`}>
                                  {getAvatarFallbackText(member.displayName, member.relationshipStatus as any)}
                                </AvatarFallback>
                              </Avatar>
                              {/* Online/Status Indicator */}
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
                              )}
                            </div>
                            
                            <div className="flex flex-col">
                              <CardTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-white group-hover:to-purple-200 transition-all mb-1">
                                {member.displayName || "User"}
                              </CardTitle>
                              
                              <div className="flex items-center gap-2">
                                {member.location && (
                                  <Badge variant="outline" className="text-[10px] bg-black/50 border-purple-500/30 text-purple-300 px-2 py-0.5 h-5 font-normal">
                                    <MapPinIcon className="w-3 h-3 mr-1" />
                                    {member.location}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Joined Date as a "Member Since" badge style */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Joined</span>
                            <span className="text-xs text-gray-400 font-mono">{format(member.createdAt, 'MMM yyyy')}</span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4 pt-2 relative z-10">
                        {/* Relationship Status - Prominent if available */}
                        {member.relationshipStatus && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              navigate(`/members?relationshipStatus=${encodeURIComponent(member.relationshipStatus || '')}`);
                            }}
                            className="flex items-center gap-2 py-1 px-3 bg-white/5 rounded-full w-fit border border-white/5 backdrop-blur-md cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group/status"
                          >
                            <HeartIcon className={`h-3 w-3 ${member.relationshipStatus === 'Single' ? 'text-green-400 fill-green-400/20' : 'text-purple-400 fill-purple-400/20'}`} />
                            <span className="text-xs font-medium text-gray-300 group-hover/status:text-white transition-colors">{member.relationshipStatus}</span>
                          </div>
                        )}

                        {(member.isFriend || member.uid === user?.uid) && member.bio && (
                          <p className="text-sm text-gray-400 line-clamp-2 italic border-l-2 border-purple-500/30 pl-3">
                            "{member.bio}"
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button 
                            onClick={() => viewProfile(member.id)}
                            variant="ghost"
                            className="bg-gray-800/40 hover:bg-gray-700/50 hover:text-white border border-gray-700/30 h-9"
                          >
                            <UserIcon className="mr-2 h-4 w-4" />
                            Profile
                          </Button>
                          
                          {!member.isFriend && !member.hasPendingRequest && !member.hasReceivedRequest ? (
                            <Button 
                              onClick={() => handleFriendRequest(member.id)}
                              className="bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white border-none transition-all h-9"
                              disabled={loadingRequestIds.includes(member.id)}
                            >
                              {loadingRequestIds.includes(member.id) ? (
                                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlusIcon className="mr-2 h-4 w-4" />
                              )}
                              {loadingRequestIds.includes(member.id) ? "Sending..." : "Add"}
                            </Button>
                          ) : member.hasPendingRequest ? (
                            <Button 
                              disabled 
                              className="bg-black/50 border border-gray-700 text-gray-400 h-9"
                            >
                              Sent
                            </Button>
                          ) : member.hasReceivedRequest ? (
                            <Button 
                              onClick={() => acceptFriendRequest(member.hasReceivedRequest!.id)}
                              className="bg-green-600 hover:bg-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] text-white border-none transition-all h-9"
                            >
                              <CheckIcon className="mr-2 h-4 w-4" />
                              Accept
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleMessage(member)}
                              className="bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white border-none transition-all h-9"
                            >
                              <MessageCircleIcon className="mr-2 h-4 w-4" />
                              Chat
                            </Button>
                          )}
                        </div>

                          {user?.isAdmin && (
                            <AlertDialog open={memberToDelete === member.uid} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="w-full mt-2 h-6 text-[10px] text-red-500/70 hover:text-red-400 hover:bg-red-950/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemberToDelete(member.uid);
                                  }}
                                >
                                  <TrashIcon className="mr-2 h-3 w-3" />
                                  Admin: Delete User
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {member.displayName || "User"}?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-400">
                                    Are you sure you want to permanently delete this user? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel 
                                    className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                                    onClick={() => setMemberToDelete(null)}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(member.uid)} 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? "Deleting..." : "Delete User"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-xl font-medium mb-2">No members found</p>
                <p>Try adjusting your search criteria</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-24 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-xl font-medium text-gray-400 mb-2">No pending requests</p>
                <p className="text-gray-500">When someone adds you, they'll show up here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {receivedRequests.map(request => {
                  // Prefer the sender details from the request object (populated by store)
                  // Fallback to local lookup or unknown
                  const sender = request.sender || getRequestUserDetails(request.senderId);
                  
                  return (
                    <Card key={request.id} className="bg-gray-900/60 border border-gray-800">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                           <Avatar className="h-12 w-12">
                              <AvatarImage src={sender.photoURL || undefined} />
                              <AvatarFallback>{sender.displayName ? sender.displayName[0] : "?"}</AvatarFallback>
                           </Avatar>
                           <div>
                             <CardTitle className="text-base">{sender.displayName || "User"}</CardTitle>
                             <p className="text-xs text-gray-500">{formatDistanceToNow(request.createdAt)} ago</p>
                             {request.location?.address && (
                               <p className="text-xs text-purple-400 flex items-center gap-1 mt-1">
                                 <MapPinIcon className="w-3 h-3" />
                                 {request.location.address}
                               </p>
                             )}
                           </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                            onClick={() => acceptFriendRequest(request.id)}
                          >
                            <CheckIcon className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button 
                            variant="outline"
                            className="flex-1 bg-transparent border-gray-700 hover:bg-gray-800"
                            onClick={() => declineFriendRequest(request.id)}
                          >
                            <XIcon className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {sentRequests.length === 0 ? (
              <div className="text-center py-24 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
                <UserIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-xl font-medium text-gray-400 mb-2">No sent requests</p>
                <p className="text-gray-500">Go to Explore to find people to connect with</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sentRequests.map(request => {
                  const receiver = request.receiver || getRequestUserDetails(request.receiverId);
                  
                  return (
                    <Card key={request.id} className="bg-gray-900/60 border border-gray-800">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                           <Avatar className="h-12 w-12">
                              <AvatarImage src={receiver.photoURL || undefined} />
                              <AvatarFallback>{receiver.displayName ? receiver.displayName[0] : "?"}</AvatarFallback>
                           </Avatar>
                           <div>
                             <CardTitle className="text-base">{receiver.displayName || "User"}</CardTitle>
                             <p className="text-xs text-gray-500">Sent {formatDistanceToNow(request.createdAt)} ago</p>
                           </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant="outline"
                          className="w-full bg-transparent border-gray-700 hover:bg-gray-800 hover:text-red-400"
                          onClick={() => cancelFriendRequest(request.id)}
                        >
                          <XIcon className="w-4 h-4 mr-2" />
                          Cancel Request
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <ChatDialog 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        friend={selectedMember ? {
          id: selectedMember.id,
          userId: selectedMember.uid,
          displayName: selectedMember.displayName,
          photoURL: selectedMember.photoURL,
          addedAt: new Date()
        } : null}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { firestore as db } from "../utils/firebase";
import { useAuthStore } from "../utils/auth-store";
import { UserProfile } from "../utils/profile-store";
import { useFriendsStore, Friend } from "../utils/friends-store";
import { usePostStore, Post } from "../utils/post-store";
import { useMediaGalleryStore, Media, MediaType } from "../utils/media-gallery-store";
import { ChatDialog } from "@/components/ChatDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlusIcon, UserCheckIcon, LoaderIcon, HeartIcon, MessageCircleIcon, ImageIcon, ArrowLeftIcon, InstagramIcon, FacebookIcon, TwitterIcon, AtSignIcon, LockIcon, TrashIcon, UsersIcon } from "lucide-react";
import { FaTiktok, FaSoundcloud } from "react-icons/fa";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiClient } from "app";
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
import { MapPinIcon, CalendarIcon, MoreVerticalIcon, ShareIcon, FlagIcon, GlobeIcon, CheckIcon, XIcon, ShieldCheckIcon, ShieldAlertIcon, MusicIcon, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
// Lazy load ReactPlayer to prevent "static flag" errors
// const ReactPlayer = React.lazy(() => import("react-player"));
import { SafeVideoPlayer } from "@/components/SafeVideoPlayer";
import { 
  getAvatarFallbackText, 
  getRelationshipGradientClass, 
  getRelationshipBorderColorClass,
  getSafeImageUrl
} from "../utils/avatar-utils";

interface MemberProfile extends UserProfile {
  id: string;
}

interface PartnerProfile {
  id: string;
  displayName: string | null;
  photoURL: string | null;
}

export default function Member() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract ID from search params
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');
  
  // Extract event check-in data if available
  const eventCheckIn = location.state?.eventCheckIn;

  const { user } = useAuthStore();
  const { friends, memberFriends, sentRequests, receivedRequests, sendFriendRequest, acceptFriendRequest, fetchFriends, fetchMemberFriends } = useFriendsStore();
  const { fetchUserPosts } = usePostStore();
  const { fetchUserMedia } = useMediaGalleryStore();
  
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper to get Spotify Embed URL
  const getSpotifyEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    
    // Extract type and id from standard spotify url
    // Matches: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID
    const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    
    if (match && match[1] && match[2]) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    
    return null;
  };

  // Helper to get Apple Music Embed URL
  const getAppleMusicEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    
    // Replace music.apple.com with embed.music.apple.com
    // Matches: https://music.apple.com/us/album/album-name/id12345
    if (url.includes("music.apple.com")) {
      return url.replace("music.apple.com", "embed.music.apple.com");
    }
    
    return null;
  };

  // Helper to get SoundCloud Embed URL
  const getSoundCloudEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    if (!url.includes("soundcloud.com")) return null;
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  };
  
  // If no ID found, redirect to members list
  useEffect(() => {
    if (!id && !isLoading) {
      navigate('/members');
    }
  }, [id, isLoading, navigate]);

  // Handle auto-open chat action
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    
    if (action === 'chat' && !isLoading && profile) {
      setIsChatOpen(true);
      
      // Remove the action param so it doesn't trigger again on re-renders
      params.delete('action');
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
    }
  }, [location.search, isLoading, profile, navigate, location.pathname]);
  
  // Derived states
  const isSelf = user?.uid === id;
  const isFriend = friends.some(friend => friend.userId === id);
  const hasPendingRequest = sentRequests.some(req => req.receiverId === id);
  const hasReceivedRequest = receivedRequests.find(req => req.senderId === id);
  const isAdmin = user?.isAdmin || false;
  
  // Load member profile
  useEffect(() => {
    const loadMemberProfile = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const profileRef = doc(db, "users", id);
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          setError("Member not found");
          setIsLoading(false);
          return;
        }
        
        const profileData = profileSnap.data() as UserProfile;
        setProfile({
          ...profileData,
          id: profileSnap.id
        });
        
        // Fetch partner profile if exists
        if (profileData.partnerId) {
          try {
            const partnerRef = doc(db, "users", profileData.partnerId);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
              const partnerData = partnerSnap.data() as UserProfile;
              setPartnerProfile({
                id: partnerSnap.id,
                displayName: partnerData.displayName,
                photoURL: partnerData.photoURL
              });
            }
          } catch (err) {
            console.error("Error fetching partner profile:", err);
          }
        } else {
          setPartnerProfile(null);
        }
        
        // Fetch real posts and media for this member
        try {
          const fetchedPosts = await fetchUserPosts(id);
          setPosts(fetchedPosts);
        } catch (err) {
          console.error("Error fetching posts:", err);
        }

        try {
          const fetchedMedia = await fetchUserMedia(id);
          setMedia(fetchedMedia);
        } catch (err) {
          console.error("Error fetching media:", err);
        }

        try {
          await fetchMemberFriends(id);
        } catch (err) {
          console.error("Error fetching member friends:", err);
        }
      } catch (error) {
        console.error("Error loading member profile:", error);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMemberProfile();
    
    // Load friends to check relationship status
    if (user) {
      fetchFriends();
    }
  }, [id, fetchFriends, fetchUserPosts, fetchUserMedia, user]);

  // Helper to safely construct YouTube embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return "";
    // Check if URL already has query params
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}autoplay=1&playsinline=1`;
  };
  
  // Handle send friend request
  const handleSendFriendRequest = async () => {
    if (!user) {
      toast.error("Please sign up to add friends");
      navigate('/signup');
      return;
    }

    if (isSendingRequest || !id || isFriend || hasPendingRequest) return;
    
    setIsSendingRequest(true);
    try {
      const result = await sendFriendRequest(id);
      if (result) {
        toast.success("Friend request sent!");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!hasReceivedRequest) return;
    try {
      await acceptFriendRequest(hasReceivedRequest.id);
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!id || !isAdmin) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete_user({ uid: id });
      toast.success("User deleted successfully");
      navigate("/members");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoaderIcon className="h-12 w-12 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black space-y-4 p-4">
        <div className="text-2xl font-bold text-red-500">{error || "Profile not found"}</div>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-gray-900 pt-16 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button 
          onClick={() => navigate(-1)} 
          variant="ghost" 
          size="sm" 
          className="mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {/* Event Icebreaker Banner */}
        {eventCheckIn && eventCheckIn.icebreaker && (
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-4 mb-6 animate-in slide-in-from-top-4 fade-in duration-500">
             <div className="flex items-start gap-3">
               <div className="bg-purple-500/20 p-2 rounded-full">
                 <PartyPopper className="w-5 h-5 text-purple-300" />
               </div>
               <div>
                 <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">Live Event Icebreaker</p>
                 <p className="text-lg text-white font-medium italic">"{eventCheckIn.icebreaker}"</p>
                 {eventCheckIn.tags && eventCheckIn.tags.length > 0 && (
                   <div className="flex flex-wrap gap-2 mt-3">
                     {eventCheckIn.tags.map((tag: string, i: number) => (
                       <Badge key={i} variant="secondary" className="bg-white/10 text-purple-200 hover:bg-white/20 border-0">
                         {tag}
                       </Badge>
                     ))}
                   </div>
                 )}
               </div>
             </div>
          </div>
        )}

        {/* Profile header */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 mb-8 backdrop-blur-sm relative overflow-hidden shadow-lg">
          {/* Diagonal lines decoration */}
          <div className="absolute top-0 left-0 right-0 h-20 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_25%,rgba(255,255,255,0.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.2)_75%)]" 
            style={{ backgroundSize: '8px 8px' }} />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <Avatar className={`h-24 w-24 md:h-32 md:w-32 ring-4 ring-offset-2 ring-offset-gray-950 ${getRelationshipBorderColorClass(profile.relationshipStatus)}`}>
              <AvatarImage src={getSafeImageUrl(profile.photoURL)} />
              <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(profile.relationshipStatus)} text-2xl`}>
                {getAvatarFallbackText(profile.displayName, profile.relationshipStatus)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold">
                {profile.displayName || "User"}
              </h1>
              
              {(isSelf || isFriend || isAdmin) && (
                <>
                  {profile.location && (
                    <div className="mt-1 mb-3">
                      <Badge variant="outline" className="bg-gray-800/50">
                        {profile.location}
                      </Badge>
                    </div>
                  )}
                  
                  {profile.bio && (
                    <p className="text-gray-400 mt-2 mb-4">{profile.bio}</p>
                  )}
                  
                  {/* Social Media Links */}
                  <div className="flex gap-3 mt-3 mb-4 justify-center md:justify-start">
                    {profile.instagram && (
                      <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                        <InstagramIcon className="h-5 w-5" />
                      </a>
                    )}
                    {profile.facebook && (
                      <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                        <FacebookIcon className="h-5 w-5" />
                      </a>
                    )}
                    {profile.twitter && (
                      <a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                        <TwitterIcon className="h-5 w-5" />
                      </a>
                    )}
                    {profile.tiktok && (
                      <a href={profile.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                        <FaTiktok className="h-5 w-5" />
                      </a>
                    )}
                    {profile.soundcloudUrl && (
                      <a href={profile.soundcloudUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors">
                        <FaSoundcloud className="h-5 w-5" />
                      </a>
                    )}
                    {profile.threads && (
                      <a href={profile.threads} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                        <AtSignIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </>
              )}

              {!isSelf && (
                <div className="mt-4">
                  {!user ? (
                    <Button 
                      onClick={() => navigate('/signup')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <UserPlusIcon className="mr-2 h-4 w-4" />
                      Sign Up to Connect
                    </Button>
                  ) : isFriend ? (
                    <Button 
                      onClick={() => setIsChatOpen(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <MessageCircleIcon className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  ) : hasReceivedRequest ? (
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={handleAcceptRequest}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <UserCheckIcon className="mr-2 h-4 w-4" />
                        Accept Request
                      </Button>
                      {hasReceivedRequest.location?.address && (
                        <p className="text-xs text-purple-400 flex items-center gap-1 justify-center md:justify-start">
                          <MapPinIcon className="w-3 h-3" />
                          Scanned at {hasReceivedRequest.location.address}
                        </p>
                      )}
                    </div>
                  ) : hasPendingRequest ? (
                    <Button disabled className="bg-gray-800 hover:bg-gray-800 cursor-not-allowed">
                      Request Sent
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSendFriendRequest}
                      disabled={isSendingRequest}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {isSendingRequest ? (
                        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlusIcon className="mr-2 h-4 w-4" />
                      )}
                      {isSendingRequest ? "Sending..." : "Add Friend"}
                    </Button>
                  )}
                  
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="ml-2" disabled={isDeleting}>
                          {isDeleting ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4 mr-2" />}
                          Delete User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            This action cannot be undone. This will permanently delete the user account
                            and remove their data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700 text-white">
                            {isDeleting ? "Deleting..." : "Delete User"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>

            {/* Relationship Status Display */}
            {(isSelf || isFriend || isAdmin) && profile.relationshipStatus && (
              <div 
                className="flex flex-col items-end gap-2 mt-4 md:mt-0"
              >
                <div 
                  onClick={() => navigate(`/members?relationshipStatus=${encodeURIComponent(profile.relationshipStatus || '')}`)}
                  className="flex flex-col items-center md:items-end min-w-max px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1 group-hover:text-purple-300 transition-colors">Relationship Status</span>
                  <div className="flex items-center text-xl md:text-2xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors">
                    <HeartIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 fill-purple-400/20" />
                    {profile.relationshipStatus}
                  </div>
                </div>

                {partnerProfile && (
                  <div 
                    onClick={() => navigate(`/member?id=${partnerProfile.id}`)}
                    className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Partner</p>
                      <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">{partnerProfile.displayName}</p>
                    </div>
                    <Avatar className="h-8 w-8 ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all">
                      <AvatarImage src={getSafeImageUrl(partnerProfile.photoURL)} />
                      <AvatarFallback className="text-xs bg-purple-900/50 text-purple-200">
                        {partnerProfile.displayName?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spotify Profile Anthem */}
          {(isSelf || isFriend || isAdmin) && profile.spotifyUrl && getSpotifyEmbedUrl(profile.spotifyUrl) && (
            <div className="mt-6 border-t border-gray-800 pt-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-purple-400">
                <MusicIcon className="h-4 w-4" /> 
                Profile Anthem
              </h3>
              <div className="rounded-xl overflow-hidden shadow-lg bg-black/40 max-w-md">
                <iframe 
                  src={getSpotifyEmbedUrl(profile.spotifyUrl)} 
                  width="100%" 
                  height="80" 
                  frameBorder="0" 
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                  loading="lazy"
                  className="bg-transparent"
                ></iframe>
              </div>
            </div>
          )}

          {/* SoundCloud Profile Anthem */}
          {(isSelf || isFriend || isAdmin) && profile.soundcloudUrl && getSoundCloudEmbedUrl(profile.soundcloudUrl) && (
            <div className="mt-6 border-t border-gray-800 pt-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-orange-500">
                <FaSoundcloud className="h-4 w-4" /> 
                SoundCloud
              </h3>
              <div className="rounded-xl overflow-hidden shadow-lg bg-black/40 max-w-md">
                <iframe 
                  width="100%" 
                  height="166" 
                  scrolling="no" 
                  frameBorder="no" 
                  allow="autoplay" 
                  src={getSoundCloudEmbedUrl(profile.soundcloudUrl) || ""}
                ></iframe>
              </div>
            </div>
          )}
        </div>
        
        {/* Content restricted to friends/self/admin */}
        {(isSelf || isFriend || isAdmin) ? (
          /* Content tabs */
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-900/30">
              <TabsTrigger value="posts" className="text-lg py-3">
                Posts
              </TabsTrigger>
              <TabsTrigger value="media" className="text-lg py-3">
                Media
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-lg py-3">
                Friends
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-0">
              <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                <CardContent className="pt-6">
                  {posts.length > 0 ? (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <div key={post.id} className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={getSafeImageUrl(post.authorPhotoURL)} alt={post.authorName} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                                {post.authorName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{post.authorName}</p>
                                {post.isSensitive && (
                                  <Badge variant="destructive" className="text-[10px] px-1 h-5">
                                    18+
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{format(post.createdAt, 'PPp')}</p>
                            </div>
                          </div>
                          
                          <p className="text-gray-100 whitespace-pre-line mb-3">{post.content}</p>
                          
                          {post.imageURL && (
                            <div className="mb-3 rounded-lg overflow-hidden">
                              <img 
                                src={post.imageURL} 
                                alt="Post image" 
                                className="w-full h-auto object-cover max-h-[500px]"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-gray-400">
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="h-4 w-4" />
                              <span>{post.likes.length}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageCircleIcon className="h-4 w-4" />
                              <span>{post.comments.length}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircleIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                      <p>{profile?.displayName || 'User'} hasn't posted anything yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="media" className="mt-0">
              <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                <CardContent className="pt-6">
                  {media.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {media.map((item) => (
                        <div 
                          key={item.id} 
                          className="relative group overflow-hidden rounded-lg aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedMedia(item)}
                        >
                          {item.type === MediaType.IMAGE ? (
                            <img 
                              src={item.url} 
                              alt={item.title || "Image"} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <img 
                                src={item.thumbnail || (item.type === MediaType.YOUTUBE ? `https://img.youtube.com/vi/${item.url.split('/').pop()}/hqdefault.jpg` : "https://via.placeholder.com/200x112?text=Video")} 
                                alt={item.title || "Video"} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/50 rounded-full p-2 group-hover:bg-red-600/80 transition-colors">
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="text-white"
                                  >
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                </div>
                              </div>
                              {item.type === MediaType.YOUTUBE && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  YOUTUBE
                                </div>
                              )}
                            </div>
                          )}
                          {item.title && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <p className="text-white text-sm truncate w-full">
                                {item.title}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <ImageIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                      <p>{profile?.displayName || 'User'} hasn't uploaded any photos yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="friends" className="mt-0">
              <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                <CardContent className="pt-6">
                  {memberFriends.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {memberFriends.map((friend) => (
                        <div 
                          key={friend.userId} 
                          className="flex flex-col items-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:bg-gray-800/60 transition-all cursor-pointer group"
                          onClick={() => navigate(`/member?id=${friend.userId}`)}
                        >
                          <Avatar className={`h-20 w-20 mb-3 ring-2 ring-offset-2 ring-offset-gray-900 ${getRelationshipBorderColorClass(friend.relationshipStatus)}`}>
                            <AvatarImage src={getSafeImageUrl(friend.photoURL)} />
                            <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(friend.relationshipStatus)} text-xl`}>
                              {getAvatarFallbackText(friend.displayName, friend.relationshipStatus)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-center truncate w-full group-hover:text-purple-400 transition-colors">
                            {friend.displayName || "User"}
                          </p>
                          {friend.relationshipStatus && (
                            <Badge variant="outline" className="mt-2 text-[10px] border-gray-700 text-gray-400">
                              {friend.relationshipStatus}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                     <div className="text-center py-8 text-gray-400">
                      <UsersIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                      <p>{profile?.displayName || 'User'} has no friends yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Private Profile View */
          <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="bg-gray-800/50 p-4 rounded-full mb-6">
                <LockIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">This Account is Private</h3>
              <p className="text-gray-400 mb-8 max-w-md">
                You must be friends with <span className="text-white font-semibold">{profile.displayName || "this user"}</span> to see their posts, photos, and other activity.
              </p>
              
              {hasPendingRequest ? (
                <Button disabled className="bg-gray-800 hover:bg-gray-800 cursor-not-allowed min-w-[150px]">
                  <UserCheckIcon className="mr-2 h-4 w-4" />
                  Request Sent
                </Button>
              ) : hasReceivedRequest ? (
                <div className="flex flex-col gap-2 items-center">
                  <Button 
                    onClick={handleAcceptRequest}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-w-[150px]"
                  >
                    <UserCheckIcon className="mr-2 h-4 w-4" />
                    Accept Request
                  </Button>
                  {hasReceivedRequest.location?.address && (
                    <p className="text-xs text-purple-400 flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      Scanned at {hasReceivedRequest.location.address}
                    </p>
                  )}
                </div>
              ) : !user ? (
                <Button 
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-w-[150px]"
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Sign Up to Connect
                </Button>
              ) : (
                <Button 
                  onClick={handleSendFriendRequest}
                  disabled={isSendingRequest}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 min-w-[150px]"
                >
                  {isSendingRequest ? (
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlusIcon className="mr-2 h-4 w-4" />
                  )}
                  Add Friend to View
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {profile && (
        <ChatDialog 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          friend={{
            id: profile.id,
            userId: profile.uid,
            displayName: profile.displayName,
            photoURL: profile.photoURL,
            addedAt: new Date()
          }} 
        />
      )}

      {/* Media Viewer Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="sm:max-w-4xl p-0 bg-black border-gray-800 overflow-hidden text-white">
          <DialogHeader className="p-4 absolute z-10 w-full bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
             <DialogTitle className="text-white drop-shadow-md pointer-events-auto flex justify-between items-start">
               <span className="truncate pr-8">{selectedMedia?.title || "Media"}</span>
             </DialogTitle>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center bg-black min-h-[300px] md:min-h-[500px] relative p-4">
            {selectedMedia?.type === MediaType.IMAGE && (
              <img 
                src={selectedMedia.url} 
                alt={selectedMedia.title || "Full size"} 
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
            {(selectedMedia?.type === MediaType.VIDEO || selectedMedia?.type === MediaType.YOUTUBE) && (
              <div className="w-full max-w-5xl flex flex-col items-center justify-center">
                <div className="w-full aspect-video bg-black relative flex items-center justify-center">
                    <SafeVideoPlayer
                      url={selectedMedia.url}
                      playing={true}
                      controls={true}
                      width="100%"
                      height="100%"
                      playsinline={true}
                      config={{
                        file: {
                          attributes: {
                            playsInline: true,
                            controlsList: 'nodownload'
                          }
                        }
                      }}
                    />
                </div>
                <div className="w-full mt-4 text-left">
                  <h3 className="text-xl font-bold text-white">{selectedMedia.title || "Video"}</h3>
                  <p className="text-gray-400 text-sm">{format(new Date(selectedMedia.createdAt), 'PPp')}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

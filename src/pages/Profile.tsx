import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Logo } from "components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../utils/auth-store";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Camera as CameraIcon, 
  Heart as HeartIcon, 
  Activity as ActivityIcon,
  MapPin as MapPinIcon, 
  Settings as SettingsIcon, 
  Share2 as ShareIcon, 
  UserPlus as UserPlusIcon,
  LogOut as LogOutIcon,
  MessageSquare as MessageIcon,
  X as XIcon,
  Check as CheckIcon,
  Instagram as InstagramIcon, 
  Facebook as FacebookIcon, 
  Twitter as TwitterIcon, 
  AtSign as AtSignIcon, 
  ShoppingBag as ShoppingBagIcon, 
  Music as MusicIcon, 
  Video as VideoIcon, 
  Play as PlayIcon, 
  Pause as PauseIcon, 
  Square as SquareIcon,
  Trash as TrashIcon, 
  Pencil as PencilIcon, 
  UserMinus as UserMinusIcon, 
  Phone as PhoneIcon, 
  Maximize2 as Maximize2Icon, 
  Smartphone as SmartphoneIcon, 
  Plus as PlusIcon,
  Printer as PrinterIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  User as UserIcon,
  Users as UsersIcon,
  MessageCircle as MessageCircleIcon,
  Shield
} from "lucide-react";
import html2canvas from "html2canvas";
import { FaTiktok, FaSoundcloud } from "react-icons/fa";
import { SocialShareCard } from "@/components/SocialShareCard";
// import ReactPlayer from "react-player"; // Removed to use lazy load
import { APP_BASE_PATH } from "app";
import { format } from "date-fns";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore as db } from "../utils/firebase";
import { toast } from "sonner";
import { useProfileStore, checkAndRedirectProfile } from "../utils/profile-store";
import { usePostStore, Post, Comment } from "../utils/post-store";
import { useMediaGalleryStore, MediaType, Media } from "../utils/media-gallery-store";
import { useFriendsStore, Friend, FriendRequest, FriendRequestStatus } from "../utils/friends-store";
import { useChatStore } from "../utils/chat-store";
import { PRODUCTION_URL } from "../utils/config";
import { ChatDialog } from "@/components/ChatDialog";
import { PostCard } from "@/components/PostCard";
import { MediaViewerDialog } from "@/components/MediaViewerDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FriendConstellation } from "@/components/FriendConstellation";
import { usePwaStore } from "../utils/pwa-store";
import { AvatarCreator } from "@/components/AvatarCreator";
import { usePresenceStore } from "../utils/presence-store";
import { getAvatarFallbackText, getRelationshipGradientClass, getSafeImageUrl } from "../utils/avatar-utils";
import { ScanChallenge } from "@/components/ScanChallenge";
import { SocialIcebreakers } from "@/components/SocialIcebreakers";
import { MyTickets } from "@/components/MyTickets";
import { countries } from "../utils/countries";
import { SafeVideoPlayer } from "@/components/SafeVideoPlayer";

// Lazy load ReactPlayer to prevent "static flag" errors
// const ReactPlayer = React.lazy(() => import("react-player"));

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const [qrValue, setQrValue] = useState("");
  
  // State for chat
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // State for posts, media and friends
  const { userPosts, isLoading: postsLoading, fetchUserPosts, createPost, updatePost, deletePost, likePost, unlikePost } = usePostStore();
  const { media, isLoading: mediaLoading, fetchUserMedia, uploadMedia, addYouTubeVideo, deleteMedia } = useMediaGalleryStore();
  const { friends, sentRequests, receivedRequests, isLoading: friendsLoading, fetchFriends, fetchSentRequests, fetchReceivedRequests, subscribeToReceivedRequests, acceptFriendRequest, declineFriendRequest, removeFriend } = useFriendsStore();
  const { chats } = useChatStore();
  
  // State for post creation
  const [newPostContent, setNewPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [isSensitive, setIsSensitive] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  
  // State for media upload
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  
  // State for YouTube video
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAddingYoutube, setIsAddingYoutube] = useState(false);
  const [isSubmittingYoutube, setIsSubmittingYoutube] = useState(false);

  // Get profile data from store
  const { profile, isLoading: profileLoading, updateProfile } = useProfileStore();
  
  // State for loading user data
  const [loading, setLoading] = useState(true);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showPwaInstructions, setShowPwaInstructions] = useState(false);
  
  const { install, isInstallable, isIOS, isAppInstalled } = usePwaStore();

  // State for friends view mode
  const [friendsViewMode, setFriendsViewMode] = useState<'list' | 'constellation'>('list');

  const { isOnline } = usePresenceStore();

  // State for media viewer
  const [viewerMedia, setViewerMedia] = useState<Media | null>(null);
  
  // State for persistent music player
  const [currentTrack, setCurrentTrack] = useState<Media | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // State for Spotify Url
  const [spotifyUrlInput, setSpotifyUrlInput] = useState("");

  // State for Apple Music Url
  const [appleMusicUrlInput, setAppleMusicUrlInput] = useState("");

  // State for SoundCloud Url
  const [soundcloudUrlInput, setSoundcloudUrlInput] = useState("");

  // State for active tab
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "posts");
  
  // Ref for tabs section
  const tabsRef = useRef<HTMLDivElement>(null);

  // Sync edit form data with profile when dialog opens
  useEffect(() => {
    if (showEditProfileDialog && profile) {
      setEditFormData({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        addressLine1: profile.address?.line1 || "",
        addressLine2: profile.address?.line2 || "",
        city: profile.address?.city || "",
        state: profile.address?.state || "",
        zip: profile.address?.zip || "",
        country: profile.address?.country || "",
        interests: profile.interests?.join(", ") || "",
        instagram: profile.instagram || "",
        facebook: profile.facebook || "",
        twitter: profile.twitter || "",
        threads: profile.threads || "",
        whatsapp: profile.whatsapp || "",
        tiktok: profile.tiktok || "",
        soundcloud: profile.soundcloudUrl || "",
        isPrivate: profile.isPrivate || false,
        relationshipStatus: profile.relationshipStatus || "",
        partnerId: profile.partnerId || "",
        vibe: profile.vibe || "Dark"
      });
    }
  }, [showEditProfileDialog, profile]);

  // Update active tab from URL query param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      
      // Scroll to tabs section if a specific tab is requested
      // This ensures the user sees the content they clicked on (e.g. "My Friends" link)
      setTimeout(() => {
        if (tabsRef.current) {
          const yOffset = -100; // Offset for sticky header
          const element = tabsRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          
          window.scrollTo({top: y, behavior: 'smooth'});
        }
      }, 100); // Reduced delay for snappier feel
    }
  }, [searchParams, activeTab]);

  // Helper to get Spotify Embed URL
  const getSpotifyEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    
    // Handle standard open.spotify.com links, including international ones (intl-es, etc.)
    // Matches: ...spotify.com/.../track/ID
    const match = url.match(/spotify\.com\/.*(track|album|playlist)\/([a-zA-Z0-9]+)/);
    
    if (match && match[1] && match[2]) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    
    // Handle potential spotify:track:ID format if users paste that
    const uriMatch = url.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/);
    if (uriMatch && uriMatch[1] && uriMatch[2]) {
      return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
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

  // Handle saving Spotify URL
  const handleSaveSpotifyUrl = async () => {
    if (!spotifyUrlInput.trim()) return;
    
    // Basic validation to ensure it's a spotify link
    if (!spotifyUrlInput.includes("spotify.com")) {
      toast.error("Please enter a valid Spotify URL");
      return;
    }

    try {
      await updateProfile({ spotifyUrl: spotifyUrlInput });
      // Toast is handled in updateProfile
    } catch (error) {
      // Error handled in updateProfile
    }
  };

  // Handle saving Apple Music URL
  const handleSaveAppleMusicUrl = async () => {
    if (!appleMusicUrlInput.trim()) return;
    
    if (!appleMusicUrlInput.includes("music.apple.com")) {
      toast.error("Please enter a valid Apple Music URL");
      return;
    }

    try {
      await updateProfile({ appleMusicUrl: appleMusicUrlInput });
    } catch (error) {
      // Error handled in updateProfile
    }
  };

  // Handle saving SoundCloud URL
  const handleSaveSoundcloudUrl = async () => {
    if (!soundcloudUrlInput.trim()) return;
    
    if (!soundcloudUrlInput.includes("soundcloud.com")) {
      toast.error("Please enter a valid SoundCloud URL");
      return;
    }

    try {
      await updateProfile({ soundcloudUrl: soundcloudUrlInput });
    } catch (error) {
      // Error handled in updateProfile
    }
  };
  
  // State for profile editing
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    bio: "",
    location: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    interests: "",
    instagram: "",
    facebook: "",
    twitter: "",
    threads: "",
    whatsapp: "",
    tiktok: "",
    soundcloud: "",
    isPrivate: false,
    relationshipStatus: "",
    partnerId: "",
    vibe: "Dark"
  });
  
  // Determine QR code colors based on relationship status
  const getQrColors = () => {
    const status = profile?.relationshipStatus;
    switch (status) {
      case 'Single':
        return { bg: '#22d3ee', fg: '#000000' }; // Neon Cyan
      case 'Looking':
        return { bg: '#e879f9', fg: '#000000' }; // Neon Fuchsia
      case 'Just Friends':
        return { bg: '#f87171', fg: '#000000' }; // Neon Red
      case 'Taken':
        return { bg: '#a855f7', fg: '#000000' }; // Neon Purple
      default:
        return { bg: '#FFFFFF', fg: '#000000' };
    }
  };

  const { bg: qrBgColor, fg: qrFgColor } = getQrColors();
  
  // Helper functions for Media Viewer navigation
  const getViewableMediaList = () => {
    if (!viewerMedia) return [];
    // Group images together
    if (viewerMedia.type === MediaType.IMAGE) {
      return media.filter(m => m.type === MediaType.IMAGE);
    } 
    // Group videos together (both uploaded and YouTube)
    else if (viewerMedia.type === MediaType.VIDEO || viewerMedia.type === MediaType.YOUTUBE) {
      return media.filter(m => m.type === MediaType.VIDEO || m.type === MediaType.YOUTUBE);
    }
    return [];
  };

  const handleNextMedia = () => {
    const list = getViewableMediaList();
    const currentIndex = list.findIndex(m => m.id === viewerMedia?.id);
    if (currentIndex !== -1 && currentIndex < list.length - 1) {
      setViewerMedia(list[currentIndex + 1]);
    }
  };

  const handlePrevMedia = () => {
    const list = getViewableMediaList();
    const currentIndex = list.findIndex(m => m.id === viewerMedia?.id);
    if (currentIndex > 0) {
      setViewerMedia(list[currentIndex - 1]);
    }
  };

  const hasNextMedia = () => {
     const list = getViewableMediaList();
     const currentIndex = list.findIndex(m => m.id === viewerMedia?.id);
     return currentIndex !== -1 && currentIndex < list.length - 1;
  };

  const hasPrevMedia = () => {
     const list = getViewableMediaList();
     const currentIndex = list.findIndex(m => m.id === viewerMedia?.id);
     return currentIndex > 0;
  };

  // Vibe styles configuration
  const vibeStyles = {
    Rage: {
      background: "from-red-900/20 via-black to-orange-900/20",
      accent: "text-red-500",
      border: "border-red-600/50",
      glow: "shadow-[0_0_30px_rgba(220,38,38,0.3)]",
      gradient: "from-red-600 to-orange-600",
      cardBg: "bg-red-950/30"
    },
    Chill: {
      background: "from-blue-900/20 via-black to-teal-900/20",
      accent: "text-cyan-400",
      border: "border-cyan-500/50",
      glow: "shadow-[0_0_30px_rgba(34,211,238,0.3)]",
      gradient: "from-cyan-600 to-blue-600",
      cardBg: "bg-blue-950/30"
    },
    Neon: {
      background: "from-fuchsia-900/20 via-black to-purple-900/20",
      accent: "text-fuchsia-400",
      border: "border-fuchsia-500/50",
      glow: "shadow-[0_0_30px_rgba(232,121,249,0.3)]",
      gradient: "from-fuchsia-600 to-purple-600",
      cardBg: "bg-fuchsia-950/30"
    },
    Retro: {
      background: "from-indigo-900/20 via-purple-900/20 to-pink-900/20",
      accent: "text-yellow-400",
      border: "border-yellow-500/50",
      glow: "shadow-[0_0_30px_rgba(250,204,21,0.3)]",
      gradient: "from-indigo-500 via-purple-500 to-pink-500",
      cardBg: "bg-indigo-950/30"
    },
    Dark: {
      background: "from-gray-900/10 via-black to-gray-900/10",
      accent: "text-white",
      border: "border-gray-800",
      glow: "",
      gradient: "from-gray-600 to-gray-400",
      cardBg: "bg-gray-900/60"
    }
  };

  const currentVibe = (profile?.vibe as keyof typeof vibeStyles) || "Dark";
  const styles = vibeStyles[currentVibe] || vibeStyles.Dark;
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if profile is complete
    const checkProfile = async () => {
      try {
        const isComplete = await checkAndRedirectProfile(user.uid, navigate);
        
        if (isComplete) {
          // If profile is complete, load data
          const loadedProfile = await useProfileStore.getState().loadProfile(user.uid);
          await fetchUserPosts(user.uid);
          await fetchUserMedia(user.uid);
          await fetchFriends();
          await fetchSentRequests();
          // fetchReceivedRequests is now handled by subscription
          
          // Set QR code URL to point directly to the user's profile - using query parameter format
          // Always use production URL for QR codes so they work when printed/shared
          setQrValue(`${PRODUCTION_URL}/?s=${user.uid}`);
          
          // Initialize edit form data from profile
          if (loadedProfile) {
            setEditFormData({
              displayName: loadedProfile.displayName || "",
              bio: loadedProfile.bio || "",
              location: loadedProfile.location || "",
              addressLine1: loadedProfile.address?.line1 || "",
              addressLine2: loadedProfile.address?.line2 || "",
              city: loadedProfile.address?.city || "",
              state: loadedProfile.address?.state || "",
              zip: loadedProfile.address?.zip || "",
              country: loadedProfile.address?.country || "",
              interests: loadedProfile.interests?.join(", ") || "",
              instagram: loadedProfile.instagram || "",
              facebook: loadedProfile.facebook || "",
              twitter: loadedProfile.twitter || "",
              threads: loadedProfile.threads || "",
              whatsapp: loadedProfile.whatsapp || "",
              tiktok: loadedProfile.tiktok || "",
              soundcloud: loadedProfile.soundcloudUrl || "",
              isPrivate: loadedProfile.isPrivate || false,
              relationshipStatus: loadedProfile.relationshipStatus || "",
              partnerId: loadedProfile.partnerId || "",
              vibe: loadedProfile.vibe || "Dark"
            });
            
            // Initialize Spotify URL input
            if (loadedProfile.spotifyUrl) {
              setSpotifyUrlInput(loadedProfile.spotifyUrl);
            }
            
            // Initialize Apple Music URL input
            if (loadedProfile.appleMusicUrl) {
              setAppleMusicUrlInput(loadedProfile.appleMusicUrl);
            }

            // Initialize SoundCloud URL input
            if (loadedProfile.soundcloudUrl) {
              setSoundcloudUrlInput(loadedProfile.soundcloudUrl);
            }
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        toast.error("Could not load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    checkProfile();
  }, [user, navigate, fetchUserPosts, fetchUserMedia, fetchFriends, fetchSentRequests]);

  // Subscribe to friend requests
  useEffect(() => {
    if (user) {
      const unsubscribeRequests = subscribeToReceivedRequests();
      // Chat subscription is now handled globally in AppProvider
      
      return () => {
        unsubscribeRequests();
      };
    }
  }, [user, subscribeToReceivedRequests]);
  
  // Handler for post creation
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }
    
    await createPost(newPostContent, postImage || undefined, isSensitive);
    setNewPostContent("");
    setPostImage(null);
    setIsSensitive(false);
  };
  
  // Handler for media upload
  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    console.log(`[ScanMe Debug] handleMediaUpload called with ${files.length} files`);

    setUploadingMedia(true);
    try {
      const file = files[0];
      console.log(`[ScanMe Debug] Processing file: ${file.name}, type: ${file.type}`);

      let type = MediaType.IMAGE;
      
      if (file.type.startsWith("video/")) {
        type = MediaType.VIDEO;
      } else if (file.type.startsWith("audio/")) {
        type = MediaType.AUDIO;
      }
      
      console.log(`[ScanMe Debug] Determined media type: ${type}`);

      await uploadMedia(file, type);
      console.log(`[ScanMe Debug] uploadMedia completed successfully`);
      toast.success("Media uploaded successfully");
    } catch (error) {
      console.error("[ScanMe Debug] Error uploading media:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploadingMedia(false);
      // Reset inputs to allow uploading the same file again
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };
  
  // Handler for YouTube video addition
  const handleAddYoutubeVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setIsSubmittingYoutube(true);
    try {
      const result = await addYouTubeVideo(youtubeUrl);
      
      // Only close dialog if addition was successful
      if (result) {
        setYoutubeUrl("");
        setIsAddingYoutube(false);
      }
    } catch (error) {
      console.error("Error adding YouTube video:", error);
      // Error is already handled/toasted in store
    } finally {
      setIsSubmittingYoutube(false);
    }
  };

  // Handler for post update
  const handleUpdatePost = async () => {
    if (!editingPost) return;
    
    await updatePost(editingPost.id, editPostContent);
    setEditingPost(null);
    setEditPostContent("");
  };
  
  // Handler for post deletion
  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await deletePost(postId);
    }
  };
  
  // Handler for profile update
  const handleUpdateProfile = async () => {
    try {
      // The store now handles the entire update process.
      // We just pass the form data.
      await updateProfile(
        {
          displayName: editFormData.displayName,
          bio: editFormData.bio,
          location: editFormData.location,
          address: {
            line1: editFormData.addressLine1,
            line2: editFormData.addressLine2,
            city: editFormData.city,
            state: editFormData.state,
            zip: editFormData.zip,
            country: editFormData.country
          },
          interests: editFormData.interests
            .split(",")
            .map(item => item.trim())
            .filter(item => item.length > 0),
          instagram: editFormData.instagram,
          facebook: editFormData.facebook,
          twitter: editFormData.twitter,
          threads: editFormData.threads,
          whatsapp: editFormData.whatsapp,
          tiktok: editFormData.tiktok,
          soundcloudUrl: editFormData.soundcloud,
          isPrivate: editFormData.isPrivate,
          relationshipStatus: (editFormData.partnerId && editFormData.partnerId !== "none") 
            ? "Taken" 
            : (editFormData.relationshipStatus as 'Single' | 'Looking' | 'Just Friends' | 'Taken' | null),
          partnerId: editFormData.partnerId || null,
          currentVibe: editFormData.vibe as 'Dark' | 'Rage' | 'Chill' | 'Neon' | 'Retro'
        }
      );
        
      // Close dialog on success
      setShowEditProfileDialog(false);
      // Success toast is handled in updateProfile (or we can do it here, but duplicate)
      // toast.success("Profile updated successfully"); 
    } catch (error) {
      console.error("Failed to update profile:", error);
      // Error toast is handled in updateProfile
    }
  };
  
  // Handler for avatar save
  const handleSaveAvatar = async (file: File) => {
    try {
      await updateProfile({}, file);
      // Toast is handled in updateProfile
    } catch (error) {
      // Error is handled in updateProfile
    }
  };
  
  // Handler for friend request actions
  const handleAcceptFriendRequest = async (requestId: string) => {
    await acceptFriendRequest(requestId);
  };
  
  const handleDeclineFriendRequest = async (requestId: string) => {
    await declineFriendRequest(requestId);
  };
  
  const handleRemoveFriend = async (friendId: string) => {
    if (confirm("Are you sure you want to remove this friend?")) {
      await removeFriend(friendId);
    }
  };
  
  const handleMessageFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsChatOpen(true);
  };

  // Handler for downloading QR code image
  const handleDownloadImage = async () => {
    const qrContainer = document.getElementById('user-qr-code-container');
    if (!qrContainer) {
      toast.error("Could not find QR code to download");
      return;
    }

    const toastId = toast.loading("Generating image...");

    try {
      // Create a temporary container for capturing
      // We want to capture it "straight" (no rotation) and with the correct background
      const clone = qrContainer.cloneNode(true) as HTMLElement;
      
      // Reset rotation and ensure background is set (it's inline style so it should copy, but let's be safe)
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.zIndex = '-1';
      
      // Make background transparent for download
      clone.style.backgroundColor = 'transparent';
      
      // Find SVG elements with the background color and make them transparent
      const svgElements = clone.querySelectorAll('path, rect');
      svgElements.forEach((el) => {
        const fill = el.getAttribute('fill');
        if (fill && fill.toLowerCase() === qrBgColor.toLowerCase()) {
          el.setAttribute('fill', 'transparent');
        }
      });
      
      document.body.appendChild(clone);

      // Give it a moment to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        backgroundColor: null, // Transparent background outside the border-radius
        scale: 4, // Higher quality for printing
        logging: false,
        useCORS: true
      });

      // Cleanup
      document.body.removeChild(clone);

      // Create download link
      const link = document.createElement('a');
      link.download = `scanme-qr-${profile?.displayName || 'code'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("QR Code downloaded!", { id: toastId });
      
    } catch (err) {
      console.error("Capture failed:", err);
      toast.error("Failed to generate QR code image", { id: toastId });
    }
  };

  // Handler for printing QR code
  const handlePrintQR = () => {
    const qrContainer = document.getElementById('user-qr-code-container');
    if (!qrContainer) {
      toast.error("Could not find QR code to print");
      return;
    }

    // Clone the node to avoid messing with the DOM
    // We need to un-rotate it for printing if we want it straight, but keeping the style is also fine.
    // The current design rotates the container 45 degrees. For printing, we probably want it straight.
    
    let svgContent = qrContainer.innerHTML;
    // Get colors to replicate styling in print
    const bgColor = qrBgColor;
    
    // Replace the background color with white for printing to make it clean
    // This assumes the SVG uses the bgColor string exact match, which is likely for QRCodeSVG
    if (bgColor) {
      svgContent = svgContent.replaceAll(bgColor, '#ffffff');
    }
    
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${profile?.displayName || user?.displayName || 'User'}'s QR Code</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: system-ui, -apple-system, sans-serif;
                background-color: white;
                color: black;
              }
              .qr-container {
                padding: 1rem;
                /* No background color for clean print */
                margin-bottom: 2rem;
              }
              h2 { margin-bottom: 0.5rem; font-size: 1.5rem; }
              p { margin-top: 0; color: #666; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <h2>${profile?.displayName || user?.displayName || 'User'}</h2>
            <p>Scan to connect on ScanMe</p>
            <div class="qr-container">
              ${svgContent}
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Share profile with others (via clipboard)
  const shareProfile = async () => {
    try {
      // Create the profile URL using query parameter format
      const profileUrl = `${PRODUCTION_URL}/?s=${user.uid}`;
      
      // Use the Web Share API if available, otherwise fallback to clipboard
      if (navigator.share) {
        await navigator.share({
          title: `${user.displayName || 'User'}'s ScanMe Profile`,
          text: `Check out my profile on ScanMe!`,
          url: profileUrl
        });
        toast.success("Profile shared successfully!");
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied to clipboard!", {
          description: "Share this link with others so they can see your profile"
        });
      }
    } catch (error) {
      console.error("Error sharing profile:", error);
      // Silence user cancellation errors
      if (error.name !== 'AbortError') {
        toast.error("Failed to share profile");
      }
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  // Handler for playing a track
  const handlePlayTrack = (track: Media) => {
    // If clicking the same track that is already playing
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      return;
    }

    setCurrentTrack(track);
    setIsPlayerOpen(true);
    // The audio element will auto-play due to the autoPlay attribute or useEffect
  };

  const handleStopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleTogglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };
  
  // If user is not loaded yet or not logged in
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  // Show loading state
  if (loading || profileLoading || postsLoading || mediaLoading || friendsLoading) {
    return (
      <div className="h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-xl">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full bg-black text-white overflow-y-auto overflow-x-hidden relative`}>
      {/* Background lighting effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-0 -left-20 w-96 h-96 rounded-full filter blur-3xl opacity-20 bg-gradient-to-br ${styles.background}`}></div>
        <div className={`absolute bottom-0 -right-20 w-96 h-96 rounded-full filter blur-3xl opacity-20 bg-gradient-to-tl ${styles.background}`}></div>
        <div className={`absolute inset-0 bg-gradient-to-b ${styles.background} opacity-30 pointer-events-none`}></div>
      </div>
      
      <main className="w-full max-w-[95%] xl:max-w-[1800px] mx-auto px-4 sm:px-6 py-12 pb-32 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Logo size="medium" />
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${styles.gradient} mb-8`}>
              Profile
            </h1>
          </motion.div>
          
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile and QR Code */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4 xl:col-span-3"
          >
            <Card className={`${styles.cardBg} ${styles.border} backdrop-blur-sm overflow-hidden transition-colors duration-500 ${styles.glow}`}>
              <CardHeader className="pb-0">
                <CardTitle className={styles.accent}>Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <Avatar className={`h-24 w-24 border-2 ${styles.border}`}>
                      <AvatarImage src={getSafeImageUrl(profile?.photoURL || user.photoURL)} alt={profile?.displayName || user.displayName || "User"} />
                      <AvatarFallback className={`text-2xl bg-gradient-to-br ${getRelationshipGradientClass(profile?.relationshipStatus)}`}>
                        {getAvatarFallbackText(
                          profile?.displayName || user.displayName, 
                          profile?.relationshipStatus
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full border-2 border-black shadow-lg opacity-90 hover:opacity-100 bg-gray-800 hover:bg-gray-700 text-white"
                      onClick={() => setShowAvatarCreator(true)}
                    >
                      <CameraIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <h2 className={`text-xl font-bold ${styles.accent}`}>{profile?.displayName || user.displayName || "User"}</h2>
                    <p className="text-sm text-gray-400">{profile?.email || user.email}</p>
                    {profile?.bio && <p className="text-sm text-gray-300 mt-2">{profile.bio}</p>}
                    {profile?.location && <p className="text-xs text-gray-400 mt-1">{profile.location}</p>}
                    {profile?.relationshipStatus && (
                      <p 
                        onClick={() => navigate(`/members?relationshipStatus=${profile.relationshipStatus}`)}
                        className={`text-xs mt-1 font-medium flex items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${styles.accent}`}
                      >
                        <HeartIcon className="h-3 w-3" /> {profile.relationshipStatus}
                      </p>
                    )}

                    {profile?.partnerId && (() => {
                      const partner = friends.find(f => f.userId === profile.partnerId);
                      if (partner) {
                        return (
                          <div 
                            onClick={() => navigate(`/member?id=${partner.userId}`)}
                            className="mt-3 flex items-center justify-center gap-2 cursor-pointer bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"
                          >
                            <span className="text-xs text-gray-400">Partner:</span>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={getSafeImageUrl(partner.photoURL)} />
                                <AvatarFallback className="text-[10px]">{partner.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className={`text-sm font-medium ${styles.accent}`}>{partner.displayName}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Veteran Status Badge */}
                    <div className="mt-2">
                      {profile?.veteranStatus === 'verified' && (
                        <div 
                          onClick={() => navigate('/veteran-hub')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-600/50 text-green-400 cursor-pointer hover:bg-green-900/50 transition-colors"
                          title="Access Military & Vets Hub"
                        >
                          <Shield className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wide">Verified Veteran</span>
                        </div>
                      )}
                      
                      {profile?.veteranStatus === 'pending' && (
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-900/30 border border-yellow-600/50 text-yellow-400">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wide">Verification Pending</span>
                        </div>
                      )}
                      
                      {(!profile?.veteranStatus || profile?.veteranStatus === 'unverified' || profile?.veteranStatus === 'rejected') && (
                        <div 
                          onClick={() => navigate('/veteran-verification')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-gray-400 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors group"
                        >
                          <Shield className="w-3 h-3 group-hover:text-yellow-500 transition-colors" />
                          <span className="text-xs group-hover:underline">Verify Veteran Status</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Social Media Links */}
                    <div className="flex gap-3 mt-3 justify-center">
                      {profile?.instagram && (
                        <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                          <InstagramIcon className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.facebook && (
                        <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                          <FacebookIcon className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.twitter && (
                        <a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
                          <TwitterIcon className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.tiktok && (
                        <a href={profile.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                          <FaTiktok className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.soundcloudUrl && (
                        <a href={profile.soundcloudUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors">
                          <FaSoundcloud className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.threads && (
                        <a href={profile.threads} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                          <AtSignIcon className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.whatsapp && (
                        <a 
                          href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-gray-400 hover:text-green-500 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <PhoneIcon className="h-5 w-5" />
                        </a>
                      )}
                    </div>

                    <Button 
                      variant="outline"
                      className={`mt-4 text-sm ${styles.border} hover:bg-white/10`}
                      onClick={() => setShowEditProfileDialog(true)}
                    >
                      <PencilIcon className="h-3 w-3 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="w-full border-t border-gray-800 my-4 pt-6">
                    <div className="flex flex-col items-center">
                      <h3 className={`text-lg font-medium mb-8 text-center ${styles.accent}`}>Your Unique QR Code</h3>
                      <div 
                        id="user-qr-code-container"
                        className={`p-4 rounded-lg mx-auto w-max transition-colors duration-300 transform rotate-45 my-8 ${styles.glow}`} 
                        style={{ backgroundColor: qrBgColor }}
                      >
                        <QRCodeSVG 
                          value={qrValue} 
                          size={200} 
                          bgColor={qrBgColor}
                          fgColor={qrFgColor}
                          level="M"
                          className="mx-auto"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-4 text-center">Share this code to let others view your profile</p>

                      <div className="flex gap-3 w-full mt-6">
                        <Button 
                          onClick={handlePrintQR}
                          variant="outline"
                          className={`flex-1 ${styles.border} hover:bg-white/10`}
                        >
                          <PrinterIcon className="mr-2 h-4 w-4" />
                          Print Code
                        </Button>
                        <Button 
                          onClick={handleDownloadImage}
                          variant="outline"
                          className={`flex-1 ${styles.border} hover:bg-white/10`}
                        >
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Save Image
                        </Button>
                      </div>

                      <Button 
                        onClick={() => navigate('/store')}
                        className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      >
                        <ShoppingBagIcon className="mr-2 h-4 w-4" />
                        Print My Product (Store)
                      </Button>
                    </div>

                    <div className="flex flex-col gap-3 mt-6 w-full">
                      {/* PWA Install Button */}
                      {(!isAppInstalled && (isInstallable || isIOS)) && (
                        <Button 
                          onClick={() => {
                            if (isInstallable) {
                              install();
                            } else {
                              setShowPwaInstructions(true);
                            }
                          }}
                          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-900/20 animate-pulse"
                        >
                          <SmartphoneIcon className="mr-2 h-4 w-4" />
                          Add App to Home Screen
                        </Button>
                      )}

                      <div className="flex gap-3">
                        <Button 
                          onClick={() => setShowShareCard(true)}
                          className={`bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 flex-1 shadow-lg shadow-pink-900/20`}
                        >
                          <InstagramIcon className="mr-2 h-4 w-4" />
                          Share Card
                        </Button>
                        <Button 
                          onClick={shareProfile}
                          className={`bg-gradient-to-r ${styles.gradient} hover:opacity-90 flex-1`}
                        >
                          <ShareIcon className="mr-2 h-4 w-4" />
                          Share Link
                        </Button>
                      </div>
                      
                      <div className="flex gap-3">
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent(`Check out my profile on ScanMe! ${PRODUCTION_URL}/?s=${user.uid}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button 
                            variant="outline"
                            className={`w-full border-green-900/50 text-green-500 bg-green-950/20 hover:bg-green-900/40 hover:text-green-400`}
                          >
                            <PhoneIcon className="mr-2 h-4 w-4" />
                            WhatsApp
                          </Button>
                        </a>
                        <Button 
                          onClick={() => navigate('/members')}
                          variant="outline"
                          className={`border-gray-700 bg-gray-800/50 hover:${styles.accent}`}
                        >
                          <UsersIcon className="mr-2 h-4 w-4" />
                          Browse
                        </Button>
                      </div>
                    </div>
                    
                    {/* Spotify Persistent Player */}
                    {profile?.spotifyUrl && getSpotifyEmbedUrl(profile.spotifyUrl) && (
                      <div className="mt-6 border-t border-gray-800 pt-6">
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${styles.accent}`}>
                          <MusicIcon className="h-4 w-4" /> 
                          Profile Anthem
                        </h3>
                        <div className="rounded-xl overflow-hidden shadow-lg bg-black/40">
                          <iframe 
                            src={getSpotifyEmbedUrl(profile.spotifyUrl)} 
                            width="100%" 
                            height="152" 
                            frameBorder="0" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                            className="bg-transparent"
                          ></iframe>
                        </div>
                      </div>
                    )}

                    {/* Apple Music Persistent Player */}
                    {profile?.appleMusicUrl && getAppleMusicEmbedUrl(profile.appleMusicUrl) && (
                      <div className="mt-6 border-t border-gray-800 pt-6">
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${styles.accent}`}>
                          <MusicIcon className="h-4 w-4" /> 
                          Apple Music
                        </h3>
                        <div className="rounded-xl overflow-hidden shadow-lg bg-black/40">
                          <iframe 
                            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" 
                            frameBorder="0" 
                            height="175" 
                            style={{width: '100%', maxWidth: '660px', overflow: 'hidden', background: 'transparent'}} 
                            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" 
                            src={getAppleMusicEmbedUrl(profile.appleMusicUrl) || ""}
                          ></iframe>
                        </div>
                      </div>
                    )}

                    {/* SoundCloud Persistent Player */}
                    {profile?.soundcloudUrl && getSoundCloudEmbedUrl(profile.soundcloudUrl) && (
                      <div className="mt-6 border-t border-gray-800 pt-6">
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${styles.accent}`}>
                          <FaSoundcloud className="h-4 w-4" /> 
                          SoundCloud
                        </h3>
                        <div className="rounded-xl overflow-hidden shadow-lg bg-black/40">
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
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Main Content - Posts, Media, Friends */}
          <motion.div 
            ref={tabsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8 xl:col-span-9"
          >
            <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val);
              // Update URL without reloading
              setSearchParams({ tab: val }, { replace: true });
            }} className="w-full">
              <TabsList className={`grid w-full grid-cols-6 ${styles.cardBg} backdrop-blur-sm ${styles.border}`}>
                <TabsTrigger value="posts" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Posts</TabsTrigger>
                <TabsTrigger value="photos" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Photos</TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">Videos</TabsTrigger>
                <TabsTrigger value="music" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white flex items-center gap-2">
                  Music
                  {receivedRequests.length > 0 && (
                    <HeartIcon className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="tickets" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white flex items-center gap-2">
                  Tickets
                </TabsTrigger>
                <TabsTrigger value="friends" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white flex items-center gap-2">
                  Friends
                  {chats.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                      {chats.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="challenges" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
                  Missions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="mt-0">
                <Card className={`${styles.cardBg} ${styles.border} backdrop-blur-sm`}>
                  <CardHeader>
                    <CardTitle className={styles.accent}>Your Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Post creation form */}
                    <div className="mb-6 p-4 bg-gray-800/80 rounded-lg">
                      <Textarea
                        placeholder="What's on your mind?"
                        className="min-h-[100px] bg-gray-700/60 border-gray-600 mb-4"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                      />
                      
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox 
                          id="sensitive" 
                          checked={isSensitive} 
                          onCheckedChange={(checked) => setIsSensitive(checked as boolean)} 
                          className="border-gray-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="sensitive"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-400"
                        >
                          Contains Sensitive/18+ Content
                        </label>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Input 
                            type="file" 
                            id="post-image"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onClick={(e) => (e.target as HTMLInputElement).value = ""}
                            onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                          />
                          <Button 
                            variant="outline" 
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Add Image
                          </Button>
                          {postImage && (
                            <span className="ml-2 text-sm text-gray-400">
                              {postImage.name.length > 20 ? `${postImage.name.substring(0, 20)}...` : postImage.name}
                            </span>
                          )}
                        </div>
                        <Button 
                          className={`bg-gradient-to-r ${styles.gradient}`}
                          onClick={handleCreatePost}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                    
                    {/* Posts list */}
                    {userPosts.length > 0 ? (
                      <div className="space-y-6">
                        {userPosts.map((post) => (
                          <PostCard 
                            key={post.id} 
                            post={post} 
                            onDelete={handleDeletePost}
                            onEdit={(post) => {
                              setEditingPost(post);
                              setEditPostContent(post.content);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p>You haven't created any posts yet.</p>
                        <p className="mt-2">Share your thoughts with the community!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Edit Post Dialog */}
                {editingPost && (
                  <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
                    <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Post</DialogTitle>
                        <DialogDescription>Make changes to your post content below.</DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="Update your post"
                        className="min-h-[100px] bg-gray-800 border-gray-700"
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                      />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPost(null)}>
                          Cancel
                        </Button>
                        <Button 
                          className="bg-gradient-to-r from-purple-600 to-blue-600"
                          onClick={handleUpdatePost}
                        >
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </TabsContent>
              
              <TabsContent value="photos" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>Photo Gallery</CardTitle>
                    <div>
                      <Input 
                        type="file" 
                        id="media-upload"
                        ref={mediaFileInputRef}
                        className="hidden"
                        accept="image/*"
                        onClick={(e) => (e.target as HTMLInputElement).value = ""}
                        onChange={(e) => handleMediaUpload(e.target.files)}
                      />
                      <Button 
                        onClick={() => mediaFileInputRef.current?.click()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={uploadingMedia}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {uploadingMedia ? "Uploading..." : "Upload Photo"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {media.filter(item => item.type === MediaType.IMAGE).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {media.filter(item => item.type === MediaType.IMAGE).map((item) => (
                          <div 
                            key={item.id} 
                            className="relative group overflow-hidden rounded-lg bg-black cursor-pointer"
                            onClick={() => setViewerMedia(item)}
                          >
                            <img 
                              src={item.url} 
                              alt={item.title || "Image"} 
                              className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                              <p className="text-white text-sm truncate flex-1 mr-2">
                                {item.title || "Image"}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 bg-black/50 text-white rounded-full hover:bg-red-800/70 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMedia(item.id);
                                }}
                                title="Delete photo"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 bg-black/50 text-white rounded-full hover:bg-black/70 border border-white/20"
                                onClick={() => setViewerMedia(item)}
                                title="View full screen"
                              >
                                <Maximize2Icon className="h-4 w-4" /> 
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <ImageIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                        <p>You haven't uploaded any photos yet.</p>
                        <p className="mt-2">Add photos to your gallery!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="videos" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>Video Gallery</CardTitle>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        id="video-upload"
                        ref={videoFileInputRef}
                        className="hidden"
                        accept="video/*"
                        onClick={(e) => (e.target as HTMLInputElement).value = ""}
                        onChange={(e) => handleMediaUpload(e.target.files)}
                      />
                      <Dialog open={isAddingYoutube} onOpenChange={setIsAddingYoutube}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="border-red-600/50 text-red-500 hover:bg-red-950/30 hover:text-red-400"
                          >
                            <VideoIcon className="mr-2 h-4 w-4" />
                            Add YouTube
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add YouTube Video</DialogTitle>
                            <DialogDescription>Enter the URL of the YouTube video you want to share.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="youtube-url">YouTube URL</Label>
                              <Input 
                                id="youtube-url" 
                                name="youtubeUrl"
                                placeholder="https://www.youtube.com/watch?v=..." 
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="bg-gray-800 border-gray-700"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsAddingYoutube(false)}>Cancel</Button>
                            <Button 
                              onClick={handleAddYoutubeVideo} 
                              disabled={isSubmittingYoutube}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isSubmittingYoutube ? "Adding..." : "Add Video"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        onClick={() => videoFileInputRef.current?.click()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={uploadingMedia}
                      >
                        <VideoIcon className="mr-2 h-4 w-4" />
                        {uploadingMedia ? "Uploading..." : "Upload Video"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {media.filter(item => item.type === MediaType.VIDEO || item.type === MediaType.YOUTUBE).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {media.filter(item => item.type === MediaType.VIDEO || item.type === MediaType.YOUTUBE).map((item) => (
                          <div key={item.id} className="relative group overflow-hidden rounded-lg bg-black">
                            <div className="relative w-full aspect-video">
                                <SafeVideoPlayer
                                  url={item.url}
                                  controls={true}
                                  width="100%"
                                  height="100%"
                                  playsinline={true}
                                  config={{
                                    file: {
                                      attributes: {
                                        controlsList: 'nodownload'
                                      }
                                    },
                                    youtube: {
                                      playerVars: {
                                        showinfo: 0,
                                        modestbranding: 1,
                                        rel: 0
                                      }
                                    }
                                  }}
                                />
                            </div>
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-black/50 text-white rounded-full hover:bg-red-800/70 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMedia(item.id);
                              }}
                              title="Delete video"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <VideoIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                        <p>You haven't uploaded any videos yet.</p>
                        <p className="mt-2">Share your favorite videos!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="music" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>My Music</CardTitle>
                    <div>
                      <Input 
                        type="file" 
                        id="audio-upload"
                        ref={audioFileInputRef}
                        className="hidden"
                        accept="audio/*"
                        onClick={(e) => (e.target as HTMLInputElement).value = ""}
                        onChange={(e) => handleMediaUpload(e.target.files)}
                      />
                      <Button 
                        onClick={() => audioFileInputRef.current?.click()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={uploadingMedia}
                      >
                        <MusicIcon className="mr-2 h-4 w-4" />
                        {uploadingMedia ? "Uploading..." : "Upload Music"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Spotify Settings Section */}
                    <div className="mb-8 p-4 bg-black/30 rounded-lg border border-gray-800">
                      <h3 className="text-lg font-medium mb-2 text-green-400 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S16.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.12-.42.18-.28.54-.12-.12-.42.12-1.02.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.539.181.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Set Profile Anthem
                      </h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Add a Spotify track, album, or playlist to appear on your profile sidebar.
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          id="spotify-url-input"
                          name="spotifyUrl"
                          placeholder="Paste Spotify link (e.g. https://open.spotify.com/track/...)"
                          value={spotifyUrlInput}
                          onChange={(e) => setSpotifyUrlInput(e.target.value)}
                          className="bg-gray-900/50 border-gray-700"
                        />
                        <Button 
                          onClick={handleSaveSpotifyUrl}
                          className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold"
                        >
                          Save
                        </Button>
                      </div>

                      {/* Preview in Settings */}
                      {spotifyUrlInput && getSpotifyEmbedUrl(spotifyUrlInput) && (
                         <div className="mt-4 p-4 bg-black/40 rounded-xl border border-gray-800">
                            <p className="text-xs text-gray-400 mb-2">Preview:</p>
                            <iframe 
                              src={getSpotifyEmbedUrl(spotifyUrlInput)} 
                              width="100%" 
                              height="152" 
                              frameBorder="0" 
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                              loading="lazy"
                              className="bg-transparent"
                            ></iframe>
                         </div>
                      )}
                    </div>

                    {/* Apple Music Settings Section */}
                    <div className="mb-8 p-4 bg-black/30 rounded-lg border border-gray-800">
                      <h3 className="text-lg font-medium mb-2 text-red-500 flex items-center gap-2">
                        <MusicIcon className="h-6 w-6" />
                        Set Apple Music
                      </h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Add an Apple Music track, album, or playlist to appear on your profile sidebar.
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          id="apple-music-url-input"
                          name="appleMusicUrl"
                          placeholder="Paste Apple Music link (e.g. https://music.apple.com/...)"
                          value={appleMusicUrlInput}
                          onChange={(e) => setAppleMusicUrlInput(e.target.value)}
                          className="bg-gray-900/50 border-gray-700"
                        />
                        <Button 
                          onClick={handleSaveAppleMusicUrl}
                          className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold"
                        >
                          Save
                        </Button>
                      </div>

                      {/* Preview in Settings */}
                      {appleMusicUrlInput && getAppleMusicEmbedUrl(appleMusicUrlInput) && (
                         <div className="mt-4 p-4 bg-black/40 rounded-xl border border-gray-800">
                            <p className="text-xs text-gray-400 mb-2">Preview:</p>
                            <iframe 
                              allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" 
                              frameBorder="0" 
                              height="175" 
                              style={{width: '100%', maxWidth: '660px', overflow: 'hidden', background: 'transparent'}} 
                              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" 
                              src={getAppleMusicEmbedUrl(appleMusicUrlInput) || ""}
                            ></iframe>
                         </div>
                      )}
                    </div>

                    {/* SoundCloud Settings Section */}
                    <div className="mb-8 p-4 bg-black/30 rounded-lg border border-gray-800">
                      <h3 className="text-lg font-medium mb-2 text-orange-500 flex items-center gap-2">
                        <FaSoundcloud className="h-6 w-6" />
                        Set SoundCloud
                      </h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Add a SoundCloud track or playlist to appear on your profile sidebar.
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          id="soundcloud-url-input"
                          name="soundcloudUrl"
                          placeholder="Paste SoundCloud link (e.g. https://soundcloud.com/user/track)"
                          value={soundcloudUrlInput}
                          onChange={(e) => setSoundcloudUrlInput(e.target.value)}
                          className="bg-gray-900/50 border-gray-700"
                        />
                        <Button 
                          onClick={handleSaveSoundcloudUrl}
                          className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold"
                        >
                          Save
                        </Button>
                      </div>

                      {/* Preview in Settings */}
                      {soundcloudUrlInput && getSoundCloudEmbedUrl(soundcloudUrlInput) && (
                         <div className="mt-4 p-4 bg-black/40 rounded-xl border border-gray-800">
                            <p className="text-xs text-gray-400 mb-2">Preview:</p>
                            <iframe 
                              width="100%" 
                              height="166" 
                              scrolling="no" 
                              frameBorder="no" 
                              allow="autoplay" 
                              src={getSoundCloudEmbedUrl(soundcloudUrlInput) || ""}
                            ></iframe>
                         </div>
                      )}
                    </div>

                    <Separator className="my-6 bg-gray-800" />
                    
                    <h3 className="text-lg font-medium mb-4">Uploaded Music</h3>
                    {media.filter(item => item.type === MediaType.AUDIO).length > 0 ? (
                      <div className="space-y-4">
                        {media.filter(item => item.type === MediaType.AUDIO).map((item) => (
                          <div key={item.id} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${currentTrack?.id === item.id ? 'border-purple-500 bg-purple-900/20' : 'border-gray-800 bg-gray-900/30'}`}>
                            <div className="h-10 w-10 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0">
                              <MusicIcon className="h-5 w-5 text-purple-400 animate-pulse" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className={`font-medium truncate ${currentTrack?.id === item.id ? 'text-purple-400' : 'text-white'}`}>{item.title || item.url.split('/').pop()}</p>
                              <p className="text-xs text-gray-400">{format(item.createdAt, 'PPp')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={currentTrack?.id === item.id ? "default" : "secondary"}
                                className={currentTrack?.id === item.id ? "bg-purple-600 hover:bg-purple-700" : ""}
                                onClick={() => handlePlayTrack(item)}
                              >
                                {currentTrack?.id === item.id && isPlaying ? (
                                  <div className="flex items-center"><PauseIcon className="w-4 h-4 mr-2" /> Pause</div>
                                ) : currentTrack?.id === item.id ? (
                                  <div className="flex items-center"><PlayIcon className="w-4 h-4 mr-2" /> Resume</div>
                                ) : (
                                  <div className="flex items-center"><PlayIcon className="w-4 h-4 mr-2" /> Play</div>
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-gray-800"
                                onClick={() => deleteMedia(item.id)}
                                title="Delete track"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <MusicIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                        <p>You haven't uploaded any music yet.</p>
                        <p className="mt-2">Upload your favorite tracks to share!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tickets" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>My Tickets</CardTitle>
                    <CardDescription>View and manage your event tickets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MyTickets />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="friends" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Your Friends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="list" className="w-full">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-gray-800/80 p-2 rounded-lg">
                        <TabsList className="bg-transparent p-0">
                          <TabsTrigger value="list">Friends List</TabsTrigger>
                          <TabsTrigger value="requests">
                            Friend Requests
                            {receivedRequests.length > 0 && (
                              <div className="flex items-center ml-2 gap-1">
                                <HeartIcon className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                                <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
                                  {receivedRequests.length}
                                </span>
                              </div>
                            )}
                          </TabsTrigger>
                        </TabsList>
                        
                        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                          <Button
                            variant={friendsViewMode === 'list' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFriendsViewMode('list')}
                            className="text-xs"
                          >
                            <UsersIcon className="w-3 h-3 mr-1" />
                            List
                          </Button>
                          <Button
                            variant={friendsViewMode === 'constellation' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFriendsViewMode('constellation')}
                            className="text-xs"
                          >
                            <ActivityIcon className="w-3 h-3 mr-1" />
                            Constellation
                          </Button>
                        </div>
                      </div>
                      
                      <TabsContent value="list" className="mt-0">
                        {friendsViewMode === 'constellation' ? (
                          <FriendConstellation friends={friends} currentUser={user} height={500} />
                        ) : (
                          <>
                            {friends.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {friends.map(friend => (
                                  <div key={friend.id} className="flex items-center p-3 rounded-lg border border-gray-800 bg-gray-900/30">
                                    <div className="relative mr-4 cursor-pointer" onClick={() => navigate(`/member?id=${friend.userId}`)}>
                                      <Avatar className="h-12 w-12">
                                        <AvatarImage src={friend.photoURL || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                                          {friend.displayName ? friend.displayName.charAt(0) : "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      {isOnline(friend.userId) && (
                                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-black shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                                      )}
                                    </div>
                                    <div 
                                      className="flex-grow cursor-pointer" 
                                      onClick={() => navigate(`/member?id=${friend.userId}`)}
                                    >
                                      <p className="font-medium">{friend.displayName || "User"}</p>
                                      <p className="text-xs text-gray-400">
                                        Friends since {format(friend.addedAt, 'PP')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                        onClick={() => handleMessageFriend(friend)}
                                        title="Message friend"
                                      >
                                        <MessageCircleIcon className="h-6 w-6" />
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                                        onClick={() => {
                                          // Copy friend's profile link to clipboard
                                          const profileUrl = `${window.location.origin}/member?id=${friend.userId}`;
                                          navigator.clipboard.writeText(profileUrl);
                                          toast.success("Friend's profile link copied", {
                                            description: "Share this link with others"
                                          });
                                        }}
                                        title="Share friend's profile"
                                      >
                                        <ShareIcon className="h-6 w-6" />
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-500 hover:bg-gray-800"
                                        onClick={() => handleRemoveFriend(friend.userId)}
                                        title="Remove friend"
                                      >
                                        <UserMinusIcon className="h-6 w-6" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-400">
                                <p>You haven't added any friends yet.</p>
                                <p className="mt-2 text-sm">Share your QR code to connect with others!</p>
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="requests">
                        {receivedRequests.length > 0 ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-2">Pending Friend Requests</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {receivedRequests.map(request => (
                                <div key={request.id} className="flex items-center p-3 rounded-lg border border-gray-800 bg-gray-900/30">
                                  <Avatar className="h-10 w-10 mr-4">
                                    {request.sender?.photoURL && <AvatarImage src={request.sender.photoURL} alt={request.sender.displayName || "User"} />}
                                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                                      {request.sender?.displayName ? request.sender.displayName.charAt(0).toUpperCase() : "??"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-grow">
                                    <p className="font-medium text-sm">{request.sender?.displayName || "Friend Request"}</p>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-xs text-gray-400">
                                        {/* {format(request.createdAt, "MMM d, yyyy")} */}
                                        Request pending
                                      </p>
                                      {request.location?.address && (
                                        <p className="text-xs text-purple-400 flex items-center gap-1">
                                          <MapPinIcon className="w-3 h-3" />
                                          {request.location.address}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                                      onClick={() => handleDeclineFriendRequest(request.id)}
                                    >
                                      Decline
                                    </Button>
                                    <Button 
                                      size="sm"
                                      className="bg-gradient-to-r from-purple-600 to-blue-600"
                                      onClick={() => handleAcceptFriendRequest(request.id)}
                                    >
                                      Accept
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <p>No pending friend requests</p>
                          </div>
                        )}
                        
                        {sentRequests.length > 0 && (
                          <div className="mt-8 space-y-4">
                            <h3 className="text-lg font-medium mb-2">Sent Requests</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {sentRequests.map(request => (
                                <div key={request.id} className="flex items-center p-3 rounded-lg border border-gray-800 bg-gray-900/30">
                                  <Avatar className="h-10 w-10 mr-4">
                                    {request.receiver?.photoURL && <AvatarImage src={request.receiver.photoURL} alt={request.receiver.displayName || "User"} />}
                                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                                      {request.receiver?.displayName ? request.receiver.displayName.charAt(0).toUpperCase() : "??"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-grow">
                                    <p className="font-medium text-sm">{request.receiver?.displayName || "Pending Request"}</p>
                                    <p className="text-xs text-gray-400">
                                      Sent on {format(request.createdAt, 'PP')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="messages" className="mt-0">
                <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Your Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chats.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {chats.map(chat => {
                          // Find the other participant
                          const otherUserId = chat.participants.find(id => id !== user.uid);
                          // Find friend details
                          const friend = friends.find(f => f.userId === otherUserId);
                          
                          if (!friend) return null;
                          
                          return (
                            <div 
                              key={chat.id} 
                              className="flex items-center p-3 rounded-lg border border-gray-800 bg-gray-900/30 cursor-pointer hover:bg-gray-800/50 transition-colors"
                              onClick={() => handleMessageFriend(friend)}
                            >
                              <Avatar className="h-12 w-12 mr-4">
                                <AvatarImage src={friend.photoURL || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600">
                                  {friend.displayName ? friend.displayName.charAt(0) : "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-grow overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                  <p className="font-medium truncate">{friend.displayName || "User"}</p>
                                  <p className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                    {format(chat.updatedAt, 'MMM d, h:mm a')}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-sm text-gray-400 truncate pr-4">
                                    {chat.lastMessage?.senderId === user.uid ? "You: " : ""}
                                    {chat.lastMessage?.content || "No messages yet"}
                                  </p>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-purple-400">
                                    <MessageCircleIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {chats.every(chat => !friends.find(f => f.userId === chat.participants.find(id => id !== user.uid))) && (
                          <div className="text-center py-8 text-gray-400">
                            <p>No conversations with current friends found.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <MessageCircleIcon className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                        <p>No conversations yet.</p>
                        <p className="mt-2 text-sm">Message a friend to start chatting!</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => document.querySelector<HTMLElement>('[data-value="friends"]')?.click()}
                        >
                          Find Friends
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="challenges" className="mt-0">
                <div className="space-y-8">
                  <SocialIcebreakers />
                  <ScanChallenge />
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      
      <ChatDialog 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        friend={selectedFriend} 
      />
      
      <MediaViewerDialog
        isOpen={!!viewerMedia}
        onClose={() => setViewerMedia(null)}
        media={viewerMedia}
        onNext={handleNextMedia}
        onPrev={handlePrevMedia}
        hasNext={hasNextMedia()}
        hasPrev={hasPrevMedia()}
      />

      {/* Share Card Dialog */}
      <Dialog open={showShareCard} onOpenChange={setShowShareCard}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Share Profile Card</DialogTitle>
            <DialogDescription>Share your unique profile card with others.</DialogDescription>
          </DialogHeader>
          <SocialShareCard 
            user={user} 
            profile={profile} 
            qrValue={qrValue} 
            vibeStyles={vibeStyles} 
            onClose={() => setShowShareCard(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPwaInstructions} onOpenChange={setShowPwaInstructions}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <SmartphoneIcon className="w-6 h-6 text-purple-500" />
              Add to Home Screen
            </DialogTitle>
            <DialogDescription>
              Follow these instructions to install the app on your device for a better experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-300">
              Install ScanMe for quick access to your QR code and faster loading!
            </p>
            
            {isIOS ? (
              <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-gray-800 p-1 rounded text-gray-400 font-mono text-xs mt-1">1</div>
                  <p className="text-sm">Tap the <span className="font-bold text-blue-400">Share</span> button <ShareIcon className="inline h-4 w-4" /> in your browser bar.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-gray-800 p-1 rounded text-gray-400 font-mono text-xs mt-1">2</div>
                  <p className="text-sm">Scroll down and tap <span className="font-bold text-white">Add to Home Screen</span> <PlusIcon className="inline h-4 w-4" />.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-gray-800 p-1 rounded text-gray-400 font-mono text-xs mt-1">3</div>
                  <p className="text-sm">Tap <span className="font-bold text-blue-400">Add</span> in the top right corner.</p>
                </div>
              </div>
            ) : (
              <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-3">
                 <div className="flex items-start gap-3">
                  <div className="bg-gray-800 p-1 rounded text-gray-400 font-mono text-xs mt-1">1</div>
                  <p className="text-sm">Tap the browser menu button (three dots).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-gray-800 p-1 rounded text-gray-400 font-mono text-xs mt-1">2</div>
                  <p className="text-sm">Select <span className="font-bold text-white">Install App</span> or <span className="font-bold text-white">Add to Home Screen</span>.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPwaInstructions(false)} variant="outline" className="border-gray-700 hover:bg-gray-800">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Music Player */}
      {isPlayerOpen && currentTrack && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 backdrop-blur-lg z-50 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
        >
          <div className="container mx-auto max-w-4xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-500/30">
                <MusicIcon className="h-6 w-6 text-purple-400 animate-pulse" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium text-white truncate">{currentTrack.title || currentTrack.url.split('/').pop()}</p>
                <p className="text-xs text-gray-400 mt-1">Now Playing</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-200 hover:text-white hover:bg-gray-800"
                onClick={handleStopTrack}
                title="Stop"
              >
                <SquareIcon className="h-5 w-5 fill-current" />
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="text-white hover:bg-gray-800"
                onClick={handleTogglePlay}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </Button>
            </div>

            <div className="flex-1 max-w-xl px-4">
              <audio 
                ref={audioRef}
                controls 
                autoPlay 
                className="w-full h-10 [&::-webkit-media-controls-panel]:bg-gray-800 [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-time-remaining-display]:text-white"
                src={currentTrack.url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  // Optional: Play next track logic could go here
                }}
              />
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => {
                setIsPlayerOpen(false);
                setCurrentTrack(null);
              }}
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Avatar Creator Dialog */}
      <AvatarCreator 
        isOpen={showAvatarCreator}
        onClose={() => setShowAvatarCreator(false)}
        onSave={handleSaveAvatar}
        currentAvatarUrl={profile?.photoURL || user?.photoURL}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
            <DialogDescription>Update your personal information and profile settings.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Avatar Section - Full Width */}
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-purple-500">
                <AvatarImage 
                  src={profile?.photoURL || user.photoURL || undefined} 
                  alt={profile?.displayName || user.displayName || "User"} 
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-600 to-blue-600">
                  {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 
                   user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              
              <p className="text-xs text-gray-400">
                To change your profile picture, click the camera icon on your main profile page.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    className="bg-gray-800 border-gray-700"
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    className="bg-gray-800 border-gray-700 min-h-[80px]"
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={editFormData.location} 
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300">Shipping Address (Private)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1" className="text-xs text-gray-400">Address Line 1</Label>
                    <Input 
                      id="addressLine1"
                      placeholder="Street address, P.O. box"
                      className="bg-gray-800 border-gray-700"
                      value={editFormData.addressLine1}
                      onChange={(e) => setEditFormData({...editFormData, addressLine1: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2" className="text-xs text-gray-400">Address Line 2</Label>
                    <Input 
                      id="addressLine2"
                      placeholder="Apartment, suite, unit, etc."
                      className="bg-gray-800 border-gray-700"
                      value={editFormData.addressLine2}
                      onChange={(e) => setEditFormData({...editFormData, addressLine2: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs text-gray-400">City</Label>
                      <Input 
                        id="city"
                        placeholder="City"
                        className="bg-gray-800 border-gray-700"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs text-gray-400">State</Label>
                      <Input 
                        id="state"
                        placeholder="State"
                        className="bg-gray-800 border-gray-700"
                        value={editFormData.state}
                        onChange={(e) => setEditFormData({...editFormData, state: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-xs text-gray-400">Zip Code</Label>
                      <Input 
                        id="zip"
                        placeholder="Zip Code"
                        className="bg-gray-800 border-gray-700"
                        value={editFormData.zip}
                        onChange={(e) => setEditFormData({...editFormData, zip: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-xs text-gray-400">Country</Label>
                      <Select 
                        value={editFormData.country} 
                        onValueChange={(value) => setEditFormData({...editFormData, country: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationshipStatus">Relationship Status</Label>
                  <Select 
                    value={editFormData.relationshipStatus} 
                    onValueChange={(value) => {
                      const newPartnerId = value === "none" ? "" : value;
                      // If a partner is selected, force status to "Taken"
                      // If partner is removed, keep "Taken" or reset? 
                      // User requirement: "once a partner link is established... it should be 'Taken'"
                      // Implies: Link established -> Taken. Link removed -> User chooses (can stay Taken or change).
                      setEditFormData({
                        ...editFormData, 
                        partnerId: newPartnerId,
                        relationshipStatus: newPartnerId ? "Taken" : editFormData.relationshipStatus
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Looking">Looking</SelectItem>
                      <SelectItem value="Just Friends">Just Friends</SelectItem>
                      <SelectItem value="Taken">Taken</SelectItem>
                    </SelectContent>
                  </Select>
                  {!!editFormData.partnerId && editFormData.partnerId !== "none" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Relationship status is automatically set to "Taken" when a partner is linked.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vibe">Vibe Check</Label>
                  <Select 
                    value={editFormData.vibe} 
                    onValueChange={(value) => setEditFormData({...editFormData, vibe: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vibe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dark">Dark Mode</SelectItem>
                      <SelectItem value="Rage">Rage Mode</SelectItem>
                      <SelectItem value="Chill">Chill Mode</SelectItem>
                      <SelectItem value="Neon">Neon Mode</SelectItem>
                      <SelectItem value="Retro">Retro Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner">Partner (Link Profile)</Label>
                  <Select 
                    value={editFormData.partnerId || "none"} 
                    onValueChange={(value) => {
                      const newPartnerId = value === "none" ? "" : value;
                      // If a partner is selected, force status to "Taken"
                      // If partner is removed, keep "Taken" or reset? 
                      // User requirement: "once a partner link is established... it should be 'Taken'"
                      // Implies: Link established -> Taken. Link removed -> User chooses (can stay Taken or change).
                      setEditFormData({
                        ...editFormData, 
                        partnerId: newPartnerId,
                        relationshipStatus: newPartnerId ? "Taken" : editFormData.relationshipStatus
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a partner from friends" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Partner</SelectItem>
                      {friends.map((friend) => (
                        <SelectItem key={friend.userId} value={friend.userId}>
                          {friend.displayName || "Unknown User"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a friend to display as your partner on your profile.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Interests</Label>
                  <Input 
                    id="interests" 
                    className="bg-gray-800 border-gray-700"
                    value={editFormData.interests}
                    onChange={(e) => setEditFormData({...editFormData, interests: e.target.value})}
                    placeholder="e.g. music, art, travel"
                  />
                </div>
              </div>

              {/* Right Column - Social & Privacy */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Social Links</Label>
                  <div className="grid gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="instagram" className="flex items-center gap-2 text-xs text-gray-400"><InstagramIcon className="h-3 w-3" /> Instagram URL</Label>
                      <Input 
                        id="instagram" 
                        className="bg-gray-900/50 border-gray-700 h-9"
                        value={editFormData.instagram}
                        onChange={(e) => setEditFormData({...editFormData, instagram: e.target.value})}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="facebook" className="flex items-center gap-2 text-xs text-gray-400"><FacebookIcon className="h-3 w-3" /> Facebook URL</Label>
                      <Input 
                        id="facebook" 
                        className="bg-gray-900/50 border-gray-700 h-9"
                        value={editFormData.facebook}
                        onChange={(e) => setEditFormData({...editFormData, facebook: e.target.value})}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="twitter" className="flex items-center gap-2 text-xs text-gray-400"><TwitterIcon className="h-3 w-3" /> X / Twitter URL</Label>
                      <Input 
                        id="twitter" 
                        className="bg-gray-900/50 border-gray-700 h-9"
                        value={editFormData.twitter}
                        onChange={(e) => setEditFormData({...editFormData, twitter: e.target.value})}
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="threads" className="flex items-center gap-2 text-xs text-gray-400"><AtSignIcon className="h-3 w-3" /> Threads URL</Label>
                      <Input 
                        id="threads" 
                        placeholder="https://threads.net/@username"
                        className="bg-gray-900/50 border-gray-700"
                        value={editFormData.threads}
                        onChange={(e) => setEditFormData({...editFormData, threads: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tiktok" className="flex items-center gap-2 text-xs text-gray-400"><FaTiktok className="h-3 w-3" /> TikTok URL</Label>
                      <Input 
                        id="tiktok" 
                        placeholder="https://tiktok.com/@username"
                        className="bg-gray-900/50 border-gray-700"
                        value={editFormData.tiktok}
                        onChange={(e) => setEditFormData({...editFormData, tiktok: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="soundcloud" className="flex items-center gap-2 text-xs text-gray-400"><FaSoundcloud className="h-3 w-3" /> SoundCloud URL</Label>
                      <Input 
                        id="soundcloud" 
                        placeholder="https://soundcloud.com/..."
                        className="bg-gray-900/50 border-gray-700"
                        value={editFormData.soundcloud}
                        onChange={(e) => setEditFormData({...editFormData, soundcloud: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2 text-xs text-gray-400"><PhoneIcon className="h-3 w-3" /> WhatsApp Number</Label>
                      <Input 
                        id="whatsapp" 
                        className="bg-gray-900/50 border-gray-700 h-9"
                        value={editFormData.whatsapp}
                        onChange={(e) => setEditFormData({...editFormData, whatsapp: e.target.value})}
                        placeholder="e.g. 15551234567 (include country code)"
                      />
                      <p className="text-xs text-gray-500">Include country code, no spaces or symbols.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between space-x-2 border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Private Profile</Label>
                    <p className="text-xs text-gray-400">
                      Hide from public directory.
                    </p>
                  </div>
                  <Switch
                    checked={editFormData.isPrivate}
                    onCheckedChange={(checked) => setEditFormData({...editFormData, isPrivate: checked})}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditProfileDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600"
              onClick={handleUpdateProfile}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

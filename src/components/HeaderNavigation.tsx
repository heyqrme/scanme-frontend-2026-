import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCartIcon, MenuIcon, XIcon, UserIcon, HomeIcon, StoreIcon, LogOutIcon, LogInIcon, UsersIcon, Share2Icon, DownloadIcon, ShoppingBagIcon, MessageCircleIcon, CalendarIcon, ActivityIcon, Loader2, CircleHelp, ChevronDown, Shield, QrCodeIcon } from "lucide-react";
import { useAuthStore } from "../utils/auth-store";
import { useProductStore } from "../utils/product-store";
import { useChatStore } from "../utils/chat-store";
import { useFriendsStore } from "../utils/friends-store";
import { useGuideStore } from "../utils/guide-store";
import { useProfileStore } from "../utils/profile-store";
import { MessagesSheet } from "@/components/MessagesSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FlipLogo } from "./FlipLogo";
import { toast } from "sonner";
import { APP_BASE_PATH } from "app";
import { isIOSDevice as checkIsIOSDevice, getPwaInstallUrl, getInstallInstructions } from "../utils/pwa-utils";
import { getAvatarFallbackText, getRelationshipGradientClass, getRelationshipBorderColorClass, getSafeImageUrl } from "../utils/avatar-utils";

// Define BeforeInstallPromptEvent interface for PWA installation
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function HeaderNavigation() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  
  const { toggle: toggleGuide } = useGuideStore();
  
  const { subscribeToReceivedRequests, receivedRequests } = useFriendsStore();
  const { user } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();
  const [prevRequestCount, setPrevRequestCount] = useState(0);

  // Load user profile when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      loadProfile(user.uid);
    }
  }, [user?.uid, loadProfile]);

  // Subscribe to friend requests globally
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToReceivedRequests();
    return () => unsubscribe();
  }, [user, subscribeToReceivedRequests]);

  // Watch for new friend requests to show toast
  useEffect(() => {
    if (receivedRequests.length > prevRequestCount) {
      // Only show toast if the latest request is recent (within the last minute)
      // This prevents "reminders" of old pending requests on page reload
      // Sort to ensure we get the absolutely newest request, as store order isn't guaranteed
      const sortedRequests = [...receivedRequests].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestRequest = sortedRequests[0];

      if (latestRequest) {
        const requestTime = new Date(latestRequest.createdAt).getTime();
        const now = Date.now();
        const isRecent = (now - requestTime) < 60000; // 1 minute
        
        // Only toast if it's a fresh request that just arrived
        if (isRecent && prevRequestCount !== 0) {
          const locationText = latestRequest.location?.address ? ` from ${latestRequest.location.address}` : "";
          toast.info(`You have a new friend request${locationText}!`, {
            action: {
              label: "View",
              onClick: () => navigate("/profile?tab=friends")
            }
          });
        }
      }
    }
    setPrevRequestCount(receivedRequests.length);
  }, [receivedRequests.length, receivedRequests]); // Added receivedRequests to dependency to access the data
  
  // Check for PWA installability
  useEffect(() => {
    // Already installed check
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App is already installed
    }
    
    // Check for iOS devices
    setIsIOSDevice(checkIsIOSDevice());
    
    // For other devices, listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Handle PWA installation
  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user's choice
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast.success("Thanks for installing ScanMe!");
      }
      
      // Clear the saved prompt as it can't be used again
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      // If native install prompt is not available (iOS, already installed, or unsupported)
      // Redirect to the dedicated install help page
      navigate("/pwa-install");
    }
  };
  // Navigate to PWA install page
  const goToPwaInstallPage = () => {
    navigate("/pwa-install");
  };
  
  // Function to copy PWA installation link
  const copyPwaLink = () => {
    try {
      const pwaUrl = getPwaInstallUrl();
      const instructions = getInstallInstructions();
      
      // Copy to clipboard
      navigator.clipboard.writeText(pwaUrl);
      
      // Show success toast with instructions
      toast.success("PWA installation link copied!", {
        description: instructions,
        duration: 5000,
      });
    } catch (error) {
      console.error("Error copying PWA link:", error);
      toast.error("Failed to copy installation link");
    }
  };
  
  // Function to share app or profile
  const shareApp = async () => {
    try {
      const { user } = useAuthStore.getState();
      
      // Always share the main app URL (PRODUCTION_URL) when "Share App" is clicked
      // regardless of login status. 
      const baseUrl = getPwaInstallUrl();
      
      const shareUrl = baseUrl;
      
      const shareTitle = 'ScanMe - Connect with QR codes';
      
      const shareText = 'Join ScanMe - the social network where QR codes connect people!';
      
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success(user ? "Profile link copied to clipboard!" : "App link copied to clipboard!", {
          description: "Share this link with others"
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Silence user cancellation
      if (error.name !== 'AbortError') {
        toast.error("Failed to share");
      }
    }
  };
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user: authUser, loading } = useAuthStore(state => ({ user: state.user, loading: state.loading }));
  const logout = useAuthStore(state => state.logout);
  const cart = useProductStore(state => state.cart);
  const unreadCount = useChatStore(state => state.unreadCount);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Track scroll position for styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  
  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Navigation links
  const navLinks = [
    // Handle loading state for auth-dependent link
    loading
      ? { label: "Loading...", path: "#", icon: <Loader2 className="h-5 w-5 animate-spin" />, disabled: true }
      : authUser 
        ? { 
            label: "Scanner", 
            path: "/add-friend", 
            icon: <QrCodeIcon className="h-5 w-5" />,
            badge: receivedRequests.length > 0 ? receivedRequests.length : undefined
          }
        : { label: "Home", path: "/", icon: <HomeIcon className="h-5 w-5" /> },
    { label: "Feed", path: "/feed", icon: <ActivityIcon className="h-5 w-5" /> },
    { label: "Flip", path: "/flip", icon: <FlipLogo className="h-5 w-5" />, highlight: true },
    { label: "Events", path: "/events", icon: <CalendarIcon className="h-5 w-5" /> },
    { label: "Store", path: "/store", icon: <StoreIcon className="h-5 w-5" /> },
    { label: "Classifieds", path: "/marketplace", icon: <ShoppingBagIcon className="h-5 w-5" /> },
    { label: "Military & Vets", path: "/veteran-hub", icon: <Shield className="h-5 w-5" />, highlight: profile?.veteranStatus === 'verified' },
    authUser ? { label: "Profile", path: "/profile", icon: <UserIcon className="h-5 w-5" /> } : null,
    authUser ? { label: "Members", path: "/members", icon: <UsersIcon className="h-5 w-5" /> } : null,
    authUser ? { label: "Orders", path: "/orders", icon: <ShoppingCartIcon className="h-5 w-5" /> } : null,
    authUser?.isAdmin ? { label: "Admin", path: "/admin-store", icon: <Shield className="h-5 w-5" /> } : null,
  ].filter(Boolean);

  // Split links into primary (visible) and secondary (dropdown)
  // Show first 4 links directly, put the rest in dropdown
  const VISIBLE_COUNT = 4;
  const primaryNavLinks = navLinks.slice(0, VISIBLE_COUNT);
  const secondaryNavLinks = navLinks.slice(VISIBLE_COUNT);
  
  // Auth links
  const authLinks = authUser 
    ? [
        { 
          label: "Logout", 
          onClick: () => {
            logout();
            navigate("/");
          }, 
          icon: <LogOutIcon className="h-5 w-5" /> 
        }
      ]
    : [
        { label: "Login", path: "/login", icon: <LogInIcon className="h-5 w-5" /> },
        { label: "Sign Up", path: "/signup", highlight: true }
      ];
  
  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and AI Helper */}
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <div className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${getRelationshipGradientClass(profile?.relationshipStatus)}`}>
                ScanMe
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-full"
              onClick={toggleGuide}
              title="Ask AI Helper"
            >
              <CircleHelp className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden 2xl:flex items-center space-x-2">
            {primaryNavLinks.map((link, index) => (
              link && (
                <Button
                  key={index}
                  variant="ghost"
                  disabled={link.disabled}
                  className={`relative ${
                    link.highlight 
                      ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30' 
                      : 'text-gray-300 hover:text-white'
                  } ${location.pathname === link.path ? 'bg-gray-800/40' : ''}`}
                  onClick={() => !link.disabled && handleNavigation(link.path)}
                >
                  {link.icon && <span className="mr-2">{link.icon}</span>}
                  {link.label}
                  {link.badge && (
                    <span className="absolute -top-2 -right-2 bg-purple-500 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full animate-pulse z-50">
                      {link.badge}
                    </span>
                  )}
                </Button>
              )
            ))}

            {/* More Dropdown for secondary links & actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  More <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-900 border-gray-800 text-gray-300">
                {secondaryNavLinks.map((link, index) => (
                  link && (
                    <DropdownMenuItem 
                      key={index}
                      disabled={link.disabled}
                      className={`cursor-pointer focus:bg-gray-800 focus:text-white ${
                        link.highlight 
                          ? 'text-green-400 focus:text-green-300 focus:bg-green-900/30 hover:bg-green-900/30 hover:text-green-300' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      onClick={() => !link.disabled && handleNavigation(link.path)}
                    >
                      {link.icon && <span className="mr-2">{link.icon}</span>}
                      {link.label}
                      {link.badge && (
                        <span className="ml-auto bg-purple-500 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )
                ))}
                
                <DropdownMenuSeparator className="bg-gray-800" />
                
                {/* Install App */}
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 focus:text-white"
                  onClick={handleInstall}
                >
                  <DownloadIcon className="h-4 w-4 mr-2 text-green-400" />
                  Install App
                </DropdownMenuItem>

                {/* Share App */}
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 focus:text-white"
                  onClick={shareApp}
                >
                  <Share2Icon className="h-4 w-4 mr-2 text-purple-400" />
                  Share App
                </DropdownMenuItem>
                
                {/* PWA Link Copy (Sub-action of Install really, but accessible here) */}
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 focus:text-white"
                  onClick={copyPwaLink}
                >
                  <span className="ml-6 text-xs text-gray-400">Copy Install Link</span>
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>

            {/* Messages Button */}
            {authUser && (
              <Button
                variant="ghost"
                className={`text-gray-300 hover:text-white relative ${unreadCount > 0 ? 'text-white' : ''}`}
                onClick={() => setIsMessagesOpen(true)}
              >
                <MessageCircleIcon className={`h-5 w-5 ${unreadCount > 0 ? 'fill-purple-500/20 text-purple-400' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full z-50 shadow-sm hover:bg-red-700">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}
            
            {authUser && (
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white relative"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-500 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                    {cart.length}
                  </span>
                )}
              </Button>
            )}
          </nav>
          
          {/* Auth Actions (Desktop) */}
          <div className="hidden 2xl:flex items-center space-x-4">
            {authUser ? (
              <div className="flex items-center space-x-4">
                {/* User Avatar */}
                <Avatar 
                  className={`h-8 w-8 cursor-pointer ring-2 ring-offset-2 ring-offset-black ${getRelationshipBorderColorClass(profile?.relationshipStatus)}`}
                  onClick={() => navigate('/profile')}
                >
                  <AvatarImage 
                    src={getSafeImageUrl(authUser.photoURL)} 
                    alt={authUser.displayName || "User"} 
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(profile?.relationshipStatus)}`}>
                    {getAvatarFallbackText(authUser.displayName, profile?.relationshipStatus)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Logout Button */}
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  <LogOutIcon className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              /* Login / Signup Buttons */
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="2xl:hidden flex items-center">
            {/* Mobile Messages Button */}
            {authUser && (
              <Button
                variant="ghost"
                size="icon"
                className={`mr-2 text-gray-300 hover:text-white relative ${unreadCount > 0 ? 'text-white' : ''}`}
                onClick={() => setIsMessagesOpen(true)}
              >
                <MessageCircleIcon className={`h-5 w-5 ${unreadCount > 0 ? 'fill-purple-500/20 text-purple-400' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white h-4 w-4 flex items-center justify-center p-0 text-[10px] rounded-full z-50 shadow-sm hover:bg-red-700">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}
            
            {authUser && (
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white relative mr-2"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-500 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                    {cart.length}
                  </span>
                )}
              </Button>
            )}
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[250px] bg-gray-900 border-gray-800 overflow-y-auto">
                <SheetHeader className="sr-only">
                  <SheetTitle>Mobile Navigation Menu</SheetTitle>
                  <SheetDescription>Access pages and features</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${getRelationshipGradientClass(profile?.relationshipStatus)}`}>
                      ScanMe
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <XIcon className="h-5 w-5 text-gray-400" />
                    </Button>
                  </div>
                  
                  {/* User Info */}
                  {authUser && (
                    <div className="mb-6 pb-6 border-b border-gray-800">
                      <div className="flex items-center space-x-3">
                        <Avatar className={`h-10 w-10 ring-2 ring-offset-2 ring-offset-gray-900 ${getRelationshipBorderColorClass(profile?.relationshipStatus)}`}>
                          <AvatarImage 
                            src={getSafeImageUrl(authUser.photoURL)} 
                            alt={authUser.displayName || "User"} 
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className={`bg-gradient-to-br ${getRelationshipGradientClass(profile?.relationshipStatus)}`}>
                            {getAvatarFallbackText(authUser.displayName, profile?.relationshipStatus)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{authUser.displayName || "User"}</div>
                          <div className="text-sm text-gray-400">{authUser.email}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation Links */}
                  <nav className="flex flex-col space-y-2 mb-6">
                    {navLinks.map((link, index) => (
                      link && (
                        <Button
                          key={index}
                          variant="ghost"
                          disabled={link.disabled}
                          className={`justify-start ${
                            link.highlight 
                              ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30' 
                              : 'text-gray-300 hover:text-white'
                          } ${location.pathname === link.path ? 'bg-gray-800/40' : ''}`}
                          onClick={() => {
                            if (!link.disabled) {
                              handleNavigation(link.path);
                              setIsMobileMenuOpen(false);
                            }
                          }}
                        >
                          {link.icon && <span className="mr-3">{link.icon}</span>}
                          {link.label}
                          {link.badge && (
                            <span className="ml-auto bg-purple-500 text-white h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                              {link.badge}
                            </span>
                          )}
                        </Button>
                      )
                    ))}

                    {/* App Actions in Mobile Menu */}
                    <div className="pt-2 mt-2 border-t border-gray-800">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-300 hover:text-white"
                        onClick={() => {
                          handleInstall();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <DownloadIcon className="h-5 w-5 mr-3 text-green-400" />
                        Install App
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-300 hover:text-white"
                        onClick={() => {
                          shareApp();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Share2Icon className="h-5 w-5 mr-3 text-purple-400" />
                        Share App
                      </Button>
                    </div>
                  </nav>
                  
                  {/* Auth Links */}
                  <div className="flex flex-col space-y-2 mt-auto mb-8 pt-4 border-t border-gray-800">
                    {authUser ? (
                      <Button
                        variant="ghost"
                        className="justify-start text-gray-300 hover:text-white"
                        onClick={() => {
                          logout();
                          navigate('/');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOutIcon className="h-5 w-5 mr-3" />
                        Logout
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="justify-start text-gray-300 hover:text-white"
                          onClick={() => {
                            navigate('/login');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LogInIcon className="h-5 w-5 mr-3" />
                          Login
                        </Button>
                        <Button
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          onClick={() => {
                            navigate('/signup');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          Sign Up
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      <MessagesSheet isOpen={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} />
    </header>
  );
}

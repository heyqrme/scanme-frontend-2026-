import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Logo } from "components/Logo";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../utils/auth-store";
import { useEventStore } from "../utils/event-store";
import { toast } from "sonner";
import { apiClient } from "app";
import { APP_BASE_PATH } from "app";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, PlusIcon, PlayCircleIcon, TicketIcon, ZapIcon, Trophy, Search, QrCodeIcon, BellIcon, DownloadIcon } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Leaderboard } from "components/Leaderboard";
import { PwaListener } from "components/PwaListener";
import { usePwaStore } from "utils/pwa-store";
import { useActivationStore } from "../utils/activation-store";

// Re-trigger build 3
export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const { install, isInstallable, isIOS } = usePwaStore();
  const { checkCode, claimCode, isClaiming } = useActivationStore();
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoverQR, setHoverQR] = useState(false);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  // Handle QR code scan redirection
  useEffect(() => {
    const scanId = searchParams.get('s') || searchParams.get('scan');
    
    // Only proceed if we have a scan ID and auth loading is finished
    if (scanId && !loading) {
      if (user) {
        // If logged in, redirect to add friend page
        navigate(`/add-friend?id=${scanId}`);
      } else {
        // If not logged in, redirect to signup with friend ID
        // Store in session storage as backup
        sessionStorage.setItem('pendingFriendRequest', scanId);
        navigate(`/signup?friendId=${scanId}`);
      }
    }
  }, [searchParams, user, loading, navigate]);

  // Handle Activation Code
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !loading) {
      handleActivationCode(code);
    }
  }, [searchParams, loading, user]);

  const handleActivationCode = async (code: string) => {
    // Prevent re-checking if we are already showing dialog for this code
    if (showClaimDialog && activationCode === code) return;
    
    const result = await checkCode(code);
    if (!result) return;

    if (result.status === 'claimed') {
      if (user && result.ownerId === user.sub) {
        toast.info("You already own this item!");
        navigate('/profile');
      } else if (result.ownerId) {
        navigate(`/member?id=${result.ownerId}`);
      } else {
        toast.error("This item has already been claimed.");
      }
    } else if (result.status === 'active') {
      if (user) {
        setActivationCode(code);
        setShowClaimDialog(true);
      } else {
        // Redirect to signup with code
        // We use sessionStorage to persist code through signup flow if needed, 
        // but passing via URL is safer for direct redirects
        navigate(`/signup?code=${code}`);
      }
    } else {
      toast.error("Invalid activation code.");
    }
  };

  const onClaimConfirm = async () => {
    if (activationCode) {
      const success = await claimCode(activationCode);
      if (success) {
        setShowClaimDialog(false);
        setActivationCode(null);
        // Clear param
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('code');
        navigate(`/?${newSearchParams.toString()}`, { replace: true });
        
        // Show success and maybe redirect to profile
        toast.success("Item claimed successfully! Check your profile.");
        setTimeout(() => navigate('/profile'), 1500);
      }
    }
  };

  // Check Firebase config on load
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      console.log("App Version: Force Production URL Fix v2"); // Version check
      try {
        const response = await apiClient.get_firebase_config();
        if (!response.ok) {
          toast.error("Firebase configuration issue detected. Please contact support.", {
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Failed to check Firebase config:", error);
      }
    };
    
    checkFirebaseConfig();
    fetchEvents();
  }, []);

  // Track mouse movement for dynamic lighting effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative diagonal-lines">
      <PwaListener />
      {/* Dynamic lighting effects that follow mouse movement */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 filter blur-[150px] pointer-events-none transition-all duration-300"
          style={{ 
            left: `${mousePosition.x - 400}px`,
            top: `${mousePosition.y - 400}px`,
          }}
        />
        <motion.div 
          animate={{
            opacity: [0.4, 0.6, 0.4],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 -left-20 w-96 h-96 bg-purple-600/20 rounded-full filter blur-3xl"
        />
        <motion.div 
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            delay: 0.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-0 -right-20 w-96 h-96 bg-cyan-600/20 rounded-full filter blur-3xl"
        />
        <motion.div 
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 12,
            delay: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/20 rounded-full filter blur-3xl"
        />
      </div>

      {/* Laser light effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden md:block motion-reduce:hidden">
        {/* Magenta beam */}
        <div 
          className="laser-effect h-[150vh] w-[3px]" 
          style={{ 
            left: '20%', 
            animationDelay: '0s', 
            transform: 'rotate(45deg)',
            background: 'linear-gradient(to bottom, transparent, #d946ef, transparent)', // Magenta
            opacity: 0.7
          }} 
        />
        {/* Cyan beam */}
        <div 
          className="laser-effect h-[150vh] w-[2px]" 
          style={{ 
            left: '75%', 
            animationDelay: '1.5s', 
            transform: 'rotate(135deg)',
            background: 'linear-gradient(to bottom, transparent, #06b6d4, transparent)', // Cyan
            opacity: 0.6
          }} 
        />
        {/* Blue beam */}
        <div 
          className="laser-effect h-[150vh] w-[3px]" 
          style={{ 
            left: '40%', 
            animationDelay: '3s', 
            transform: 'rotate(30deg)',
            background: 'linear-gradient(to bottom, transparent, #3b82f6, transparent)', // Blue
            opacity: 0.8
          }} 
        />
        {/* Green beam */}
        <div 
          className="laser-effect h-[150vh] w-[2px]" 
          style={{ 
            left: '85%', 
            animationDelay: '4.5s', 
            transform: 'rotate(150deg)',
            background: 'linear-gradient(to bottom, transparent, #22c55e, transparent)', // Green
            opacity: 0.5
          }} 
        />
        {/* Yellow/Orange beam - cross cutting */}
        <div 
          className="laser-effect h-[150vh] w-[2px]" 
          style={{ 
            left: '10%', 
            top: '-20%',
            animationDelay: '2s', 
            transform: 'rotate(-25deg)',
            background: 'linear-gradient(to bottom, transparent, #eab308, transparent)', // Yellow
            opacity: 0.6
          }} 
        />
        {/* Pink beam - steep angle */}
        <div 
          className="laser-effect h-[150vh] w-[3px]" 
          style={{ 
            left: '60%', 
            top: '-20%',
            animationDelay: '0.5s', 
            transform: 'rotate(165deg)',
            background: 'linear-gradient(to bottom, transparent, #ec4899, transparent)', // Pink
            opacity: 0.7
          }} 
        />
        {/* Electric Blue beam */}
        <div 
          className="laser-effect h-[150vh] w-[2px]" 
          style={{ 
            left: '95%', 
            animationDelay: '3.5s', 
            transform: 'rotate(-45deg)',
            background: 'linear-gradient(to bottom, transparent, #00ffff, transparent)', // Electric Blue
            opacity: 0.6
          }} 
        />
        {/* Purple beam - wide angle */}
        <div 
          className="laser-effect h-[150vh] w-[3px]" 
          style={{ 
            left: '30%', 
            animationDelay: '5s', 
            transform: 'rotate(60deg)',
            background: 'linear-gradient(to bottom, transparent, #a855f7, transparent)', // Purple
            opacity: 0.5
          }} 
        />
      </div>
      
      {/* Scan lines */}
      <div className="scan-line"></div>
      <div className="scan-line" style={{ animationDelay: '2.5s' }}></div>
      
      {/* Geometric patterns in background - adds depth */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-purple-500/30 rotate-45" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 border border-blue-500/30 -rotate-12" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 border border-pink-500/30 rotate-30" />
        <div className="absolute -bottom-20 right-1/3 w-full h-48 bg-gradient-to-t from-purple-900/20 to-transparent" />
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <Logo size="large" withText={false} className="mr-4" />
              <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 neo-glow glow-text">
                ScanMe
              </h1>
            </div>
            <p className="text-xl md:text-2xl font-light mb-8 text-gray-300 max-w-2xl mx-auto">
              Love, friends, and events, — connect in a whole new way. Your identity, your style, your QR code.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {user ? (
                <>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-purple-700/30 hover:shadow-xl transition-all duration-300 text-lg neon-border flex items-center gap-2"
                    onClick={() => navigate('/add-friend')}
                  >
                    <QrCodeIcon className="w-5 h-5" />
                    Open Scanner
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-purple-500 text-purple-500 hover:bg-purple-500/10 font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 text-lg neon-text-purple"
                    onClick={() => navigate('/events')}
                  >
                    Events
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-purple-700/30 hover:shadow-xl transition-all duration-300 text-lg neon-border"
                    onClick={() => navigate('/signup')}
                  >
                    Get Your QR Code
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-purple-500 text-purple-500 hover:bg-purple-500/10 font-bold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 text-lg neon-text-purple"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          {/* How It Works Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full mt-16"
          >
            <div 
              onClick={() => navigate('/veteran-hub')}
              className="group relative h-full min-h-[250px] cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
            >
              {/* Neon Glow Frame - Red/White/Blue theme */}
              <div className="absolute -inset-[3px] bg-gradient-to-r from-red-600 via-blue-600 to-white rounded-xl opacity-40 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500"></div>
              
              {/* Content Container */}
              <div className="relative h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group-hover:border-transparent flex flex-col">
                <div className="flex-1 flex items-center justify-center p-0 bg-black">
                  <img 
                    src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/patriotic-neon-heart-stockcake.webp" 
                    alt="Military & Vets" 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  {/* Overlay QR Code in the center/heart if desired, but for now just the image as requested */}
                </div>
                {/* Label Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <p className="font-bold text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 neo-glow glow-text">Military & Vets</span>
                  </p>
                </div>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <div 
                  className="group relative h-full min-h-[250px] cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                  onMouseEnter={() => setIsVideoHovered(true)}
                  onMouseLeave={() => setIsVideoHovered(false)}
                >
                  {/* Neon Glow Frame - Cyan/Blue theme */}
                  <div className="absolute -inset-[3px] bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-xl opacity-40 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500"></div>
                  
                  <div className="relative h-full bg-black rounded-xl overflow-hidden border border-gray-800 group-hover:border-transparent">
                    {isVideoHovered ? (
                      <video 
                        src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/AIVID1.mp4"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/30 group-hover:bg-transparent transition-colors duration-300">
                      <motion.div
                        animate={isVideoHovered ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-black/40 rounded-full p-2 backdrop-blur-sm"
                      >
                        <PlayCircleIcon className="w-10 h-10 text-white opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      </motion.div>
                    </div>
                    {/* Label Overlay - Updated to match other cards */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <p className="font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse shadow-[0_0_8px_rgba(232,121,249,0.8)]"></span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-500 neo-glow glow-text">Connect with Friends</span>
                      </p>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl p-0 bg-black border-gray-800 overflow-hidden">
                <VisuallyHidden>
                  <DialogTitle>Intro Video</DialogTitle>
                  <DialogDescription>
                    Introduction video showcasing the ScanMe app features and community.
                  </DialogDescription>
                </VisuallyHidden>
                <div className="aspect-video w-full">
                  <video 
                    src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/AIVID1.mp4"
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    crossOrigin="anonymous"
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <div className="group relative h-full min-h-[250px] cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
                  {/* Neon Glow Frame - Green/Emerald theme */}
                  <div className="absolute -inset-[3px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 rounded-xl opacity-40 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500"></div>
                  
                  {/* Content Container */}
                  <div className="relative h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group-hover:border-transparent">
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                      <img 
                        src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250425_200308_Facebook.jpg" 
                        alt="Wear Your Code" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-black/50 p-3 rounded-full backdrop-blur-md border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                          <PlusIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    {/* Label Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <p className="font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-500 neo-glow glow-text">Wear Your Code</span>
                      </p>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl p-0 bg-black border-gray-800 overflow-hidden max-h-[90vh]">
                <VisuallyHidden>
                  <DialogTitle>Wear Your Code</DialogTitle>
                  <DialogDescription>
                    Example of how the QR code can be printed on merchandise and worn.
                  </DialogDescription>
                </VisuallyHidden>
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <img 
                    src="https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250425_200308_Facebook.jpg" 
                    alt="Wear Your Code" 
                    className="max-w-full max-h-[85vh] object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Claim Code Dialog */}
            <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
              <DialogContent className="sm:max-w-md bg-gray-900 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <QrCodeIcon className="w-6 h-6 text-purple-400" />
                    Claim Activation Code
                  </DialogTitle>
                  <DialogDescription className="text-gray-300">
                    You scanned a product code. Do you want to link this item to your profile?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-4 space-y-4">
                   <div className="bg-purple-900/20 p-4 rounded-full border border-purple-500/50">
                     <QrCodeIcon className="w-12 h-12 text-purple-400" />
                   </div>
                   <p className="text-center text-sm text-gray-400">
                     Code: <span className="font-mono text-white bg-gray-800 px-2 py-1 rounded">{activationCode}</span>
                   </p>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowClaimDialog(false)}
                    className="sm:w-auto w-full"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={onClaimConfirm} 
                    disabled={isClaiming}
                    className="bg-purple-600 hover:bg-purple-700 text-white sm:w-auto w-full"
                  >
                    {isClaiming ? "Claiming..." : "Claim Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <div className="group relative h-full min-h-[250px] cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
                  {/* Neon Glow Frame - Yellow/Gold theme */}
                  <div className="absolute -inset-[3px] bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-xl opacity-40 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500"></div>
                  
                  {/* Content Container */}
                  <div className="relative h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group-hover:border-transparent">
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                      <img 
                        src="https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=2068&auto=format&fit=crop" 
                        alt="Hunt & Earn" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-black/50 p-3 rounded-full backdrop-blur-md border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                          <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                      </div>
                    </div>
                    {/* Label Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <p className="font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse shadow-[0_0_12px_rgba(253,224,71,0.9)]"></span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-500 neo-glow glow-text">Hunt & Earn</span>
                      </p>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl p-6 bg-black border border-yellow-500/30 overflow-hidden">
                <VisuallyHidden>
                  <DialogTitle>Hunt & Earn</DialogTitle>
                  <DialogDescription>
                    Information about the game scanning feature.
                  </DialogDescription>
                </VisuallyHidden>
                <div className="text-center space-y-6">
                  <div className="mx-auto w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
                    <Trophy className="w-10 h-10 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Scan for Treasure</h2>
                    <p className="text-gray-300">
                      Scan special QR codes hidden at events and venues to collect virtual items, earn points, and climb the leaderboard!
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                      <Search className="w-6 h-6 text-purple-400 mb-2" />
                      <h3 className="font-bold text-white text-sm">Find Codes</h3>
                      <p className="text-xs text-gray-400">Hidden in plain sight</p>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                      <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
                      <h3 className="font-bold text-white text-sm">Win Prizes</h3>
                      <p className="text-xs text-gray-400">Top scorers get rewards</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                    onClick={() => {
                      if (user) navigate('/add-friend'); // Scanner is here
                      else navigate('/signup');
                    }}
                  >
                    Start Hunting
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* What's Happening Section - Events & Trending */}
          <div className="mt-24 max-w-7xl w-full mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Events Column */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="lg:col-span-2"
              >
                 <div className="relative h-full">
                   <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20"></div>
                   <div className="bg-black/80 backdrop-blur-xl p-6 md:p-8 rounded-xl relative overflow-hidden border border-purple-500/30 shadow-2xl shadow-purple-900/20 h-full flex flex-col">
                     
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/20 rounded-lg">
                            <CalendarIcon className="w-6 h-6 text-neon-purple" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Upcoming Experiences</h2>
                            <p className="text-sm text-gray-400">Don't miss out on the hottest parties</p>
                         </div>
                       </div>
                       {user?.isAdmin && (
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => navigate("/create-event")}
                           className="text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-neon-purple"
                         >
                           <PlusIcon className="w-3 h-3 mr-1" />
                           Post
                         </Button>
                       )}
                     </div>

                     <div className="mb-6 bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 text-sm text-gray-300 backdrop-blur-sm">
                        <p className="mb-2">
                          <span className="text-purple-400 font-semibold">ScanMe</span> users check into events instantly by having their unique code scanned at the entrance.
                        </p>
                        <p className="text-gray-400">
                          Event hosts can also scan users throughout the event to unlock exclusive perks, fast access, and special product discounts.
                        </p>
                     </div>
                     
                     {events.length === 0 ? (
                       <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl bg-gray-900/30 flex-grow flex flex-col justify-center">
                         <ZapIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                         <p className="text-gray-400 text-lg">No upcoming events at the moment.</p>
                         <p className="text-gray-500 text-sm mt-2 mb-6">Stay tuned for the next big drop!</p>
                         <Button 
                            variant="outline"
                            className="mx-auto border-purple-500/50 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            onClick={() => toast.success("You'll be notified when new events drop!")}
                         >
                            <BellIcon className="w-4 h-4 mr-2" />
                            Notify Me
                         </Button>
                       </div>
                     ) : (
                       <ScrollArea className="h-[800px] w-full pr-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                           {events.map((event, index) => (
                             <div 
                               key={event.id}
                               className="group h-full relative bg-gray-900/80 border border-gray-800 hover:border-pink-500/50 rounded-xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)] flex flex-col"
                             >
                               {/* Featured Badge for first item */}
                               {index === 0 && (
                                 <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                                   <ZapIcon className="w-3 h-3 fill-current" /> HOT
                                 </div>
                               )}

                               {/* Price Badge */}
                               <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md border border-purple-500/30 text-white text-sm font-bold px-3 py-1 rounded-full">
                                 {event.price && event.price > 0 ? `$${event.price}` : "FREE"}
                               </div>

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
                                 <div className="absolute bottom-0 left-0 w-full p-4 pt-12 bg-gradient-to-t from-black to-transparent">
                                    <p className="text-purple-400 font-bold text-sm mb-1 uppercase tracking-wider">
                                      {(() => {
                                         try {
                                           return format(new Date(event.date), 'MMM d • h:mm a');
                                         } catch (e) {
                                           return 'Date TBA';
                                         }
                                       })()}
                                    </p>
                                    <h3 className="text-xl font-bold text-white leading-tight group-hover:text-pink-400 transition-colors line-clamp-2">
                                      {event.title}
                                    </h3>
                                 </div>
                               </div>
                              
                               <div className="p-4 flex flex-col flex-grow bg-gray-900/50">
                                 <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                                   <MapPinIcon className="h-3 w-3 text-gray-500" />
                                   <span className="line-clamp-1">{event.location || "TBA"}</span>
                                 </div>
                                 
                                 <div className="mt-auto pt-3 border-t border-gray-800/50 flex gap-2">
                                   <Button 
                                     size="sm"
                                     className="flex-1 bg-white/5 hover:bg-purple-600 hover:text-white border border-gray-700 hover:border-purple-500 text-white transition-all duration-300 text-xs"
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
                                     size="sm"
                                     className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-900/20 text-xs"
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
                                     <TicketIcon className="w-3 h-3 mr-1" />
                                     Tickets
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </ScrollArea>
                     )}
                   </div>
                 </div>
              </motion.div>

              {/* Leaderboard Column */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
                className="lg:col-span-1"
              >
                <div className="relative h-full">
                  <div className="absolute -inset-1 bg-gradient-to-b from-orange-500 to-purple-600 rounded-2xl blur opacity-20"></div>
                  <div className="bg-black/80 backdrop-blur-xl p-1 rounded-xl relative overflow-hidden border border-orange-500/20 shadow-2xl shadow-orange-900/10 h-full">
                    <Leaderboard compact={true} />
                    
                    <div className="mt-4 text-center px-4 pb-4">
                      <Button 
                        variant="ghost" 
                        className="w-full text-gray-400 hover:text-white hover:bg-white/5 text-xs"
                        onClick={() => navigate('/members')}
                      >
                        View All Members
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* CTA Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-24 text-center max-w-3xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 neo-glow glow-text">
              Ready to join the community?
            </h2>
            <p className="text-gray-400 mb-8">
              Create your account, get your unique QR code, and start connecting with friends in an exciting new way.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-10 rounded-lg shadow-lg shadow-purple-700/30 hover:shadow-purple-700/60 hover:shadow-xl transition-all duration-300 text-xl neon-border relative overflow-hidden group"
              onClick={() => navigate(user ? '/profile' : '/signup')}
            >
              {/* Shine effect */}
              <div className="absolute w-24 h-full -skew-x-12 top-0 -left-32 bg-white/10 group-hover:animate-shine pointer-events-none"></div>
              {user ? 'Go to Profile' : 'Get Started'}
            </Button>
          </motion.div>

          {/* QR Code Section for Mobile Signup */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-24 mb-16 hidden md:flex flex-col items-center justify-center"
          >
            <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.5)] relative group hover:scale-110 transition-transform duration-300 rotate-45">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative bg-white p-2 rounded-lg">
                <QRCodeSVG 
                  value={`${window.location.origin}${APP_BASE_PATH === '/' ? '' : APP_BASE_PATH.replace(/\/$/, '')}/signup`}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>
            <p className="mt-16 text-gray-300 text-lg font-medium flex items-center gap-2 bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm border border-white/10">
              <ZapIcon className="w-4 h-4 text-yellow-400 fill-current animate-pulse" />
              Scan with phone to sign up
            </p>
          </motion.div>

          {/* Mobile Install App Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-16 mb-16 flex flex-col items-center justify-center md:hidden"
          >
             <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-2xl border border-purple-500/30 w-full max-w-sm text-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
               <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg animate-bounce-slow">
                 <QrCodeIcon className="w-8 h-8 text-white" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Get the App</h3>
               <p className="text-gray-400 mb-6 text-sm">
                 Install ScanMe for the best experience. Access your ID offline and get instant notifications.
               </p>
               <Button 
                 className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg shadow-lg shadow-purple-900/40 border border-white/10"
                 onClick={() => {
                   if (isIOS) {
                     navigate('/pwa-install');
                   } else if (isInstallable) {
                     install();
                   } else {
                     navigate('/pwa-install');
                   }
                 }}
               >
                 <DownloadIcon className="mr-2 h-5 w-5 animate-pulse" />
                 {isIOS ? "Install on iOS" : "Install App"}
               </Button>
               <p className="mt-4 text-xs text-gray-500">
                 {isIOS ? "Tap Share > Add to Home Screen" : "Quick and easy installation"}
               </p>
             </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/40 backdrop-blur-sm border-t border-gray-800 py-8">
        {/* Sound equalizer */}
        <div className="absolute top-0 -translate-y-full right-10 flex items-end space-x-1 h-16">
          <div className="equalizer-bar h-5"></div>
          <div className="equalizer-bar h-8"></div>
          <div className="equalizer-bar h-4"></div>
          <div className="equalizer-bar h-10"></div>
          <div className="equalizer-bar h-6"></div>
          <div className="equalizer-bar h-3"></div>
        </div>
        <div className="container mx-auto px-4 text-center">
          <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mb-6 rounded-full"></div>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} ScanMe. All rights reserved.</p>
            <span className="hidden md:block">•</span>
            <button onClick={() => navigate('/legal')} className="hover:text-purple-400 transition-colors">
              Legal & Privacy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

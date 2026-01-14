import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { useFriendsStore } from "../utils/friends-store";
import { getSecureAuthToken } from "../utils/firebase";
import { apiClient } from "app";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRScanner } from "../components/QRScanner";
import { CameraIcon, ArrowLeftIcon, Trophy } from "lucide-react";

export default function AddFriend() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { handleQrCodeFriendRequest } = useFriendsStore();
  const [loading, setLoading] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  // Game state
  const [foundItem, setFoundItem] = useState<any | null>(null);
  const [gamePoints, setGamePoints] = useState<number>(0);

  useEffect(() => {
    // Extract user ID from the URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const userId = queryParams.get('id');
    
    if (userId && userId.length > 0) {
      setFriendId(userId);
    } else {
      // If no ID is provided, show scanner instead of error
      // This handles the case of direct navigation to the add-friend page
      setShowScanner(true);
    }
  }, [location]);

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!user && !loading) {
      const queryParams = new URLSearchParams(location.search);
      const id = queryParams.get('id');
      
      toast.info("Please login to add a friend");
      
      if (id) {
        navigate(`/login?friendId=${id}`);
      } else {
        navigate('/login');
      }
    }
  }, [user, navigate, location.pathname, location.search, loading]);

  const handleAddFriend = async () => {
    if (!friendId) return;
    
    setLoading(true);
    try {
      // Check if adding self
      if (user?.uid === friendId) {
        toast.error("You cannot add yourself as a friend");
        navigate('/profile');
        return;
      }

      let locationData = undefined;

      // Try to get location
      try {
        // We'll use a short timeout so we don't block the user too long if location is slow
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
             timeout: 5000,
             maximumAge: 60000 
          });
        });

        const { latitude, longitude } = position.coords;
        
        // Get auth token explicitly to avoid race conditions
        const token = await getSecureAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Call reverse geocode API
        const response = await apiClient.reverse_geocode(
          { lat: latitude, lng: longitude },
          { headers }
        );
        const data = await response.json();
        
        locationData = {
          lat: latitude,
          lng: longitude,
          address: data.address || undefined
        };
        
      } catch (geoError) {
        console.warn("Location tagging failed or denied:", geoError);
        // We continue without location data - it's an enhancement, not a blocker
      }
      
      const result = await handleQrCodeFriendRequest(friendId, locationData);
      if (result) {
        if (locationData?.address) {
           toast.success(`Friend request sent from ${locationData.address}!`);
        } else {
           toast.success("Friend request sent successfully!");
        }
      }
      navigate('/profile');
    } catch (error) {
      console.error("Error adding friend:", error);
      setError("Failed to add friend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle QR code scanning result
  const handleQRCodeScanned = async (result: string) => {
    try {
      console.log("Scanned QR Raw Result:", result);
      
      // 1. Try to scan as a Game Item first
      try {
        const gameResponse = await apiClient.scan_game_item({ code: result });
        if (gameResponse.ok) {
          const gameData = await gameResponse.json();
          if (gameData.success) {
             toast.success(gameData.message);
             setFoundItem(gameData.item);
             setGamePoints(gameData.points_earned);
             setShowScanner(false);
             return;
          } else if (gameData.message) {
             toast.info(gameData.message);
             // If already found, maybe just show info?
             if (gameData.item) {
                setFoundItem(gameData.item);
                setShowScanner(false);
                return;
             }
          }
        }
      } catch (gameErr) {
        // Ignore errors here, assume it's not a game item if it fails (e.g. 404)
        console.log("Not a game item or scan failed:", gameErr);
      }

      let userId: string | null = null;

      try {
        // Try to extract user ID from scanned URL
        const url = new URL(result);
        const urlParams = new URLSearchParams(url.search);
        // Check for 'id', 's' (shortened), or 'scan' params
        userId = urlParams.get('id') || urlParams.get('s') || urlParams.get('scan');
      } catch (e) {
        // If not a valid URL, check if the result itself is a potential user ID
        // Firebase IDs are typically alphanumeric
        if (/^[a-zA-Z0-9]{20,}$/.test(result)) {
          userId = result;
        }
      }
      
      if (userId && userId.length > 0) {
        setFriendId(userId);
        setShowScanner(false);
        toast.success("QR code scanned successfully");
      } else {
        console.error("Invalid QR code content:", result);
        setError("Invalid QR code. Could not find user ID.");
        toast.error("Invalid QR code. Please try again.");
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setError("Error processing QR code");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {foundItem ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-6 rounded-xl bg-gradient-to-br from-purple-900/90 to-black border border-purple-500/50 relative overflow-hidden text-center"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
          
          <div className="relative z-10 flex flex-col items-center gap-4">
             <div className="bg-yellow-500/20 p-4 rounded-full mb-2 animate-bounce">
               <Trophy className="h-16 w-16 text-yellow-400" />
             </div>
             
             <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
               Challenge Complete!
             </h2>
             
             <div className="bg-black/40 p-4 rounded-lg border border-purple-500/30 w-full mt-2">
               <h3 className="text-xl font-bold text-white mb-1">{foundItem.name}</h3>
               <p className="text-purple-200 text-sm mb-3">{foundItem.description}</p>
               <div className="inline-block bg-purple-600 px-3 py-1 rounded-full text-white font-bold text-sm">
                 +{gamePoints} Points
               </div>
             </div>
             
             <div className="flex gap-3 w-full mt-4">
               <Button 
                 className="flex-1 bg-white text-purple-900 hover:bg-gray-100"
                 onClick={() => {
                   setFoundItem(null);
                   setShowScanner(true);
                 }}
               >
                 Scan More
               </Button>
               <Button 
                 className="flex-1 bg-purple-600 hover:bg-purple-700"
                 onClick={() => navigate('/profile')}
               >
                 View Profile
               </Button>
             </div>
          </div>
        </motion.div>
      ) : showScanner ? (
        <div className="w-full max-w-md p-4">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/profile')} 
              className="mr-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Scan QR Code</h1>
          </div>
          
          <QRScanner 
            onScan={handleQRCodeScanned}
            onClose={() => navigate('/profile')}
          />
          
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <h3 className="font-bold text-yellow-400 mb-1">Game Mode Active</h3>
            <p className="text-sm text-gray-300">
              This scanner also detects hidden <strong>Game Items</strong>! 
              <br/>Find secret QR codes at events to earn points and unlock rewards.
            </p>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full p-6 rounded-xl bg-card border border-border relative overflow-hidden"
        >
          {/* Diagonal lines overlay for depth */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%)]" 
              style={{ backgroundSize: '8px 8px' }} />
          </div>
          
          <div className="text-center space-y-4 relative z-10">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold mb-4 text-primary inline-block relative">
                <span className="relative z-10">Scanner</span>
                <span className="absolute inset-0 blur-sm opacity-70 bg-primary/30 z-0"></span>
              </h1>
            </motion.div>
            
            {error ? (
              <div className="text-destructive">{error}</div>
            ) : friendId && (
              <p className="text-muted-foreground">Do you want to send a friend request?</p>
            )}
            
            <div className="flex flex-col gap-4 mt-6">
              <Button 
                onClick={handleAddFriend} 
                disabled={loading || !friendId || !!error}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 transition-all duration-300 relative overflow-hidden group"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600/50 to-blue-500/50 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">
                  {loading ? "Processing..." : "Send Friend Request"}
                </span>
              </Button>
              
              <Button 
                onClick={() => setShowScanner(true)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <CameraIcon className="h-4 w-4" />
                Scan Different QR Code
              </Button>
              
              <Button 
                onClick={() => navigate('/profile')} 
                variant="ghost" 
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DownloadIcon, ShareIcon, Loader2Icon } from "lucide-react";
import { Logo } from "./Logo";
import { UserProfile } from "utils/profile-store";
import { User } from "firebase/auth";
import { PRODUCTION_URL } from "utils/config";
import { motion } from "framer-motion";
import { getAvatarFallbackText, getRelationshipGradientClass, getSafeImageUrl } from "../utils/avatar-utils";

interface SocialShareCardProps {
  user: User;
  profile: UserProfile | null;
  qrValue: string;
  vibeStyles: any; // Passing the styles object we used in Profile.tsx
  onClose?: () => void;
}

export function SocialShareCard({ user, profile, qrValue, vibeStyles, onClose }: SocialShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentVibe = (profile?.vibe as keyof typeof vibeStyles) || "Dark";
  const styles = vibeStyles[currentVibe] || vibeStyles.Dark;
  
  // Get colors for QR code
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

  const handleShare = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Wait for images to load (avatar)
      const canvas = await html2canvas(cardRef.current, {
        scale: 4, // Higher resolution (4x for crispy Instagram Stories)
        backgroundColor: null,
        useCORS: true, // Important for external images like Firebase Storage
        allowTaint: true,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const filename = `scanme-${profile?.displayName || "profile"}.png`;
      
      // Convert to blob for sharing
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // Try native sharing first (Mobile/Supported Browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'My ScanMe Card',
            text: 'Scan to connect with me!'
          });
          if (onClose) onClose();
        } catch (shareError) {
            // Ignore AbortError (user cancelled share sheet)
            if ((shareError as Error).name !== 'AbortError') {
                 console.error("Share failed, falling back to download", shareError);
                 // Fallback to download
                 const link = document.createElement("a");
                 link.href = image;
                 link.download = filename;
                 link.click();
                 if (onClose) onClose();
            }
        }
      } else {
          // Fallback for desktop/unsupported browsers
          const link = document.createElement("a");
          link.href = image;
          link.download = filename;
          link.click();
          if (onClose) onClose();
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative group">
        {/* The Card Container - 9:16 Aspect Ratio */}
        {/* Width 320px -> Height ~569px */}
        <div 
          ref={cardRef}
          className="w-[320px] h-[569px] relative overflow-hidden rounded-2xl flex flex-col items-center justify-between py-8 px-6 bg-black border border-gray-800"
          style={{
            boxShadow: "0 0 40px rgba(0,0,0,0.5)"
          }}
        >
          {/* Background Effects */}
          <div className={`absolute inset-0 bg-gradient-to-br ${styles.background} opacity-40 pointer-events-none`}></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-0"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-0"></div>
          
          {/* Content Layer */}
          <div className="relative z-10 flex flex-col items-center w-full h-full justify-between">
            
            {/* Header */}
            <div className="flex flex-col items-center space-y-2 pt-2">
              <div className="flex items-center gap-2 mb-2">
                 <div className="bg-black/50 p-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                    <Logo size="small" withText={false} />
                 </div>
                 <span className="font-bold text-white tracking-widest text-sm uppercase">ScanMe</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-1 rounded-full bg-gradient-to-tr ${styles.gradient}`}>
                <Avatar className="h-32 w-32 border-4 border-black shadow-2xl">
                  <AvatarImage 
                    src={getSafeImageUrl(profile?.photoURL || user.photoURL)} 
                    alt={profile?.displayName || "User"} 
                    crossOrigin="anonymous" // Crucial for html2canvas
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className={`text-4xl bg-gradient-to-br ${getRelationshipGradientClass(profile?.relationshipStatus)} text-white`}>
                    {getAvatarFallbackText(
                      profile?.displayName || user.displayName,
                      profile?.relationshipStatus
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md mb-1">
                  {profile?.displayName || "User"}
                </h2>
                {profile?.vibe && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-black/50 backdrop-blur-md ${styles.border} ${styles.accent}`}>
                    {profile.vibe} Vibe
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center space-y-4 mb-4 w-full">
              <div 
                className={`p-4 rounded-xl transform transition-transform duration-500 bg-white shadow-2xl relative`}
                style={{ backgroundColor: qrBgColor }}
              >
                <div className="absolute inset-0 border-2 border-white/20 rounded-xl pointer-events-none"></div>
                <QRCodeSVG 
                  value={qrValue} 
                  size={180} 
                  bgColor={qrBgColor}
                  fgColor={qrFgColor}
                  level="M"
                />
              </div>
              
              <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                <p className="text-white font-medium tracking-wide text-sm uppercase">
                  Scan to Connect
                </p>
              </div>
            </div>
            
            {/* Footer URL */}
            <div className="pb-2">
              <p className="text-xs text-white/40 font-mono">scanme.app</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={handleShare} 
          disabled={isGenerating}
          className={`bg-gradient-to-r ${styles.gradient} text-white font-bold min-w-[160px]`}
        >
          {isGenerating ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ShareIcon className="mr-2 h-4 w-4" />
              Share Card
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-500 text-center max-w-[300px]">
        Perfect for Instagram Stories, TikTok, or Snapchat. Download and share!
      </p>
    </div>
  );
}

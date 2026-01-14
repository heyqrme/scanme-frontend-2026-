import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isIOSDevice, getInstallInstructions } from "../utils/pwa-utils";
import { ArrowDown, Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function PwaInstall() {
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Get the installation URL
  const installUrl = window.location.origin;
  
  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);
  
  // Copy the URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Failed to copy link");
      console.error("Failed to copy:", err);
    }
  };
  
  // Share the URL using Web Share API if available
  const shareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Install ScanMe App",
          text: "Install ScanMe on your device: " + getInstallInstructions(),
          url: installUrl,
        });
        toast.success("Thanks for sharing!");
      } catch (err) {
        // User probably canceled the share
        console.log("Share cancelled", err);
      }
    } else {
      // Fallback to clipboard
      copyUrl();
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-black to-purple-950">
      <div className="max-w-md w-full">
        <Card className="w-full border-purple-800/50 backdrop-blur-sm bg-black/50">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              Install ScanMe
            </CardTitle>
            <CardDescription className="text-gray-300">
              Share this page with new users to help them install ScanMe app
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* QR Code for the installation link */}
            <div className="flex justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(installUrl)}`}
                alt="ScanMe Installation QR Code"
                className="w-48 h-48 rounded-lg border-2 border-purple-500/50 p-1"
              />
            </div>
            
            {/* Installation URL */}
            <div className="relative">
              <div className="p-3 bg-gray-900/70 rounded-lg border border-gray-800 text-sm break-all">
                {installUrl}
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-gray-800/80"
                onClick={copyUrl}
              >
                {copied ? "Copied!" : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Installation Instructions */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold mb-2 text-white">Installation Instructions</h3>
              <div className="space-y-4">
                {isIOS ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">1</span>
                      Open this link in Safari
                    </p>
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">2</span>
                      Tap the share icon <Share2 className="inline-block h-3 w-3 ml-1 mr-1" />
                    </p>
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">3</span>
                      Select "Add to Home Screen"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">1</span>
                      Open this link in Chrome or Edge
                    </p>
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">2</span>
                      Look for the install prompt or click the install icon in the address bar
                    </p>
                    <p className="text-sm text-gray-300 flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center mr-2">3</span>
                      Follow the installation instructions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="justify-between">
            <Button variant="outline" className="border-purple-700" onClick={() => window.history.back()}>
              Back to App
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" className="border-purple-700" onClick={copyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600" onClick={shareUrl}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 flex flex-col items-center">
        <ArrowDown className="h-6 w-6 text-purple-400 animate-bounce" />
        <p className="text-sm text-gray-400 mt-2 text-center">
          The link above is all you need to share with new users
        </p>
      </div>
    </div>
  );
}

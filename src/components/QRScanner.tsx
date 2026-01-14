import React, { useState, useEffect } from "react";
import { useZxing } from "react-zxing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2Icon, CameraIcon, XIcon, UploadIcon } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  // Camera scanner setup using react-zxing
  const { ref, torch } = useZxing({
    onDecodeResult(result) {
      onScan(result.getText());
    },
    onError(error) {
      console.error("Scanner error:", error);
    },
    constraints: {
      video: {
        facingMode: "environment",
      },
    },
  });

  // Handle file-based QR code scanning
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  // Process the selected image file to scan for QR code
  useEffect(() => {
    const processQRCodeImage = async () => {
      if (!selectedFile) return;

      try {
        setIsLoading(true);
        setIsCameraActive(false);

        // Create a new Image element
        const img = new Image();
        img.src = URL.createObjectURL(selectedFile);

        // Wait for the image to load
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Use BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          // @ts-ignore - BarcodeDetector is not in TypeScript DOM lib yet
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          // @ts-ignore
          const barcodes = await barcodeDetector.detect(imageData);
          
          if (barcodes.length > 0) {
            onScan(barcodes[0].rawValue);
            return;
          }
        } else {
          // Fallback message if BarcodeDetector isn't available
          toast.error("QR code scanning from images isn't supported in this browser. Please use the camera instead.");
        }

        setIsLoading(false);
        URL.revokeObjectURL(img.src); // Clean up the object URL
      } catch (error) {
        console.error('Error processing QR code image:', error);
        toast.error("Failed to process image. Please try again or use camera.");
        setIsLoading(false);
      }
    };

    processQRCodeImage();
  }, [selectedFile, onScan]);

  return (
    <Card className="p-4 bg-black border border-purple-800 rounded-lg max-w-md w-full relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">Scan QR Code</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {isCameraActive && (
        <div className="relative overflow-hidden rounded-md aspect-square bg-gray-950 mb-4">
          <video
            ref={ref}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 border-2 border-purple-500 opacity-50 pointer-events-none">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-purple-500 opacity-80"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-500 opacity-80"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-500 opacity-80"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500 opacity-80"></div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-12 w-12 animate-spin text-purple-500" />
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => setIsCameraActive(true)}
          className={`flex-1 ${isCameraActive ? 'bg-purple-700 hover:bg-purple-800' : 'bg-gray-800 hover:bg-gray-700'}`}
        >
          <CameraIcon className="mr-2 h-4 w-4" />
          Camera
        </Button>
        <label className="flex-1">
          <Button
            asChild
            className={`w-full ${!isCameraActive && !isLoading ? 'bg-purple-700 hover:bg-purple-800' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            <span>
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload
              <input
                id="qr-file-upload"
                name="qrFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </span>
          </Button>
        </label>
      </div>
    </Card>
  );
}

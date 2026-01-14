import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface LogoProps {
  size?: "small" | "medium" | "large";
  withText?: boolean;
  className?: string;
}

export function Logo({ size = "medium", withText = true, className = "" }: LogoProps) {
  // Set size values
  const dimensions = {
    small: { logo: 24, font: "text-xl" },
    medium: { logo: 32, font: "text-2xl" },
    large: { logo: 40, font: "text-3xl" },
  };
  
  const { logo, font } = dimensions[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Simple QR code logo mark */}
      <div className="bg-black p-1 rounded-md border border-gray-800">
        <QRCodeSVG 
          value="https://scanme.app" 
          size={logo} 
          fgColor="#A855F7" 
          bgColor="transparent"
          level="L"
          includeMargin={false}
        />
      </div>
      
      {/* Brand name */}
      {withText && (
        <span className={`font-bold ${font}`}>
          ScanMe
        </span>
      )}
    </div>
  );
}

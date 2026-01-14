import React from "react";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface NeonFlagProps {
  className?: string;
}

export function NeonFlag({ className }: NeonFlagProps) {
  return (
    <div className={cn("relative w-full aspect-[1.9] bg-black/40 rounded-lg overflow-hidden border border-gray-800 shadow-2xl", className)}>
      {/* Stripes */}
      <div className="absolute inset-0 flex flex-col">
        {Array.from({ length: 13 }).map((_, i) => {
          const isRed = i % 2 === 0;
          return (
            <div 
              key={i} 
              className={cn(
                "flex-1 w-full transition-all duration-1000",
                isRed 
                  ? "bg-pink-600/90 shadow-[0_0_12px_rgba(236,72,153,0.8)] z-10" 
                  : "bg-cyan-900/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]" // "White" stripes now have a faint cyan glow
              )}
            >
              {/* Neon tube core effect */}
              {isRed && <div className="w-full h-[2px] bg-pink-300/80 shadow-[0_0_4px_#fff] mt-[2px]" />}
              {!isRed && <div className="w-full h-[1px] bg-cyan-400/30 mt-[1px]" />}
            </div>
          );
        })}
      </div>

      {/* Canton (Blue Field) */}
      <div className="absolute top-0 left-0 w-[40%] h-[53.85%] bg-indigo-950/90 backdrop-blur-md border-r-2 border-b-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center justify-center z-20">
        {/* Neon QR Code replacing stars */}
        <div className="relative w-full h-full flex items-center justify-center p-1">
            {/* Glow effect behind QR */}
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
            
            <QRCodeSVG 
              value="https://scanme.app/veteran-hub" 
              className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,1)]"
              fgColor="#22d3ee" // Neon Cyan (cyan-400)
              bgColor="transparent" 
              width="100%"
              height="100%"
              level="M"
            />
        </div>
      </div>
      
      {/* Overlay Scanline/Gloss effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}

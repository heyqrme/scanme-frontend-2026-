import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MapPinIcon, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface CheckIn {
  userId: string;
  displayName: string;
  photoURL?: string;
  timestamp: { _seconds: number, _nanoseconds: number } | string | Date;
  status: 'here' | 'going';
  icebreaker?: string;
  visibility?: 'public' | 'friends_only' | 'anonymous';
  tags?: string[];
}

interface NetworkCardProps {
  checkin: CheckIn;
}

export function NetworkCard({ checkin }: NetworkCardProps) {
  const navigate = useNavigate();
  
  const isHere = checkin.status === 'here';
  
  return (
    <Card 
      className={`
        overflow-hidden border transition-all duration-300 hover:scale-[1.02] cursor-pointer group
        ${isHere 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
          : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
        }
      `}
      onClick={() => navigate(`/member?id=${checkin.userId}`, { 
        state: { 
          eventCheckIn: {
            icebreaker: checkin.icebreaker,
            tags: checkin.tags,
            status: checkin.status,
            timestamp: checkin.timestamp
          }
        } 
      })}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        {/* Status Badge - Floating */}
        <div className="w-full flex justify-end">
          {isHere ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5 h-auto">
              HERE
            </Badge>
          ) : (
             <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] px-2 py-0.5 h-auto">
              GOING
            </Badge>
          )}
        </div>

        {/* Avatar with Glow if Here */}
        <div className={`relative rounded-full p-1 ${isHere ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-700'}`}>
           <Avatar className="w-16 h-16 border-2 border-black">
            <AvatarImage src={getSafeImageUrl(checkin.photoURL)} className="object-cover" />
            <AvatarFallback>{checkin.displayName[0]}</AvatarFallback>
          </Avatar>
        </div>

        {/* Name & Icebreaker */}
        <div className="space-y-1 w-full">
          <h3 className="font-bold text-white truncate px-2">{checkin.displayName}</h3>
          
          {checkin.icebreaker ? (
            <div className="bg-white/5 rounded-lg p-2 mt-2 border border-white/10 min-h-[60px] flex items-center justify-center">
              <p className="text-sm text-purple-200 italic line-clamp-2">"{checkin.icebreaker}"</p>
            </div>
          ) : (
            <div className="min-h-[60px] flex items-center justify-center">
              <p className="text-xs text-gray-500">Just hanging out</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {checkin.tags && checkin.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1 w-full">
            {checkin.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-700">
                {tag}
              </span>
            ))}
            {checkin.tags.length > 2 && (
               <span className="text-[10px] text-gray-500 px-1">+ {checkin.tags.length - 2}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

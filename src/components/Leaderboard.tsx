import React, { useState, useEffect } from "react";
import { apiClient } from "app";
import { LeaderboardEntry } from "@/types";
import { Trophy, Medal, Award, LoaderIcon, UsersIcon, FlameIcon, ZapIcon, GiftIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSafeImageUrl } from "../utils/avatar-utils";

// Placeholder for the prize image - replace with actual URL when provided
const PRIZE_IMAGE_URL = "https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250125_134625_Facebook.jpg"; 

interface LeaderboardProps {
  compact?: boolean;
}

export function Leaderboard({ compact = false }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("current_month");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        // Safety check for brain client
        if (!apiClient || !apiClient.get_leaderboard) {
           console.error("Brain client or get_leaderboard is missing");
           setError("API client error");
           return;
        }

        const response = await apiClient.get_leaderboard({ query: { period } });
        const data = await response.json();
        setLeaderboard(data.leaderboard);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <FlameIcon className="h-6 w-6 text-orange-500 fill-orange-500/20 animate-pulse" />;
      case 2:
        return <ZapIcon className="h-6 w-6 text-cyan-400 fill-cyan-400/20" />;
      case 3:
        return <Award className="h-6 w-6 text-purple-500 fill-purple-500/20" />;
      default:
        return <span className="font-bold text-gray-500">#{rank}</span>;
    }
  };

  if (leaderboard.length === 0 && !isLoading) {
    return (
      <div className={cn("space-y-4", compact ? "w-full" : "space-y-6")}>
         <Card className="bg-black/40 border border-purple-500/20 backdrop-blur-lg overflow-hidden">
            <CardHeader className={compact ? "pb-2 pt-4 px-4" : ""}>
               {/* Title and Toggles */}
               <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <FlameIcon className="w-5 h-5 text-orange-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500 font-bold">
                          Leaderboard
                        </span>
                      </CardTitle>
                    </div>
                    <p className="text-xs text-gray-400">
                        {period === "current_month" 
                            ? "Top monthly scanners win exclusive merch & badges!" 
                            : "Compete for the all-time scanning champion title."}
                    </p>
                  </div>
                  
                  <Tabs value={period} onValueChange={setPeriod} className="w-full">
                    <TabsList className="w-full bg-black/40 border border-gray-800">
                      <TabsTrigger value="current_month" className="flex-1 text-xs">This Month</TabsTrigger>
                      <TabsTrigger value="all_time" className="flex-1 text-xs">All Time</TabsTrigger>
                    </TabsList>
                  </Tabs>
               </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <UsersIcon className="mx-auto h-10 w-10 text-gray-600 mb-3" />
                <p className="text-lg font-medium mb-1">No one on the list yet</p>
                <p className="text-xs text-gray-500">Be the first to get scanned!</p>
              </div>
            </CardContent>
         </Card>
      </div>
    );
  }

  const displayData = compact ? leaderboard.slice(0, 5) : leaderboard;

  return (
    <div className={cn("space-y-4", compact ? "w-full" : "space-y-6")}>
      <Card className="bg-black/40 border border-purple-500/20 backdrop-blur-lg shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)] overflow-hidden">
        <CardHeader className={compact ? "pb-2 pt-4 px-4" : ""}>
          <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-1">
                 <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <FlameIcon className="w-5 h-5 text-orange-500" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-500 font-bold">
                        Leaderboard
                      </span>
                    </CardTitle>
                 </div>
                 <p className="text-xs text-gray-400">
                    {period === "current_month" 
                        ? "Top monthly scanners win exclusive merch & badges!" 
                        : "Compete for the all-time scanning champion title."}
                 </p>
             </div>

             {/* Prize Banner - Only show for Monthly view */}
             {period === "current_month" && (
               <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-1 pr-4 flex items-center gap-3">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                  
                  {/* Prize Image */}
                  <div className="relative h-16 w-16 rounded-md overflow-hidden border border-purple-500/30 shrink-0 bg-black/50 ml-2 my-2 z-10 group cursor-pointer">
                      <img 
                        src={PRIZE_IMAGE_URL} 
                        alt="Monthly Prize Hoodie" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                        <span className="text-[8px] text-white font-bold">VIEW</span>
                      </div>
                  </div>

                  <div className="z-10 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-500/30 text-[10px] h-4 px-1 py-0">
                        <GiftIcon className="w-3 h-3 mr-1" /> PRIZE
                      </Badge>
                    </div>
                    <p className="text-xs text-purple-200 font-bold uppercase tracking-wider leading-none mb-0.5">Top Rank Reward</p>
                    <p className="text-sm font-bold text-white leading-tight">Exclusive QR Hoodie</p>
                  </div>
                  
                  <ZapIcon className="absolute right-[-10px] top-[-10px] w-12 h-12 text-purple-500/20 rotate-12" />
               </div>
             )}
             
             <Tabs value={period} onValueChange={setPeriod} className="w-full">
                <TabsList className="w-full bg-black/40 border border-gray-800">
                  <TabsTrigger value="current_month" className="flex-1 text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">This Month</TabsTrigger>
                  <TabsTrigger value="all_time" className="flex-1 text-xs data-[state=active]:bg-gray-800">All Time</TabsTrigger>
                </TabsList>
             </Tabs>
          </div>
        </CardHeader>
        <CardContent className={compact ? "px-2" : ""}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {displayData.map((entry) => (
                <motion.div
                  key={entry.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/40 hover:bg-purple-900/10 transition-colors border border-gray-800/50 hover:border-purple-500/40 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex-shrink-0 w-8 text-center font-bold text-lg flex justify-center items-center relative z-10">
                    {getRankIcon(entry.rank) || <span className="text-gray-500 text-sm font-mono">#{entry.rank}</span>}
                  </div>
                  
                  <Avatar className="h-10 w-10 border-2 border-purple-500/20 group-hover:border-purple-500 transition-colors relative z-10">
                    <AvatarImage src={getSafeImageUrl(entry.photoURL)} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-900 to-blue-900 text-xs font-bold text-white">
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="font-semibold text-sm truncate text-gray-100 group-hover:text-white transition-colors">
                      {entry.displayName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 group-hover:border-purple-500/40">
                         {/* Display score if available, otherwise friendCount */}
                         {/* @ts-ignore - score might not be in old cache/types yet */}
                         <span className="font-bold mr-1">{entry.score !== undefined ? entry.score : entry.friendCount}</span> 
                         {period === 'current_month' ? 'PTS' : 'FRIENDS'}
                       </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

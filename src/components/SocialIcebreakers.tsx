import React, { useEffect, useState } from "react";
import { apiClient } from "app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Sparkles, CheckCircle2, MessageCircle, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "utils/cn";
import { Badge } from "@/components/ui/badge";

export function SocialIcebreakers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [allItems, setAllItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, itemsRes] = await Promise.all([
          apiClient.get_progress(),
          apiClient.list_items()
        ]);
        
        if (progressRes.ok) setProgress(await progressRes.json());
        if (itemsRes.ok) setAllItems(await itemsRes.json());
      } catch (err) {
        console.error("Error fetching icebreaker data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return null;

  const scannedIds = new Set(progress?.scanned_items?.map((i: any) => i.itemId) || []);
  const totalItems = allItems.length;
  const foundCount = scannedIds.size;
  const percentage = totalItems > 0 ? (foundCount / totalItems) * 100 : 0;

  // Don't show if no items exist
  if (totalItems === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Social Icebreakers
          </h2>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <div className="text-sm font-bold text-yellow-400">{progress?.score || 0} Points</div>
             </div>
             <Badge variant="outline" className="bg-purple-900/30 border-purple-500/50 text-purple-200">
               {foundCount}/{totalItems} Completed
             </Badge>
          </div>
        </div>
        <Progress value={percentage} className="h-2 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {allItems.map((item) => {
          const isCompleted = scannedIds.has(item.id);
          
          return (
            <Card 
              key={item.id} 
              className={cn(
                "border-zinc-800 bg-zinc-900/50 transition-all duration-300 relative overflow-hidden group",
                isCompleted ? "border-purple-500/30 bg-purple-900/10" : "hover:border-zinc-700"
              )}
            >
              {isCompleted && (
                <div className="absolute -right-4 -top-4 bg-purple-500/20 w-16 h-16 rounded-full blur-xl animate-pulse"></div>
              )}
              
              <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full transition-colors", 
                      isCompleted ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className={cn("text-base font-semibold", isCompleted ? "text-white" : "text-zinc-200")}>
                        {item.name}
                      </CardTitle>
                      {isCompleted ? (
                         <span className="text-xs font-medium text-purple-400 flex items-center gap-1 mt-0.5">
                           Completed
                         </span>
                      ) : (
                         <span className="text-xs font-medium text-zinc-500 flex items-center gap-1 mt-0.5">
                           Social Quest
                         </span>
                      )}
                    </div>
                  </div>
                  <Badge className={cn(
                    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", 
                    !isCompleted && "opacity-70 grayscale-0"
                  )}>
                    {item.points} PTS
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <CardDescription className="text-zinc-400 text-sm">
                  {item.description || "Complete this social quest to earn points."}
                </CardDescription>
                
                {!isCompleted && (
                   <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 p-0"
                        onClick={() => navigate('/add-friend')}
                      >
                        <Users className="w-3 h-3 mr-1" /> Connect / Scan
                      </Button>
                   </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {allItems.length === 0 && (
         <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500">
           <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
           <p>No active icebreakers at the moment.</p>
         </div>
      )}
    </div>
  );
}

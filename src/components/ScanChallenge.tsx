import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useFriendsStore, Friend } from "utils/friends-store";
import { Trophy, Users, Zap, Music, Code, CheckCircle2 } from "lucide-react";
import { cn } from "utils/cn";

// Define Mission Interface
interface Mission {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target: number;
  type: 'count' | 'tag' | 'bio';
  criteria?: string[]; // tags or keywords to match
  reward: string;
  color: string;
}

// Define Missions
const MISSIONS: Mission[] = [
  {
    id: 'newcomer',
    title: 'Newcomer',
    description: 'Scan your first friend to start your journey.',
    icon: Zap,
    target: 1,
    type: 'count',
    reward: 'Novice Badge',
    color: 'text-yellow-400'
  },
  {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Connect with 5 people to expand your network.',
    icon: Users,
    target: 5,
    type: 'count',
    reward: 'Bronze Connector',
    color: 'text-blue-400'
  },
  {
    id: 'tech_hunter',
    title: 'Tech Hunter',
    description: 'Scan a tech enthusiast (Developer, Engineer, Code, Tech).',
    icon: Code,
    target: 1,
    type: 'bio',
    criteria: ['developer', 'engineer', 'code', 'tech', 'software', 'programming'],
    reward: 'Techie Tracker',
    color: 'text-green-400'
  },
  {
    id: 'party_starter',
    title: 'Party Starter',
    description: 'Find someone who loves to party (DJ, Dance, Music).',
    icon: Music,
    target: 1,
    type: 'bio',
    criteria: ['dj', 'dance', 'music', 'party', 'club', 'rave'],
    reward: 'Vibe Checker',
    color: 'text-purple-400'
  },
  {
    id: 'super_connector',
    title: 'Super Connector',
    description: 'Reach 10 connections to become a networking pro.',
    icon: Trophy,
    target: 10,
    type: 'count',
    reward: 'Gold Networker',
    color: 'text-amber-500'
  }
];

export function ScanChallenge() {
  const { friends } = useFriendsStore();
  
  // Calculate progress for a mission
  const getProgressValues = (mission: Mission) => {
    let current = 0;
    
    if (mission.type === 'count') {
       current = Math.min(friends.length, mission.target);
    } else if (mission.type === 'bio' || mission.type === 'tag') {
       // Count unique friends matching criteria
       const matches = friends.filter(friend => {
         const text = ((friend.bio || '') + ' ' + (friend.tags?.join(' ') || '')).toLowerCase();
         return mission.criteria?.some(keyword => text.includes(keyword.toLowerCase()));
       });
       current = Math.min(matches.length, mission.target);
    }
    
    const percentage = Math.min(100, Math.round((current / mission.target) * 100));
    const isCompleted = current >= mission.target;
    
    return { current, percentage, isCompleted };
  };

  // Calculate total progress
  const completedMissions = MISSIONS.filter(m => getProgressValues(m).isCompleted).length;
  const totalProgress = Math.round((completedMissions / MISSIONS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Scanning Missions
          </h2>
          <Badge variant="outline" className="bg-zinc-900/50 border-zinc-700">
            {completedMissions}/{MISSIONS.length} Completed
          </Badge>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MISSIONS.map((mission) => {
          const { current, percentage, isCompleted } = getProgressValues(mission);
          const Icon = mission.icon;
          
          return (
            <Card 
              key={mission.id} 
              className={cn(
                "border-zinc-800 bg-zinc-900/50 transition-all duration-300",
                isCompleted ? "border-green-900/50 bg-green-900/10" : "hover:border-zinc-700"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full bg-zinc-800", isCompleted ? "bg-green-900/30 text-green-400" : mission.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-zinc-100">
                        {mission.title}
                      </CardTitle>
                      {isCompleted && (
                        <span className="text-xs font-medium text-green-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">
                      {mission.reward}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 text-zinc-400">
                  {mission.description}
                </CardDescription>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Progress</span>
                    <span>{current} / {mission.target}</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2 bg-zinc-800",
                      isCompleted && "[&>div]:bg-green-500"
                    )} 
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

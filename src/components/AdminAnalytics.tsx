import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Activity, Trophy, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "app";
import { format } from "date-fns";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface UserAnalytics {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  score: number;
  breakdown: {
    friend_scan: number;
    event_checkin: number;
    game_scan: number;
  };
}

interface ActivityItem {
  id: string;
  activityType: string;
  timestamp: string; // ISO string
  userId: string;
  relatedId?: string;
  metadata?: any;
}

export function AdminAnalytics() {
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, feedRes] = await Promise.all([
        apiClient.get_user_analytics(),
        apiClient.get_activity_feed({ limit: 50 })
      ]);

      const usersData = await usersRes.json();
      const feedData = await feedRes.json();

      setUsers(usersData);
      setFeed(feedData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.export_activity_csv();
      
      // Handle file download from stream/blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_activity_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Export downloaded successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'friend_scan': return <Users className="h-4 w-4 text-blue-400" />;
      case 'event_checkin': return <Calendar className="h-4 w-4 text-green-400" />;
      case 'game_scan': return <Trophy className="h-4 w-4 text-yellow-400" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatActivityText = (item: ActivityItem) => {
    const type = item.activityType;
    if (type === 'friend_scan') return "Scanned a friend";
    if (type === 'event_checkin') return "Checked in to an event";
    if (type === 'game_scan') return "Scanned a game item";
    return type.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Engagement</h2>
          <p className="text-gray-400">Track user activity and engagement scores.</p>
        </div>
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Leaderboard Section */}
        <Card className="md:col-span-4 bg-gray-900/60 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Engagement Leaderboard
            </CardTitle>
            <CardDescription>Top users ranked by engagement score</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-gray-500">Loading leaderboard...</div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No activity data yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.userId} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-gray-400">#{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getSafeImageUrl(user.photoURL)} />
                            <AvatarFallback>{user.displayName?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.displayName || "Unknown User"}</span>
                            <span className="text-xs text-gray-500">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-purple-400">
                        {user.score}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <div className="flex justify-end gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-[10px] gap-1">
                            <Users className="h-3 w-3" /> {user.breakdown.friend_scan}
                          </Badge>
                          <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-[10px] gap-1">
                            <Calendar className="h-3 w-3" /> {user.breakdown.event_checkin}
                          </Badge>
                          <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400 text-[10px] gap-1">
                            <Trophy className="h-3 w-3" /> {user.breakdown.game_scan}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed Section */}
        <Card className="md:col-span-3 bg-gray-900/60 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Real-time feed of user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500">Loading feed...</div>
              ) : feed.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No recent activity.</div>
              ) : (
                <div className="space-y-4">
                  {feed.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                      <div className="mt-1 bg-gray-800 p-2 rounded-full">
                        {getActivityIcon(item.activityType)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-200">
                          {formatActivityText(item)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>User: {item.userId.substring(0, 8)}...</span>
                          <span>•</span>
                          <span>{item.timestamp ? format(new Date(item.timestamp), 'MMM d, h:mm a') : 'Just now'}</span>
                        </div>
                        {item.metadata && (
                          <p className="text-xs text-gray-500 italic">
                            {JSON.stringify(item.metadata).substring(0, 50)}
                            {JSON.stringify(item.metadata).length > 50 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

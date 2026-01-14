import { useState, useEffect } from "react";
import { apiClient } from "app";
import { GameItem } from "types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash, QrCode, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function AdminIcebreakers() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    points: number;
    secret_code: string;
    type: string;
  }>({
    name: "",
    description: "",
    points: 10,
    secret_code: "",
    type: "social"
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // @ts-ignore - endpoint recently added
      const response = await apiClient.list_items_admin();
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load icebreakers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.name || !newItem.description || !newItem.secret_code) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      await apiClient.create_item(newItem);
      toast.success("Icebreaker created successfully");
      setNewItem({
        name: "",
        description: "",
        points: 10,
        secret_code: "",
        type: "social"
      });
      fetchItems();
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create icebreaker");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this icebreaker?")) return;

    try {
      // @ts-ignore - endpoint recently added
      await apiClient.delete_item({ item_id: id });
      toast.success("Icebreaker deleted");
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete icebreaker");
    }
  };

  const generateRandomCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setNewItem({ ...newItem, secret_code: code });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/60 border border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Create New Icebreaker
          </CardTitle>
          <CardDescription>Add a new social prompt or quest to encourage connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="quest-name" className="text-sm font-medium">Quest Name</label>
                <Input
                  id="quest-name"
                  name="questName"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Find someone wearing red"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="quest-points" className="text-sm font-medium">Points Reward</label>
                <Input
                  id="quest-points"
                  name="questPoints"
                  type="number"
                  value={newItem.points}
                  onChange={(e) => setNewItem({ ...newItem, points: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="quest-description" className="text-sm font-medium">Description / Instruction</label>
              <Textarea
                id="quest-description"
                name="questDescription"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Find a person who fits the criteria and scan their QR code to complete this quest!"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quest Type</label>
                <Select
                  value={newItem.type}
                  onValueChange={(val) => setNewItem({ ...newItem, type: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="social">Social Quest</SelectItem>
                    <SelectItem value="venue">Venue Check-in</SelectItem>
                    <SelectItem value="hidden">Hidden Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="validation-code" className="text-sm font-medium">Validation Code (for QR)</label>
                <div className="flex gap-2">
                  <Input
                    id="validation-code"
                    name="validationCode"
                    value={newItem.secret_code}
                    onChange={(e) => setNewItem({ ...newItem, secret_code: e.target.value })}
                    placeholder="CODE123"
                    className="bg-gray-800 border-gray-700 font-mono"
                  />
                  <Button variant="outline" onClick={generateRandomCode} title="Generate Random Code">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto md:self-end">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Icebreaker
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/60 border border-gray-800">
        <CardHeader>
          <CardTitle>Active Icebreakers</CardTitle>
          <CardDescription>Manage active social quests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading icebreakers...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No icebreakers found. Create one above!</div>
          ) : (
            <div className="rounded-md border border-gray-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-800/50">
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400">Quest Name</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Points</TableHead>
                    <TableHead className="text-gray-400">Code</TableHead>
                    <TableHead className="text-gray-400">QR Preview</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30">
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize bg-gray-800">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.points}</TableCell>
                      <TableCell className="font-mono text-xs">{item.secret_code}</TableCell>
                      <TableCell>
                        <div className="bg-white p-1 w-fit rounded">
                          <QRCodeSVG value={item.secret_code || ""} size={32} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

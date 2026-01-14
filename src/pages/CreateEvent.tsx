import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEventStore } from "utils/event-store";
import { useAuthStore } from "utils/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CalendarIcon, MapPinIcon, ArrowLeftIcon, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { createEvent, uploadEventImage, isLoading } = useEventStore();
  const { user, loading: authLoading } = useAuthStore();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [imageURL, setImageURL] = useState("");
  const [price, setPrice] = useState("0");
  const [ticketLink, setTicketLink] = useState("");
  const [supportsScanning, setSupportsScanning] = useState(false);
  const [category, setCategory] = useState("general");
  const [imageSource, setImageSource] = useState("file");
  const [file, setFile] = useState<File | null>(null);

  // Redirect if not logged in or not admin
  React.useEffect(() => {
    if (authLoading) return;
    
    if (!user || !user.isAdmin) {
      toast.error("You must be an admin to create events");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      let finalImageURL = imageURL;
      
      if (imageSource === "file" && file) {
        const toastId = toast.loading("Uploading image...");
        try {
          finalImageURL = await uploadEventImage(file);
          toast.dismiss(toastId);
        } catch (error) {
          toast.dismiss(toastId);
          toast.error("Failed to upload image");
          return;
        }
      }

      await createEvent({
        title,
        description,
        date: date.toISOString(),
        location,
        imageURL: finalImageURL,
        price: parseFloat(price),
        ticketLink,
        supportsScanning,
        category
      });
      toast.success("Event created successfully!");
      navigate("/");
    } catch (error) {
      toast.error("Failed to create event");
      console.error(error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="text-white hover:text-neon-blue hover:bg-white/10"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
            Create New Event
          </h1>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl text-white">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Neon Nights Party"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about the event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="bg-black/50 border-white/20 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/20 text-white">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="military">Military / Veteran</SelectItem>
                    <SelectItem value="concert">Concert</SelectItem>
                    <SelectItem value="party">Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticketLink">Ticket Link (Optional)</Label>
                  <Input
                    id="ticketLink"
                    placeholder="https://..."
                    value={ticketLink}
                    onChange={(e) => setTicketLink(e.target.value)}
                    className="bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-black/50 border-white/20 text-white hover:bg-white/10 hover:text-white",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/20 text-white">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="bg-zinc-900 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input
                      id="location"
                      placeholder="Venue or Address"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-9 bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 border border-white/10 rounded-lg p-4 bg-black/30">
                <Switch
                  id="supportsScanning"
                  checked={supportsScanning}
                  onCheckedChange={setSupportsScanning}
                />
                <div className="flex flex-col">
                  <Label htmlFor="supportsScanning" className="cursor-pointer font-medium text-white">
                    Enable Scanning Features
                  </Label>
                  <p className="text-sm text-gray-400">
                    Allows users to check-in and unlock perks by scanning their QR code.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Event Image</Label>
                <Tabs defaultValue="file" onValueChange={setImageSource} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/50 border border-white/20">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="mt-4">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="dropzone-file"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-lg cursor-pointer bg-black/30 hover:bg-white/5 hover:border-neon-blue transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-white/40" />
                          <p className="mb-2 text-sm text-white/60">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-white/40">
                            {file ? file.name : "SVG, PNG, JPG or GIF (MAX. 2MB)"}
                          </p>
                        </div>
                        <input 
                          id="dropzone-file" 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onClick={(e) => (e.target as HTMLInputElement).value = ""}
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </TabsContent>
                  <TabsContent value="url" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="imageURL" className="sr-only">Image URL</Label>
                      <Input
                        id="imageURL"
                        placeholder="https://..."
                        value={imageURL}
                        onChange={(e) => setImageURL(e.target.value)}
                        className="bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-neon-blue"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-bold py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

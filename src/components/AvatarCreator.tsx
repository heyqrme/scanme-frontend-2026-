import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw, Upload, User, Loader2, Dice5, Camera, Check, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface AvatarCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  currentAvatarUrl?: string | null;
}

const AVATAR_STYLES = [
  { id: 'bottts', name: 'Robots', description: 'Cybernetic friends' },
  { id: 'avataaars', name: 'Cartoon', description: 'Expressive characters' },
  { id: 'lorelei', name: 'Artistic', description: 'Digital art style' },
  { id: 'notionists', name: 'Sketch', description: 'Hand-drawn look' },
  { id: 'shapes', name: 'Abstract', description: 'Geometric patterns' },
  { id: 'identicon', name: 'Pattern', description: 'Unique identifiers' },
  { id: 'pixel-art', name: 'Pixel', description: 'Retro gaming style' },
];

export function AvatarCreator({ isOpen, onClose, onSave, currentAvatarUrl }: AvatarCreatorProps) {
  const [activeTab, setActiveTab] = useState<"create" | "upload">("create");
  
  // Generator state
  const [selectedStyle, setSelectedStyle] = useState("bottts");
  const [seed, setSeed] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("transparent");
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  
  // General state
  const [isSaving, setIsSaving] = useState(false);

  // Initialize seed
  useEffect(() => {
    if (isOpen) {
      randomize();
    }
  }, [isOpen]);

  // Update preview when style/seed changes
  useEffect(() => {
    if (activeTab === "create") {
      generatePreview();
    }
  }, [selectedStyle, seed, backgroundColor, activeTab]);

  const randomize = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const generatePreview = () => {
    // Using DiceBear API
    // We use PNG for better compatibility, though SVG is sharper.
    // We'll fetch PNG for saving, but can use SVG for preview if we want. 
    // Let's use SVG for preview for crispness, but we need to handle the save carefully.
    
    const baseUrl = `https://api.dicebear.com/9.x/${selectedStyle}/svg`;
    const params = new URLSearchParams();
    params.append('seed', seed);
    
    if (backgroundColor !== 'transparent') {
      params.append('backgroundColor', backgroundColor);
    }

    const url = `${baseUrl}?${params.toString()}`;
    setPreviewUrl(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (!file.type.match(/(jpeg|jpg|png|gif|webp)/gi)) {
        toast.error("Please upload an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit");
        return;
      }
      
      setUploadedFile(file);
      setUploadedPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let fileToSave: File;

      if (activeTab === "create") {
        // Fetch the high-quality PNG version of the generated avatar
        const pngUrl = `https://api.dicebear.com/9.x/${selectedStyle}/png?seed=${seed}${backgroundColor !== 'transparent' ? `&backgroundColor=${backgroundColor}` : ''}&scale=100`; // Scale helps resolution
        
        const response = await fetch(pngUrl);
        const blob = await response.blob();
        fileToSave = new File([blob], "avatar.png", { type: "image/png" });
      } else {
        if (!uploadedFile) {
          toast.error("Please select a file to upload");
          setIsSaving(false);
          return;
        }
        fileToSave = uploadedFile;
      }

      await onSave(fileToSave);
      onClose();
    } catch (error) {
      console.error("Error saving avatar:", error);
      toast.error("Failed to save avatar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-purple-500" />
            Customize Avatar
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a unique digital identity or upload your own photo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-600 text-gray-300 data-[state=active]:text-white">
              <Wand2 className="w-4 h-4 mr-2" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-600 text-gray-300 data-[state=active]:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] bg-gray-800">
                {activeTab === "create" ? (
                  <img 
                    src={previewUrl} 
                    alt="Avatar Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  uploadedPreview ? (
                    <img 
                      src={uploadedPreview} 
                      alt="Upload Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <User className="w-16 h-16 opacity-50" />
                    </div>
                  )
                )}
              </div>
            </div>

            <TabsContent value="create" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {AVATAR_STYLES.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{style.name}</span>
                            <span className="text-xs text-gray-400">{style.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Background</Label>
                  <Select value={backgroundColor} onValueChange={setBackgroundColor}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="transparent">Transparent</SelectItem>
                      <SelectItem value="b6e3f4">Blue</SelectItem>
                      <SelectItem value="c0aede">Purple</SelectItem>
                      <SelectItem value="d1d4f9">Indigo</SelectItem>
                      <SelectItem value="ffd5dc">Pink</SelectItem>
                      <SelectItem value="ffdfbf">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  variant="secondary" 
                  onClick={randomize} 
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                >
                  <Dice5 className="w-4 h-4 mr-2" />
                  Randomize
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center justify-center w-full">
                <label htmlFor="avatar-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 5MB)</p>
                  </div>
                  <Input 
                    id="avatar-upload" 
                    name="avatarFile"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onClick={(e) => (e.target as HTMLInputElement).value = ""}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-gray-800">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-none">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Avatar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { create } from "zustand";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuthStore } from "./auth-store";

// Define media types
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  YOUTUBE = "youtube"
}

// Define Media interface
export interface Media {
  id: string;
  userId: string;
  type: MediaType;
  url: string;
  thumbnail?: string; // For videos
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// Define Media Gallery Store interface
interface MediaGalleryStore {
  media: Media[];
  isLoading: boolean;
  error: string | null;
  
  // Fetch methods
  fetchUserMedia: (userId: string) => Promise<Media[]>;
  fetchMediaItem: (mediaId: string) => Promise<Media | null>;
  
  // Create/upload methods
  uploadMedia: (file: File, type: MediaType, metadata?: { title?: string; description?: string; tags?: string[] }) => Promise<Media | null>;
  addYouTubeVideo: (url: string, title?: string) => Promise<Media | null>;
  
  // Update methods
  updateMediaMetadata: (mediaId: string, metadata: { title?: string; description?: string; tags?: string[] }) => Promise<Media | null>;
  
  // Delete methods
  deleteMedia: (mediaId: string) => Promise<void>;
  
  // Utility methods
  clearError: () => void;
  resetState: () => void;
}

// Helper function to convert Firestore data to Media object
const convertMedia = (doc: any): Media => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    type: data.type,
    url: data.url,
    thumbnail: data.thumbnail,
    title: data.title,
    description: data.description,
    tags: data.tags || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

// Helper to extract YouTube ID
const getYouTubeId = (url: string) => {
  // Updated regex to support shorts and ignore whitespace
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?\s]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Create Media Gallery Store
export const useMediaGalleryStore = create<MediaGalleryStore>((set, get) => ({
  media: [],
  isLoading: false,
  error: null,
  
  // Fetch user's media
  fetchUserMedia: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      // Query media by user
      const mediaQuery = query(
        collection(db, "media"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(mediaQuery);
      
      // Convert to Media objects
      const media: Media[] = querySnapshot.docs.map(convertMedia);
      
      set({ media, isLoading: false });
      return media;
    } catch (error: any) {
      console.error("Error fetching user media:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },
  
  // Fetch single media item
  fetchMediaItem: async (mediaId) => {
    set({ isLoading: true, error: null });
    try {
      const mediaDoc = await getDoc(doc(db, "media", mediaId));
      
      if (mediaDoc.exists()) {
        const media = convertMedia(mediaDoc);
        set({ isLoading: false });
        return media;
      } else {
        set({ isLoading: false, error: "Media item not found" });
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching media item:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  // Upload new media
  uploadMedia: async (file, type, metadata) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to upload media" });
      toast.error("You must be logged in to upload media");
      return null;
    }
    
    console.log(`[ScanMe Debug] Starting uploadMedia: type=${type}, filename=${file.name}, size=${file.size}, type=${file.type}`);

    set({ isLoading: true, error: null });
    
    try {
      // Validate file type
      if (type === MediaType.IMAGE && !file.type.startsWith("image/")) {
        throw new Error("File must be an image");
      } else if (type === MediaType.VIDEO && !file.type.startsWith("video/")) {
        throw new Error("File must be a video");
      } else if (type === MediaType.AUDIO && !file.type.startsWith("audio/")) {
        throw new Error("File must be an audio file");
      }
      
      // Warn about unsupported video formats
      if (type === MediaType.VIDEO) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const unsupportedFormats = ['avi', 'mkv', 'mov', 'wmv', 'flv'];
        if (extension && unsupportedFormats.includes(extension)) {
          toast.error(`${extension.toUpperCase()} videos may not play in browsers. Please convert to MP4 (H.264) for best compatibility.`, { duration: 8000 });
        }
      }
      
      // Create storage path based on type
      let folderPath = "misc";
      if (type === MediaType.IMAGE) folderPath = "images";
      else if (type === MediaType.VIDEO) folderPath = "videos";
      else if (type === MediaType.AUDIO) folderPath = "audio";
      
      const storageRef = ref(storage, `${folderPath}/${user.uid}/${Date.now()}_${file.name}`);
      
      // Map file extension to standard MIME types to avoid browser playback issues
      // Some browsers (e.g. Chrome) are strict about Content-Type for <video> tags
      let contentType = file.type;
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (type === MediaType.VIDEO) {
        if (extension === 'mov') contentType = 'video/quicktime';
        else if (extension === 'mp4') contentType = 'video/mp4';
        else if (extension === 'webm') contentType = 'video/webm';
        else if (extension === 'mkv') contentType = 'video/x-matroska';
        else if (extension === 'avi') contentType = 'video/x-msvideo';
        // Fallback to video/mp4 for unknown video types often works better than application/octet-stream
        else if (!contentType) contentType = 'video/mp4';
      }

      console.log(`[ScanMe Debug] Uploading with contentType: ${contentType}`);

      // Upload file with metadata
      const metadata = {
        contentType: contentType
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snapshot.ref);
      
      console.log(`[ScanMe Debug] Upload successful. Download URL: ${url}`);

      // Create thumbnail for videos (in a real app, you would generate one)
      // Always set a default thumbnail value to avoid undefined errors
      let thumbnail = "";
      
      if (type === MediaType.IMAGE) {
        thumbnail = url;
      } else if (type === MediaType.VIDEO) {
        thumbnail = "https://via.placeholder.com/200x112?text=Video+Thumbnail";
      } else if (type === MediaType.AUDIO) {
        thumbnail = "https://via.placeholder.com/200x200?text=Audio"; // Placeholder for audio
      }
      
      // Create media document
      const mediaData = {
        userId: user.uid,
        type,
        url,
        thumbnail,
        title: metadata?.title || file.name,
        description: metadata?.description || "", // Set empty string as default
        tags: metadata?.tags || [],
        createdAt: serverTimestamp(),
      };
      
      const mediaRef = await addDoc(collection(db, "media"), mediaData);
      
      console.log(`[ScanMe Debug] Media document created with ID: ${mediaRef.id}`);

      // Get the created media item
      const newMediaDoc = await getDoc(mediaRef);
      const newMedia = convertMedia(newMediaDoc);
      
      // Update state
      const { media } = get();
      set({ 
        media: [newMedia, ...media],
        isLoading: false 
      });
      
      toast.success("Media uploaded successfully");
      return newMedia;
    } catch (error: any) {
      console.error("Error uploading media:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to upload media: ${error.message}`);
      return null;
    }
  },

  // Add YouTube Video
  addYouTubeVideo: async (url, title) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to add videos" });
      toast.error("You must be logged in to add videos");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Trim URL to remove accidental whitespace
      const cleanUrl = url.trim();
      const videoId = getYouTubeId(cleanUrl);
      
      if (!videoId) {
        throw new Error("Invalid YouTube URL. Please check the link and try again.");
      }
      
      // Use standard watch URL which ReactPlayer handles better than embed URL
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      // Create media document
      const mediaData = {
        userId: user.uid,
        type: MediaType.YOUTUBE,
        url: watchUrl,
        thumbnail: thumbnailUrl,
        title: title || "YouTube Video",
        description: "",
        tags: [],
        createdAt: serverTimestamp(),
      };
      
      const mediaRef = await addDoc(collection(db, "media"), mediaData);
      
      // Get the created media item
      const newMediaDoc = await getDoc(mediaRef);
      const newMedia = convertMedia(newMediaDoc);
      
      // Update state
      const { media } = get();
      set({ 
        media: [newMedia, ...media],
        isLoading: false 
      });
      
      toast.success("YouTube video added successfully");
      return newMedia;
    } catch (error: any) {
      console.error("Error adding YouTube video:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to add video: ${error.message}`);
      return null;
    }
  },
  
  // Update media metadata
  updateMediaMetadata: async (mediaId, metadata) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to update media" });
      toast.error("You must be logged in to update media");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get current media
      const mediaRef = doc(db, "media", mediaId);
      const mediaSnap = await getDoc(mediaRef);
      
      if (!mediaSnap.exists()) {
        set({ error: "Media not found", isLoading: false });
        toast.error("Media not found");
        return null;
      }
      
      const mediaData = mediaSnap.data();
      
      // Check if user is the owner
      if (mediaData.userId !== user.uid) {
        set({ error: "You can only edit your own media", isLoading: false });
        toast.error("You can only edit your own media");
        return null;
      }
      
      // Update media
      const updateData = {
        ...metadata,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(mediaRef, updateData);
      
      // Get updated media
      const updatedMediaSnap = await getDoc(mediaRef);
      const updatedMedia = convertMedia(updatedMediaSnap);
      
      // Update state
      const { media } = get();
      const updatedMediaList = media.map(item => 
        item.id === mediaId ? updatedMedia : item
      );
      
      set({ media: updatedMediaList, isLoading: false });
      
      toast.success("Media updated successfully");
      return updatedMedia;
    } catch (error: any) {
      console.error("Error updating media:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to update media: ${error.message}`);
      return null;
    }
  },
  
  // Delete media
  deleteMedia: async (mediaId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to delete media" });
      toast.error("You must be logged in to delete media");
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get media data first to check ownership and get URL
      const mediaRef = doc(db, "media", mediaId);
      const mediaSnap = await getDoc(mediaRef);
      
      if (!mediaSnap.exists()) {
        set({ error: "Media not found", isLoading: false });
        toast.error("Media not found");
        return;
      }
      
      const mediaData = mediaSnap.data();
      
      // Check if user is the owner
      if (mediaData.userId !== user.uid) {
        set({ error: "You can only delete your own media", isLoading: false });
        toast.error("You can only delete your own media");
        return;
      }
      
      // Delete file from storage
      try {
        // Only delete from storage if it's not a YouTube video
        if (mediaData.type !== MediaType.YOUTUBE) {
            // Check if URL is a valid Firebase Storage URL
            if (mediaData.url && mediaData.url.startsWith("https://firebasestorage.googleapis.com")) {
                const fileRef = ref(storage, mediaData.url);
                await deleteObject(fileRef);
            }
          
            // Delete thumbnail if it exists, is not YouTube, and is a Firebase Storage URL
            if (mediaData.thumbnail && 
                !mediaData.thumbnail.includes("img.youtube.com") && 
                mediaData.thumbnail.startsWith("https://firebasestorage.googleapis.com")) {
                const thumbnailRef = ref(storage, mediaData.thumbnail);
                await deleteObject(thumbnailRef);
            }
        }
      } catch (error) {
        // Log warning but continue to delete the database record
        console.warn("Could not delete media file:", error);
      }
      
      // Delete media document
      await deleteDoc(mediaRef);
      
      // Update state
      const { media } = get();
      set({ 
        media: media.filter(item => item.id !== mediaId),
        isLoading: false 
      });
      
      toast.success("Media deleted successfully");
    } catch (error: any) {
      console.error("Error deleting media:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to delete media: ${error.message}`);
    }
  },
  
  // Utility methods
  clearError: () => set({ error: null }),
  resetState: () => set({ media: [], error: null, isLoading: false }),
}));

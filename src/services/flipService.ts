import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore as db, firebaseStorage as storage } from '@/app/auth/firebase';

export type VideoCategory = 'laugh' | 'cry' | 'shock' | 'pets';

export interface Video {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: VideoCategory;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Timestamp;
}

// Upload video to Firebase Storage
export async function uploadVideo(
  file: File,
  userId: string,
  category: VideoCategory,
  caption?: string
): Promise<string> {
  try {
    // Generate unique video ID
    const videoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upload video file
    const videoRef = ref(storage, `videos/${userId}/${videoId}`);
    await uploadBytes(videoRef, file);
    const videoUrl = await getDownloadURL(videoRef);
    
    // Create Firestore document
    const videoData = {
      userId,
      videoUrl,
      category,
      caption: caption || '',
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'videos'), videoData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

// Get videos by category
export async function getVideosByCategory(
  category: VideoCategory,
  limitCount: number = 20
): Promise<Video[]> {
  try {
    const q = query(
      collection(db, 'videos'),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Video[];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

// Get all videos (for mixed feed)
export async function getAllVideos(limitCount: number = 20): Promise<Video[]> {
  try {
    const q = query(
      collection(db, 'videos'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Video[];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

// Like a video
export async function likeVideo(videoId: string, userId: string): Promise<void> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const likeRef = doc(db, 'videos', videoId, 'likes', userId);
    
    // Add like document
    await addDoc(collection(db, 'videos', videoId, 'likes'), {
      userId,
      createdAt: serverTimestamp(),
    });
    
    // Increment like count
    await updateDoc(videoRef, {
      likes: increment(1),
    });
  } catch (error) {
    console.error('Error liking video:', error);
    throw error;
  }
}

// Unlike a video
export async function unlikeVideo(videoId: string, userId: string): Promise<void> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const likeRef = doc(db, 'videos', videoId, 'likes', userId);
    
    // Remove like document
    await deleteDoc(likeRef);
    
    // Decrement like count
    await updateDoc(videoRef, {
      likes: increment(-1),
    });
  } catch (error) {
    console.error('Error unliking video:', error);
    throw error;
  }
}

// Add comment to video
export async function addComment(
  videoId: string,
  userId: string,
  text: string
): Promise<void> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    
    // Add comment document
    await addDoc(collection(db, 'videos', videoId, 'comments'), {
      userId,
      text,
      createdAt: serverTimestamp(),
    });
    
    // Increment comment count
    await updateDoc(videoRef, {
      comments: increment(1),
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

// Get comments for a video
export async function getComments(videoId: string): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'videos', videoId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Comment[];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

// Share video (increment share count)
export async function shareVideo(videoId: string): Promise<void> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, {
      shares: increment(1),
    });
  } catch (error) {
    console.error('Error sharing video:', error);
    throw error;
  }
}

// Delete video
export async function deleteVideo(videoId: string, videoUrl: string, userId: string): Promise<void> {
  try {
    // Delete from Storage
    const videoRef = ref(storage, videoUrl);
    await deleteObject(videoRef);
    
    // Delete Firestore document
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
}

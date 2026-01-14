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
  limit,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuthStore } from "./auth-store";
import { useProfileStore } from "./profile-store";
import { apiClient } from "app";

// Define Post interface
export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  content: string;
  imageURL?: string | null;
  likes: string[];
  comments: Comment[];
  createdAt: Date;
  updatedAt?: Date;
  isSensitive?: boolean;
}

// Define Comment interface
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  content: string;
  createdAt: Date;
}

// Define Post Store interface
interface PostStore {
  posts: Post[];
  userPosts: Post[];
  isLoading: boolean;
  error: string | null;
  
  // Fetch methods
  fetchUserPosts: (userId: string) => Promise<Post[]>;
  fetchAllPosts: () => Promise<Post[]>;
  fetchPost: (postId: string) => Promise<Post | null>;
  
  // Create methods
  createPost: (content: string, imageFile?: File, isSensitive?: boolean) => Promise<Post | null>;
  addComment: (postId: string, content: string) => Promise<Comment | null>;
  
  // Update methods
  updatePost: (postId: string, content: string, imageFile?: File) => Promise<Post | null>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  
  // Delete methods
  deletePost: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  
  // Utility methods
  clearError: () => void;
  resetState: () => void;
}

// Helper function to convert Firestore data to Post object
const convertPost = (doc: any): Post => {
  const data = doc.data();
  
  // Helper to safely convert any date format (Timestamp, string, Date) to JS Date
  const safeDate = (dateVal: any): Date => {
    try {
      if (!dateVal) return new Date();
      if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
      if (dateVal instanceof Date) return dateVal;
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch (e) {
      console.error("Date conversion error:", e);
      return new Date();
    }
  };

  // Safely handle comments array
  const safeComments = Array.isArray(data.comments) 
    ? data.comments.filter((c: any) => c && typeof c === 'object') 
    : [];

  return {
    id: doc.id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL,
    content: data.content,
    imageURL: data.imageURL,
    likes: Array.isArray(data.likes) ? data.likes : [],
    comments: safeComments.map((comment: any) => ({
      ...comment,
      createdAt: safeDate(comment.createdAt)
    })),
    createdAt: safeDate(data.createdAt),
    updatedAt: data.updatedAt ? safeDate(data.updatedAt) : undefined,
    isSensitive: data.isSensitive || false,
  };
};

// Helper to sanitize data for Firestore to prevent "Unsupported field value: undefined" errors
const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object' && obj !== null) {
    // Handle Firestore FieldValue objects (like serverTimestamp)
    if (obj.constructor && obj.constructor.name === 'FieldValue') return obj;
    if (obj._methodName) return obj; // Another check for FieldValue
    
    const result: any = {};
    for (const key in obj) {
      result[key] = sanitizeForFirestore(obj[key]);
    }
    return result;
  }
  return obj;
};

// Create Post Store
export const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  userPosts: [],
  isLoading: false,
  error: null,
  
  // Fetch user's posts
  fetchUserPosts: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      // Check viewer age for filtering
      const { user } = useAuthStore.getState();
      let isMinor = false;

      if (user) {
        // Try to get profile from store first
        let profile = useProfileStore.getState().profile;
        
        // If not in store, try to load it (only if we don't have it or it's not the current user's profile)
        // Note: accessing profile-store directly might give us the "current user" profile which is what we want (the viewer)
        if (!profile) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profile = userSnap.data() as any;
          }
        }

        if (profile && profile.birthdate) {
          const birthDate = new Date(profile.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            isMinor = true;
          }
        }
      }

      // Query posts by user
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(postsQuery);
      
      // Convert to Post objects
      let posts: Post[] = querySnapshot.docs.map(convertPost);
      
      if (isMinor) {
        posts = posts.filter(p => !p.isSensitive);
      }

      set({ userPosts: posts, isLoading: false });
      return posts;
    } catch (error: any) {
      console.error("Error fetching user posts:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  // Fetch all posts (public feed)
  fetchAllPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get current user and profile to check age
      const { user } = useAuthStore.getState();
      let isMinor = false;

      if (user) {
        // Try to get profile from store first
        let profile = useProfileStore.getState().profile;
        
        // If not in store, try to load it
        if (!profile) {
          // We use the loadProfile from profile-store if possible, but we are in post-store.
          // To avoid circular dependency or complex logic, we can just fetch the doc directly here strictly for age check
          // OR better: rely on the fact that the app loads profile on init.
          // But to be safe, let's fetch if missing.
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profile = userSnap.data() as any;
          }
        }

        if (profile && profile.birthdate) {
          const birthDate = new Date(profile.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            isMinor = true;
          }
        }
      }

      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      
      const querySnapshot = await getDocs(postsQuery);
      let posts: Post[] = querySnapshot.docs.map(convertPost);
      
      // Filter out sensitive content for minors
      if (isMinor) {
        posts = posts.filter(post => !post.isSensitive);
      }
      
      set({ posts, isLoading: false });
      return posts;
    } catch (error: any) {
      console.error("Error fetching all posts:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },
  
  // Fetch single post
  fetchPost: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      const postDoc = await getDoc(doc(db, "posts", postId));
      
      if (postDoc.exists()) {
        const post = convertPost(postDoc);
        set({ isLoading: false });
        return post;
      } else {
        set({ isLoading: false, error: "Post not found" });
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching post:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  // Create a new post
  createPost: async (content, imageFile, isSensitive = false) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to create a post" });
      toast.error("You must be logged in to create a post");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Always set a default value for imageURL to avoid undefined errors
      let imageURL = null; // Using null instead of undefined as Firestore accepts null
      
      // Auto-detect YouTube URL in content if no image file is provided
      if (!imageFile && content) {
        // Find first YouTube URL in content
        const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.?be)[^\s]+)/;
        const match = content.match(youtubeRegex);
        if (match) {
          let url = match[0];
          // Remove trailing punctuation common in sentences
          url = url.replace(/[.,!?)]+$/, "");
          imageURL = url;
        }
      }

      // Upload image if provided
      if (imageFile) {
        const storageRef = ref(storage, `post-images/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(snapshot.ref);
      }
      
      // Create post document
      const postData = {
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || null,
        content: content || "",
        imageURL: imageURL || null,
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
        isSensitive: isSensitive,
      };
      
      // Sanitize data before sending to Firestore
      const sanitizedData = sanitizeForFirestore(postData);
      
      const postRef = await addDoc(collection(db, "posts"), sanitizedData);
      
      // Get the created post
      const newPostDoc = await getDoc(postRef);
      const newPost = convertPost(newPostDoc);
      
      // Update state
      const { userPosts, posts } = get();
      set({ 
        userPosts: [newPost, ...userPosts],
        posts: [newPost, ...posts],
        isLoading: false 
      });
      
      toast.success("Post created successfully");
      return newPost;
    } catch (error: any) {
      console.error("Error creating post:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to create post: ${error.message}`);
      return null;
    }
  },
  
  // Update a post
  updatePost: async (postId, content, imageFile) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to update a post" });
      toast.error("You must be logged in to update a post");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get current post
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        set({ error: "Post not found", isLoading: false });
        toast.error("Post not found");
        return null;
      }
      
      const postData = postSnap.data();
      
      // Check if user is the author
      if (postData.authorId !== user.uid) {
        set({ error: "You can only edit your own posts", isLoading: false });
        toast.error("You can only edit your own posts");
        return null;
      }
      
      let imageURL = postData.imageURL;
      
      // Handle image update
      if (imageFile) {
        // Delete old image if it exists
        if (imageURL) {
          try {
            const oldImageRef = ref(storage, imageURL);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.warn("Could not delete old image:", error);
          }
        }
        
        // Upload new image
        const storageRef = ref(storage, `post-images/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(snapshot.ref);
      }
      
      // Update post
      const updateData = {
        content,
        // Make sure imageURL is never undefined - keep existing value or null
        imageURL: imageURL === undefined ? null : imageURL,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(postRef, sanitizeForFirestore(updateData));
      
      // Get updated post
      const updatedPostSnap = await getDoc(postRef);
      const updatedPost = convertPost(updatedPostSnap);
      
      // Update state
      const { userPosts, posts } = get();
      const updatedUserPosts = userPosts.map(post => 
        post.id === postId ? updatedPost : post
      );
      const updatedPosts = posts.map(post => 
        post.id === postId ? updatedPost : post
      );
      
      set({ userPosts: updatedUserPosts, posts: updatedPosts, isLoading: false });
      
      toast.success("Post updated successfully");
      return updatedPost;
    } catch (error: any) {
      console.error("Error updating post:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to update post: ${error.message}`);
      return null;
    }
  },
  
  // Delete a post
  deletePost: async (postId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to delete a post" });
      toast.error("You must be logged in to delete a post");
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get post data first to check ownership and get image URL
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        set({ error: "Post not found", isLoading: false });
        toast.error("Post not found");
        return;
      }
      
      const postData = postSnap.data();
      
      // Check if user is the author
      if (postData.authorId !== user.uid) {
        set({ error: "You can only delete your own posts", isLoading: false });
        toast.error("You can only delete your own posts");
        return;
      }
      
      // Delete image if it exists
      if (postData.imageURL) {
        try {
          const imageRef = ref(storage, postData.imageURL);
          await deleteObject(imageRef);
        } catch (error) {
          console.warn("Could not delete post image:", error);
        }
      }
      
      // Delete post document
      await deleteDoc(postRef);
      
      // Update state
      const { userPosts, posts } = get();
      set({ 
        userPosts: userPosts.filter(post => post.id !== postId),
        posts: posts.filter(post => post.id !== postId),
        isLoading: false 
      });
      
      toast.success("Post deleted successfully");
    } catch (error: any) {
      console.error("Error deleting post:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to delete post: ${error.message}`);
    }
  },
  
  // Add a comment to a post
  addComment: async (postId, content) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to comment" });
      toast.error("You must be logged in to comment");
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Create comment
      const comment: Comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More robust ID
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || null,
        content: content || "",
        createdAt: new Date(),
      };
      
      const postRef = doc(db, "posts", postId);
      
      // Use arrayUnion to add the comment atomically
      // We sanitize the comment object to ensure Firestore compatibility
      await updateDoc(postRef, { 
        comments: arrayUnion(sanitizeForFirestore(comment)) 
      });
      
      // Update state
      const { userPosts, posts } = get();
      const updatePostInList = (list: Post[]) => list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, comment]
          };
        }
        return post;
      });
      
      set({ 
        userPosts: updatePostInList(userPosts),
        posts: updatePostInList(posts),
        isLoading: false 
      });
      
      toast.success("Comment added");
      return comment;
    } catch (error: any) {
      console.error("Error adding comment:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to add comment: ${error.message}`);
      return null;
    }
  },
  
  // Delete a comment
  deleteComment: async (postId, commentId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to delete a comment" });
      toast.error("You must be logged in to delete a comment");
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Get current post
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        set({ error: "Post not found", isLoading: false });
        toast.error("Post not found");
        return;
      }
      
      // Get current comments
      const postData = postSnap.data();
      const comments = Array.isArray(postData.comments) ? postData.comments : [];
      
      // Find the comment
      const commentIndex = comments.findIndex((c: Comment) => c.id === commentId);
      
      if (commentIndex === -1) {
        set({ error: "Comment not found", isLoading: false });
        toast.error("Comment not found");
        return;
      }
      
      // Check if user is the author of the comment or the post
      const comment = comments[commentIndex];
      if (comment.authorId !== user.uid && postData.authorId !== user.uid) {
        set({ error: "You can only delete your own comments or comments on your posts", isLoading: false });
        toast.error("You can only delete your own comments or comments on your posts");
        return;
      }
      
      // Remove the comment
      comments.splice(commentIndex, 1);
      
      // Update post with new comments array
      await updateDoc(postRef, { comments: sanitizeForFirestore(comments) });
      
      // Update state
      const { userPosts, posts } = get();
      const updatePostInList = (list: Post[]) => list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(c => c.id !== commentId)
          };
        }
        return post;
      });
      
      set({ 
        userPosts: updatePostInList(userPosts),
        posts: updatePostInList(posts),
        isLoading: false 
      });
      
      toast.success("Comment deleted");
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      set({ error: error.message, isLoading: false });
      toast.error(`Failed to delete comment: ${error.message}`);
    }
  },
  
  // Like a post
  likePost: async (postId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to like a post" });
      toast.error("You must be logged in to like a post");
      return;
    }
    
    // Optimistic update to UI
    const { userPosts, posts } = get();
    const updatePostInList = (list: Post[]) => list.map(post => {
      if (post.id === postId && !post.likes.includes(user.uid)) {
        return {
          ...post,
          likes: [...post.likes, user.uid]
        };
      }
      return post;
    });

    set({ 
        userPosts: updatePostInList(userPosts),
        posts: updatePostInList(posts),
        // Don't set global isLoading for likes as it can be jarring
    });
    
    try {
      // Use backend API to bypass Firestore permissions
      await apiClient.like_post({ post_id: postId });
      
    } catch (error: any) {
      console.error("Error liking post:", error);
      // Revert optimistic update on error
      const { userPosts: currentUP, posts: currentP } = get();
      const revertPostInList = (list: Post[]) => list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: post.likes.filter(id => id !== user.uid)
          };
        }
        return post;
      });
      
      set({ 
        userPosts: revertPostInList(currentUP),
        posts: revertPostInList(currentP),
        error: error.message 
      });
      toast.error(`Failed to like post: ${error.message}`);
    }
  },
  
  // Unlike a post
  unlikePost: async (postId) => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      set({ error: "You must be logged in to unlike a post" });
      toast.error("You must be logged in to unlike a post");
      return;
    }
    
    // Optimistic update
    const { userPosts, posts } = get();
    const updatePostInList = (list: Post[]) => list.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.likes.filter(id => id !== user.uid)
        };
      }
      return post;
    });
    
    set({ 
        userPosts: updatePostInList(userPosts),
        posts: updatePostInList(posts),
    });
    
    try {
      // Use backend API to bypass Firestore permissions
      await apiClient.unlike_post({ post_id: postId });
      
    } catch (error: any) {
      console.error("Error unliking post:", error);
      // Revert optimistic update
      const { userPosts: currentUP, posts: currentP } = get();
      const revertPostInList = (list: Post[]) => list.map(post => {
        if (post.id === postId && !post.likes.includes(user.uid)) {
          return {
            ...post,
            likes: [...post.likes, user.uid]
          };
        }
        return post;
      });
      
      set({ 
        userPosts: revertPostInList(currentUP),
        posts: revertPostInList(currentP),
        error: error.message 
      });
      toast.error(`Failed to unlike post: ${error.message}`);
    }
  },
  
  // Utility methods
  clearError: () => set({ error: null }),
  resetState: () => set({ posts: [], userPosts: [], error: null, isLoading: false }),
}));

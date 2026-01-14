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
  serverTimestamp
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuthStore } from "./auth-store";
import { apiClient } from "app";

export enum ProductCondition {
  NEW = "new",
  LIKE_NEW = "like_new",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor"
}

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: ProductCondition;
  category: string;
  images: string[];
  tags: string[];
  isSold: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface MarketplaceStore {
  sellerProducts: MarketplaceProduct[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSellerProducts: (sellerId: string) => Promise<MarketplaceProduct[]>;
  fetchAllProducts: () => Promise<MarketplaceProduct[]>;
  fetchProductById: (productId: string) => Promise<MarketplaceProduct | null>;
  createProduct: (data: Omit<MarketplaceProduct, "id" | "sellerId" | "sellerName" | "sellerPhotoURL" | "createdAt" | "updatedAt" | "isSold" | "images">, imageFiles: File[]) => Promise<MarketplaceProduct | null>;
  deleteProduct: (productId: string) => Promise<void>;
  markAsSold: (productId: string) => Promise<void>;
}

// Helper to convert Firestore doc to MarketplaceProduct
const convertProduct = (doc: any): MarketplaceProduct => {
  const data = doc.data();
  return {
    id: doc.id,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    sellerPhotoURL: data.sellerPhotoURL,
    title: data.title,
    description: data.description,
    price: data.price,
    currency: data.currency || "USD",
    condition: data.condition || ProductCondition.GOOD,
    category: data.category || "other",
    images: data.images || [],
    tags: data.tags || [],
    isSold: data.isSold || false,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  sellerProducts: [],
  isLoading: false,
  error: null,

  fetchSellerProducts: async (sellerId) => {
    set({ isLoading: true, error: null });
    try {
      const q = query(
        collection(db, "marketplace_products"),
        where("sellerId", "==", sellerId)
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs
        .map(convertProduct)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      set({ sellerProducts: products, isLoading: false });
      return products;
    } catch (error: any) {
      console.error("Error fetching seller products:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  fetchAllProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const q = query(
        collection(db, "marketplace_products"),
        where("isSold", "==", false)
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs
        .map(convertProduct)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      // We don't store all products in a specific state variable yet, 
      // but we can return them. Or we can add a 'marketplaceProducts' state.
      // For now, let's just return them.
      set({ isLoading: false });
      return products;
    } catch (error: any) {
      console.error("Error fetching marketplace products:", error);
      set({ error: error.message, isLoading: false });
      return [];
    }
  },

  fetchProductById: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const docRef = doc(db, "marketplace_products", productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const product = convertProduct(docSnap);
        set({ isLoading: false });
        return product;
      } else {
        set({ isLoading: false });
        return null;
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  createProduct: async (data, imageFiles) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      toast.error("You must be logged in to list a product");
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      // 1. Upload images
      const imageUrls: string[] = [];
      
      for (const file of imageFiles) {
        // Sanitize filename to prevent issues with spaces and special characters in URLs
        // unique identifier is added via Date.now() so we can be aggressive with sanitization
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storageRef = ref(storage, `marketplace/${user.uid}/${Date.now()}_${sanitizedFileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      // 2. Create Firestore document
      const productData = {
        ...data,
        sellerId: user.uid,
        sellerName: user.displayName || "Anonymous",
        sellerPhotoURL: user.photoURL,
        images: imageUrls,
        isSold: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "marketplace_products"), productData);
      
      // 3. Update local state
      const newProductDoc = await getDoc(docRef);
      const newProduct = convertProduct(newProductDoc);
      
      set((state) => ({
        sellerProducts: [newProduct, ...state.sellerProducts],
        isLoading: false
      }));

      toast.success("Product listed successfully!");
      return newProduct;
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast.error("Failed to list product");
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  deleteProduct: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      // Get product to find images to delete
      const productRef = doc(db, "marketplace_products", productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const { user } = useAuthStore.getState();
        
        // Only try to delete images if we are the owner (clientside rules usually allow this)
        // If we are admin, this might fail, so we ignore errors here
        if (user && user.uid === productData.sellerId) {
          if (productData.images && Array.isArray(productData.images)) {
            for (const imageUrl of productData.images) {
              try {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef);
              } catch (e) {
                console.warn("Failed to delete image:", imageUrl, e);
              }
            }
          }
        }
      }

      // Use backend to delete document (handles both admin and owner permissions)
      await apiClient.delete_product({ productId });

      set((state) => ({
        sellerProducts: state.sellerProducts.filter(p => p.id !== productId),
        isLoading: false
      }));
      
      toast.success("Product deleted");
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
      set({ error: error.message, isLoading: false });
    }
  },

  markAsSold: async (productId) => {
    try {
      // Use backend to update document (handles both admin and owner permissions)
      await apiClient.mark_as_sold({ productId });

      set((state) => ({
        sellerProducts: state.sellerProducts.map(p => 
          p.id === productId ? { ...p, isSold: true } : p
        )
      }));
      
      toast.success("Marked as sold");
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error("Failed to update status");
    }
  }
}));

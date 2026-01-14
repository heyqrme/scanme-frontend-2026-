import { create } from "zustand";
import { ShopifyProduct } from "types";
import { toast } from "sonner";
import Client from "shopify-buy";
import { apiClient } from "app";

// Shopify Storefront API Configuration
const SHOPIFY_STORE_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || "scanme.myshopify.com";
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || "";
const USE_BACKEND_PROXY = false; // Set to false to use direct Shopify Buy SDK (requires CORS config)

interface ShopifyStore {
  products: ShopifyProduct[];
  isLoading: boolean;
  error: string | null;
  
  fetchProducts: () => Promise<ShopifyProduct[]>;
  fetchProductById: (id: string) => Promise<ShopifyProduct | null>;
}

// Initialize Shopify Buy SDK client
let shopifyClient: any = null;

const getShopifyClient = () => {
  if (!shopifyClient && SHOPIFY_STOREFRONT_ACCESS_TOKEN && SHOPIFY_STORE_DOMAIN) {
    shopifyClient = Client.buildClient({
      domain: SHOPIFY_STORE_DOMAIN,
      storefrontAccessToken: SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    });
  }
  return shopifyClient;
};

export const useShopifyStore = create<ShopifyStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    
    // Use backend proxy to avoid CORS issues
    if (USE_BACKEND_PROXY) {
      try {
        const response = await apiClient.get_products();
        const data = await response.json();
        
        if (data && data.products && Array.isArray(data.products)) {
          set({ products: data.products, isLoading: false });
          return data.products;
        } else {
          set({ products: [], isLoading: false });
          return [];
        }
      } catch (error: any) {
        console.error("Failed to fetch Shopify products via backend:", error);
        set({ 
          error: error.message || "Failed to fetch products", 
          isLoading: false,
          products: []
        });
        toast.error("Could not load products from Shopify");
        return [];
      }
    }
    
    // Fallback to direct Shopify Buy SDK (requires CORS configuration)
    const client = getShopifyClient();
    if (!client) {
      set({ 
        error: "Shopify not configured. Contact admin.", 
        isLoading: false,
        products: [] 
      });
      return [];
    }

    try {
      // Fetch products using Shopify Buy SDK
      const shopifyProducts = await client.product.fetchAll();
      
      if (!shopifyProducts || shopifyProducts.length === 0) {
        set({ products: [], isLoading: false });
        return [];
      }

      // Transform Shopify Buy SDK data to our format
      const products: ShopifyProduct[] = shopifyProducts.map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description || "",
        handle: product.handle,
        price: parseFloat(product.variants[0]?.price?.amount || "0"),
        currency: product.variants[0]?.price?.currencyCode || "USD",
        images: product.images.map((img: any) => ({
          url: img.src,
          altText: img.altText || product.title,
        })),
        variants: product.variants.map((v: any) => ({
          id: v.id,
          title: v.title,
          price: parseFloat(v.price?.amount || "0"),
          availableForSale: v.available,
        })),
      }));

      set({ products, isLoading: false });
      return products;
    } catch (error: any) {
      console.error("Failed to fetch Shopify products:", error);
      set({ 
        error: error.message || "Failed to fetch products", 
        isLoading: false,
        products: []
      });
      toast.error("Could not load products from Shopify");
      return [];
    }
  },

  fetchProductById: async (id: string) => {
    set({ isLoading: true, error: null });

    const client = getShopifyClient();
    if (!client) {
      set({ isLoading: false, error: "Shopify not configured" });
      return null;
    }

    try {
      // Fetch single product using Shopify Buy SDK
      const shopifyProduct = await client.product.fetch(id);
      
      if (!shopifyProduct) {
        set({ isLoading: false, error: "Product not found" });
        return null;
      }

      const product: ShopifyProduct = {
        id: shopifyProduct.id,
        title: shopifyProduct.title,
        description: shopifyProduct.description || "",
        handle: shopifyProduct.handle,
        price: parseFloat(shopifyProduct.variants[0]?.price?.amount || "0"),
        currency: shopifyProduct.variants[0]?.price?.currencyCode || "USD",
        images: shopifyProduct.images.map((img: any) => ({
          url: img.src,
          altText: img.altText || shopifyProduct.title,
        })),
        variants: shopifyProduct.variants.map((v: any) => ({
          id: v.id,
          title: v.title,
          price: parseFloat(v.price?.amount || "0"),
          availableForSale: v.available,
        })),
      };

      set({ isLoading: false });
      return product;
    } catch (error: any) {
      console.error("Failed to fetch product:", error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
}));
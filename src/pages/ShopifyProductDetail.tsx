import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronLeft, ExternalLink, ShoppingCart, ShieldCheck } from "lucide-react";
import { useShopifyStore } from "../utils/shopify-store";
import { useAuthStore } from "../utils/auth-store";
import { useProfileStore } from "../utils/profile-store";
import { APP_BASE_PATH } from "app";
import { ShopifyProduct, ShopifyVariant, ShopifyOption } from "types";
import { QRCodeSVG } from "qrcode.react";

export default function ShopifyProductDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("id");
  
  const { user } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();
  const { products, isLoading, fetchProducts } = useShopifyStore();
  
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ShopifyVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Load profile for veteran status
  useEffect(() => {
    if (user?.uid && !profile) {
      loadProfile(user.uid);
    }
  }, [user, profile, loadProfile]);

  // Fetch products if not loaded, then find the product
  useEffect(() => {
    const loadProduct = async () => {
      let currentProducts = products;
      
      // If no products loaded, fetch them
      if (currentProducts.length === 0) {
        currentProducts = await fetchProducts();
      }
      
      if (productId) {
        // Shopify IDs might be encoded or have slashes, so be careful with comparison if needed
        // For now, assume exact string match
        const found = currentProducts.find(p => p.id === productId);
        
        if (found) {
          setProduct(found);
          
          // Initialize options if available
          if (found.options && found.options.length > 0) {
             const initialOptions: Record<string, string> = {};
             found.options.forEach((opt: any) => { // Use any cast temporarily until types update propagates if needed
                 if (opt.values && opt.values.length > 0) {
                     initialOptions[opt.name] = opt.values[0];
                 }
             });
             setSelectedOptions(initialOptions);
          } else if (found.variants && found.variants.length > 0) {
             // Fallback if no options data
             setSelectedVariant(found.variants[0]);
          }
        }
      }
    };
    
    loadProduct();
  }, [productId, products, fetchProducts]);

  // Sync selected variant image with active image
  useEffect(() => {
    if (selectedVariant && product) {
        // If variant has an image, try to find it in the product images list to get index
        // Or if not in list, we might want to just show it? 
        // Typically Shopify includes variant images in the main images list too.
        
        // We need to type cast because image property might not be in the generated types yet (until hot reload)
        const variantImage = (selectedVariant as any).image;
        
        if (variantImage && variantImage.url) {
            const index = product.images.findIndex(img => img.url === variantImage.url);
            if (index !== -1) {
                setActiveImageIndex(index);
            }
        }
    }
  }, [selectedVariant, product]);

  // Update selectedVariant when selectedOptions change
  useEffect(() => {
    if (product && product.variants && Object.keys(selectedOptions).length > 0) {
      const variant = product.variants.find(v => {
        // Check if all selected options match this variant's options
        if (!v.selectedOptions) return false;
        
        return v.selectedOptions.every((opt: any) => {
           return selectedOptions[opt.name] === opt.value;
        });
      });
      
      if (variant) {
        setSelectedVariant(variant);
      }
    }
  }, [selectedOptions, product]);

  // Set QR code URL
  useEffect(() => {
    if (user) {
      const path = APP_BASE_PATH.startsWith('/') ? APP_BASE_PATH : `/${APP_BASE_PATH}`;
      const url = new URL(path, window.location.origin);
      url.searchParams.append('s', user.uid);
      setQrCodeUrl(url.toString());
    }
  }, [user]);

  const handleVariantChange = (variantId: string) => {
    if (product) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        setSelectedVariant(variant);
        // Also update selectedOptions to match this variant if needed for reverse sync
        if (variant.selectedOptions) {
            const newOptions: Record<string, string> = {};
            variant.selectedOptions.forEach((opt: any) => {
                newOptions[opt.name] = opt.value;
            });
            setSelectedOptions(newOptions);
        }
      }
    }
  };
  
  const handleThumbnailClick = (index: number) => {
      setActiveImageIndex(index);
      
      // Optional: Try to find a variant that uses this image and select it
      // This creates a "click image -> select variant" flow
      if (product) {
          const imageUrl = product.images[index].url;
          // Find first variant with this image
          // Use 'any' cast for now as types might be stale
          const variant = product.variants.find((v: any) => v.image?.url === imageUrl);
          
          if (variant) {
              setSelectedVariant(variant);
              
              // Also update selected options to match this variant
              if (variant.selectedOptions) {
                const newOptions: Record<string, string> = {};
                variant.selectedOptions.forEach((opt: any) => {
                    newOptions[opt.name] = opt.value;
                });
                setSelectedOptions(newOptions);
              }
          }
      }
  };

  const handleOptionChange = (name: string, value: string) => {
      setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const handleBuy = () => {
    if (!product || !selectedVariant) return;
    
    setIsRedirecting(true);
    
    // We want to direct to Cart Permalink to include attributes
    // https://{shop}.myshopify.com/cart/{variant_id}:{quantity}?attributes[QR Code]={value}
    
    let domain = "";
    // Try to extract domain from onlineStoreUrl
    if (product.onlineStoreUrl) {
        try {
            const urlObj = new URL(product.onlineStoreUrl);
            domain = urlObj.hostname;
        } catch (e) {
            console.error("Failed to parse domain", e);
        }
    }
    
    // Fallback if domain is empty, try to guess or use the onlineStoreUrl directly if we can't build permalink
    if (!domain) {
         // If we can't find domain, fall back to product page
         let url = product.onlineStoreUrl;
         if (url) {
            // Append variant
             // Extract numeric ID from gid://shopify/ProductVariant/123456789
            const variantIdMatch = selectedVariant.id.match(/\d+$/);
            if (variantIdMatch) {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}variant=${variantIdMatch[0]}`;
            }
            
            // Apply discount if veteran
            if (profile?.veteranStatus === 'verified') {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}discount=VETERAN15`;
            }

            window.open(url, '_blank');
            toast.success("Opening product page...");
         } else {
             toast.error("Store URL not available");
         }
         setIsRedirecting(false);
         return;
    }

    // Build Cart Permalink
    // Extract numeric ID from gid://shopify/ProductVariant/123456789
    const variantIdMatch = selectedVariant.id.match(/\d+$/);
    const variantId = variantIdMatch ? variantIdMatch[0] : "";
    
    if (!variantId) {
        toast.error("Invalid variant ID");
        setIsRedirecting(false);
        return;
    }

    const quantity = 1;
    // Append QR code as attribute
    // The key 'QR Code' will show up in the order details
    let params = [];
    
    if (qrCodeUrl) {
        params.push(`attributes[QR Code]=${encodeURIComponent(qrCodeUrl)}`);
    }
    
    // Apply discount if veteran
    if (profile?.veteranStatus === 'verified') {
        params.push(`discount=VETERAN15`);
    }
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : "";
    const cartUrl = `https://${domain}/cart/${variantId}:${quantity}${queryString}`;

    window.open(cartUrl, '_blank');
    toast.success("Opening secure checkout...");
    
    setTimeout(() => setIsRedirecting(false), 1000);
  };

  if (isLoading && !product) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] w-full rounded-md bg-gray-800" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 bg-gray-800" />
            <Skeleton className="h-6 w-1/4 bg-gray-800" />
            <Skeleton className="h-32 w-full bg-gray-800" />
            <Skeleton className="h-12 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container px-4 py-8 mx-auto text-center">
        <h2 className="text-2xl text-red-500 mb-4">Product Not Found</h2>
        <Button onClick={() => navigate("/store")} variant="default">
          Back to Store
        </Button>
      </div>
    );
  }

  const price = selectedVariant?.price || product.variants[0]?.price;
  // Use active image index, fallback to featured, fallback to placeholder
  const imageUrl = product.images[activeImageIndex]?.url || product.featuredImage?.url || product.images[0]?.url || 'https://via.placeholder.com/400x400';
  
  const isVeteran = profile?.veteranStatus === 'verified';
  const originalPriceAmount = price ? parseFloat(price.amount) : 0;
  const discountedPriceAmount = isVeteran ? (originalPriceAmount * 0.85).toFixed(2) : null;

  // Helper to check if a specific option value is available for sale (in combination with other selected options)
  // This is a bit complex, for now let's just show what's available
  
  return (
    <div className="container px-4 py-8 mx-auto min-h-screen bg-black text-white">
      <Button 
        variant="ghost" 
        className="mb-6 text-gray-400 hover:text-white" 
        onClick={() => navigate("/store")}
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Store
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <div className="relative h-[500px] bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800">
            <img 
              src={imageUrl} 
              alt={product.title}
              className="w-full h-full object-contain"
            />
            
            {showQrPreview && qrCodeUrl && (
              <div 
                className="absolute transition-opacity duration-300"
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '50%',
                  width: '30%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <QRCodeSVG 
                  value={qrCodeUrl}
                  size={1000}
                  className="w-full h-auto shadow-lg"
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              onClick={() => setShowQrPreview(!showQrPreview)}
            >
              {showQrPreview ? "Hide QR Code" : "Preview with QR Code"}
            </Button>
          </div>

          {/* Additional Images (if any) */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <div 
                    key={idx} 
                    className={`w-20 h-20 flex-shrink-0 rounded border overflow-hidden bg-gray-900 cursor-pointer transition-all ${activeImageIndex === idx ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-800 hover:border-gray-600'}`}
                    onClick={() => handleThumbnailClick(idx)}
                >
                  <img src={img.url} alt={img.altText || product.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-start">
               <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
               <div className="flex gap-2">
                 {isVeteran && (
                   <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                     <ShieldCheck className="w-3 h-3 mr-1" /> VETERAN DISCOUNT
                   </Badge>
                 )}
                 <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/50">
                   Ninja POD
                 </Badge>
               </div>
            </div>
            
            {price && (
              <div className="flex items-baseline gap-3">
                {isVeteran ? (
                  <>
                    <p className="text-2xl font-bold text-green-400">
                      {discountedPriceAmount} {price.currencyCode}
                    </p>
                    <p className="text-lg text-gray-500 line-through">
                      {price.amount} {price.currencyCode}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-purple-400">
                    {price.amount} {price.currencyCode}
                  </p>
                )}
              </div>
            )}
            
            {isVeteran && (
              <p className="text-sm text-green-400 mt-1">
                Your 15% veteran discount will be automatically applied at checkout.
              </p>
            )}
          </div>

          <Separator className="bg-gray-800" />

          <div className="prose prose-invert max-w-none text-gray-300">
             <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>

          <Separator className="bg-gray-800" />

          {/* Variants / Options */}
          {/* If we have parsed options, show them. Otherwise fallback to variant buttons */}
          {product.options && product.options.length > 0 ? (
            <div className="space-y-6">
              {product.options.map((option: any) => (
                <div key={option.id || option.name} className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-300">{option.name}</label>
                    <span className="text-sm text-gray-400">{selectedOptions[option.name]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value: string) => {
                      const isSelected = selectedOptions[option.name] === value;
                      return (
                        <Button
                          key={value}
                          variant={isSelected ? "default" : "outline"}
                          className={isSelected
                            ? "bg-purple-600 hover:bg-purple-700 border-purple-600" 
                            : "border-gray-700 hover:bg-gray-800 text-gray-300"}
                          onClick={() => handleOptionChange(option.name, value)}
                        >
                          {value}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : product.variants.length > 1 ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Options</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <Button
                    key={variant.id}
                    variant={selectedVariant?.id === variant.id ? "default" : "outline"}
                    className={selectedVariant?.id === variant.id 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : "border-gray-700 hover:bg-gray-800"}
                    onClick={() => handleVariantChange(variant.id)}
                    disabled={!variant.availableForSale}
                  >
                    {variant.title}
                    {!variant.availableForSale && " (Out of Stock)"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">About this product</h3>
            <p className="text-sm text-gray-400">
              This product is fulfilled by Ninja POD. Your unique profile QR code will be automatically applied during production.
              Clicking "Buy Now" will take you to our secure checkout page.
            </p>
          </div>

          <Button 
            className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-900/20"
            onClick={handleBuy}
            disabled={!selectedVariant?.availableForSale || isRedirecting}
          >
            {isRedirecting ? (
              "Redirecting..." 
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Buy Now <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

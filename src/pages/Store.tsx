import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "components/Logo";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../utils/auth-store";
import { useProfileStore } from "../utils/profile-store";
import { useProductStore, ProductCategory, ProductSize, Product, ProductColor } from "../utils/product-store";
import { useShopifyStore } from "../utils/shopify-store";
import { ShopifyProduct } from "types";

export default function Store() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { 
    products, 
    featuredProducts, 
    isLoading: productIsLoading, 
    error: productError, 
    fetchProducts, 
    fetchFeaturedProducts,
    fetchProductsByCategory,
    addToCart
  } = useProductStore();
  
  // Shopify store
  const {
    products: shopifyProducts,
    isLoading: shopifyIsLoading,
    error: shopifyError,
    fetchProducts: fetchShopifyProducts
  } = useShopifyStore();

  // State for filtering and displaying products
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // State for displaying Shopify products
  const [displayedShopifyProducts, setDisplayedShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"regular" | "ninja">("ninja");

  // QR code state
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Fetch products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      await fetchProducts();
      await fetchFeaturedProducts();
      await fetchShopifyProducts();
      setIsInitialLoad(false);
    };

    // Set QR code URL
    if (user) {
      // Use the URL constructor to ensure correct formatting
      const url = new URL('/add-friend', window.location.origin);
      url.searchParams.append('id', user.uid);
      setQrCodeUrl(url.toString());
    }

    loadProducts();
  }, [fetchProducts, fetchFeaturedProducts, fetchShopifyProducts, user]);

  // Update displayed regular products when filters change
  useEffect(() => {
    const filterProducts = async () => {
      let filteredProducts = products;

      // Filter by category if not "all"
      if (selectedCategory !== "all") {
        // If we have products already, filter them
        if (products.length > 0) {
          filteredProducts = products.filter(p => p.category === selectedCategory);
        } else {
          // Otherwise fetch from Firestore
          filteredProducts = await fetchProductsByCategory(selectedCategory);
        }
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description?.toLowerCase().includes(query)
        );
      }

      setDisplayedProducts(filteredProducts);
    };

    if (!isInitialLoad) {
      filterProducts();
    }
  }, [selectedCategory, searchQuery, products, isInitialLoad, fetchProductsByCategory]);
  
  // Filter Shopify products when search changes
  useEffect(() => {
    if (!isInitialLoad && shopifyProducts) {
      let filtered = [...shopifyProducts];
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
      }
      
      setDisplayedShopifyProducts(filtered);
    }
  }, [searchQuery, shopifyProducts, isInitialLoad]);

  // Mock products for initial development
  const mockProducts: Product[] = [
    {
      id: "1",
      name: "Classic QR T-Shirt",
      description: "A comfortable cotton t-shirt with your unique QR code printed on the front.",
      price: 24.99,
      category: ProductCategory.TSHIRT,
      sizes: [ProductSize.S, ProductSize.M, ProductSize.L, ProductSize.XL],
      colors: [
        { name: "Black", hex: "#000000" },
        { name: "White", hex: "#FFFFFF" },
        { name: "Gray", hex: "#808080" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/image_ (15).png"],
      qrCodePlacement: {
        x: 50,
        y: 30,
        width: 20,
        rotation: 0
      },
      featured: true,
      inStock: true,
      createdAt: new Date(),
    },
    {
      id: "2",
      name: "Premium QR Hoodie",
      description: "Stay warm and connected with this premium hoodie featuring your QR code.",
      price: 49.99,
      category: ProductCategory.HOODIE,
      sizes: [ProductSize.S, ProductSize.M, ProductSize.L, ProductSize.XL, ProductSize.XXL],
      colors: [
        { name: "Black", hex: "#000000" },
        { name: "Navy", hex: "#000080" },
        { name: "Maroon", hex: "#800000" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250125_132713_Facebook.jpg"],
      qrCodePlacement: {
        x: 50,
        y: 40,
        width: 15,
        rotation: 0
      },
      featured: true,
      inStock: true,
      createdAt: new Date(),
    },
    {
      id: "3",
      name: "QR Code Wristband",
      description: "A stylish silicone wristband with your QR code. Perfect for clubs and events.",
      price: 9.99,
      category: ProductCategory.WRISTBAND,
      sizes: [ProductSize.ONESIZE],
      colors: [
        { name: "Neon Blue", hex: "#1E90FF" },
        { name: "Neon Pink", hex: "#FF69B4" },
        { name: "Neon Green", hex: "#39FF14" },
        { name: "Black", hex: "#000000" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250125_134625_Facebook.jpg"],
      qrCodePlacement: {
        x: 50,
        y: 50,
        width: 50,
        rotation: 0
      },
      featured: false,
      inStock: true,
      createdAt: new Date(),
    },
    {
      id: "4",
      name: "ScanMe Beanie",
      description: "A stylish beanie with your QR code embroidered on the front. Perfect for cold nights out.",
      price: 19.99,
      category: ProductCategory.ACCESSORY,
      sizes: [ProductSize.ONESIZE],
      colors: [
        { name: "Black", hex: "#000000" },
        { name: "Navy", hex: "#000080" },
        { name: "Red", hex: "#FF0000" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/image_ (15).png"],
      qrCodePlacement: {
        x: 50,
        y: 40,
        width: 25,
        rotation: 0
      },
      featured: false,
      inStock: true,
      createdAt: new Date(),
    },
    {
      id: "5",
      name: "QR Phone Case",
      description: "A durable phone case with your QR code printed on the back. Available for multiple phone models.",
      price: 14.99,
      category: ProductCategory.ACCESSORY,
      sizes: [ProductSize.ONESIZE],
      colors: [
        { name: "Black", hex: "#000000" },
        { name: "Clear", hex: "#FFFFFF" },
        { name: "Purple", hex: "#800080" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250125_134625_Facebook.jpg"],
      qrCodePlacement: {
        x: 50,
        y: 50,
        width: 40,
        rotation: 0
      },
      featured: false,
      inStock: true,
      createdAt: new Date(),
    },
    {
      id: "6",
      name: "ScanMe Backpack",
      description: "A sleek backpack with your QR code patch. Perfect for carrying your essentials for a night out.",
      price: 39.99,
      category: ProductCategory.ACCESSORY,
      sizes: [ProductSize.ONESIZE],
      colors: [
        { name: "Black", hex: "#000000" },
        { name: "Gray", hex: "#808080" }
      ],
      images: ["https://static.databutton.com/public/ba8bb897-f275-49b7-bc80-3632a8bde45f/Screenshot_20250125_132713_Facebook.jpg"],
      qrCodePlacement: {
        x: 30,
        y: 50,
        width: 20,
        rotation: 0
      },
      featured: false,
      inStock: true,
      createdAt: new Date(),
    }
  ];

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as ProductCategory | "all");
  };

  // Handle product click to view details
  const handleProductClick = (productId: string) => {
    navigate(`/product-detail?id=${productId}`);
  };
  
  // Handle Add to Cart / Buy Now - Redirects to product detail
  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to product detail triggered by card click
    navigate(`/product-detail?id=${product.id}`);
  };

  // Render placeholder while loading
  if ((productIsLoading || shopifyIsLoading) && isInitialLoad) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Logo size="medium" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Store
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-gray-900/60 border border-gray-800 overflow-hidden h-[400px]">
              <div className="h-[220px] bg-gray-800 animate-pulse" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 bg-gray-800 mb-2" />
                <Skeleton className="h-4 w-full bg-gray-800 mb-1" />
                <Skeleton className="h-4 w-2/3 bg-gray-800 mb-4" />
                <Skeleton className="h-5 w-1/4 bg-gray-800" />
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Skeleton className="h-10 w-full bg-gray-800" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto min-h-screen bg-black text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          ScanMe Store
        </h1>
        <p className="text-gray-400 mb-6">
          Customize products with your unique QR code. When scanned, people can instantly connect with you! Select a product to personalize it with your QR code.
        </p>

        {/* Search and filter section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          {activeTab === "regular" && (
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value={ProductCategory.TSHIRT}>T-Shirts</SelectItem>
                <SelectItem value={ProductCategory.HOODIE}>Hoodies</SelectItem>
                <SelectItem value={ProductCategory.WRISTBAND}>Wristbands</SelectItem>
                <SelectItem value={ProductCategory.STICKER}>Stickers</SelectItem>
                <SelectItem value={ProductCategory.ACCESSORY}>Accessories</SelectItem>
                <SelectItem value={ProductCategory.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Tabs for switching between Ninja POD and regular products */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "regular" | "ninja")} className="mb-6">
          <TabsList className="bg-gray-900 border border-gray-700">
            <TabsTrigger value="ninja" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Ninja POD Products
            </TabsTrigger>
            <TabsTrigger value="regular" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Official Products
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ninja POD Products Section */}
      {activeTab === "ninja" && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Ninja POD Products
          </h2>
          
          {shopifyIsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-gray-900/60 border border-gray-800 overflow-hidden h-[400px]">
                  <div className="h-[220px] bg-gray-800 animate-pulse"></div>
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-800 rounded animate-pulse mb-2 w-3/4"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse mb-4 w-1/2"></div>
                    <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : shopifyError ? (
            <Card className="border-yellow-500/30 bg-yellow-950/20 p-6 text-center">
              <h3 className="text-xl font-semibold mb-3 text-yellow-300">Shopify Connection Issue</h3>
              <p className="text-gray-300 mb-4">
                Unable to connect to Shopify. Please check your credentials.
              </p>
              <p className="text-sm text-gray-400">
                Error details: {typeof shopifyError === 'string' ? shopifyError : 'Connection error'}
              </p>
            </Card>
          ) : displayedShopifyProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedShopifyProducts.map((product) => (
                <ShopifyProductCard
                  key={product.id}
                  product={product}
                  qrCodeUrl={qrCodeUrl}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-800 rounded-lg bg-gray-900/40">
              <h3 className="text-xl font-semibold mb-2 text-gray-300">No products found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try adjusting your search query' : 'No products available from the connected Shopify store.'}
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Featured Products Section (Only show on Regular tab) */}
      {activeTab === "regular" && featuredProducts.length > 0 && selectedCategory === "all" && !searchQuery && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-purple-400 mr-2">★</span> Featured Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                qrCodeUrl={qrCodeUrl}
                onClick={() => handleProductClick(product.id)}
                onAddToCart={(e) => handleAddToCart(product, e)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Regular Products Section */}
      {activeTab === "regular" && (
        <div>
          <div className="mb-8 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
               <div>
                 <h3 className="text-xl font-semibold text-white mb-2">Looking for community items?</h3>
                 <p className="text-gray-400">
                   Visit the <span className="text-purple-400 font-bold">Classifieds</span> to find unique items sold by other members or sell your own!
                 </p>
               </div>
               <div className="flex gap-3">
                 <Button 
                   variant="outline" 
                   className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                   onClick={() => navigate("/marketplace")}
                 >
                   Browse Classifieds
                 </Button>
                 <Button 
                   className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                   onClick={() => navigate("/seller-dashboard")}
                 >
                   Sell Your Items
                 </Button>
               </div>
             </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory === "all" ? "All Products" : 
            selectedCategory === ProductCategory.TSHIRT ? "T-Shirts" :
            selectedCategory === ProductCategory.HOODIE ? "Hoodies" :
            selectedCategory === ProductCategory.ACCESSORY ? "Accessories" :
            selectedCategory === ProductCategory.WRISTBAND ? "Wristbands" :
            selectedCategory === ProductCategory.OTHER ? "Other Products" :
            `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}s`}
          </h2>

          {/* Display either real products or mock products - Filtered for LOCAL only */}
          {(() => {
            // Filter for Local products (fulfillmentSource is 'local' or undefined/null)
            const localProducts = displayedProducts.filter(p => !p.fulfillmentSource || p.fulfillmentSource === "local");
            
            // Also filter mock products (they are implicitly local)
            const filteredMockProducts = mockProducts.filter(p => 
              (selectedCategory === "all" || p.category === selectedCategory) &&
              (!searchQuery || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            if (localProducts.length > 0) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      qrCodeUrl={qrCodeUrl}
                      onClick={() => handleProductClick(product.id)}
                      onAddToCart={(e) => handleAddToCart(product, e)}
                    />
                  ))}
                </div>
              );
            } else if (filteredMockProducts.length > 0) {
              return (
                 <div className="space-y-6">
                   <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-md text-center">
                     <p className="text-yellow-200">
                       No official products are currently available. Showing example products below.
                     </p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMockProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          qrCodeUrl={qrCodeUrl}
                          onClick={() => handleProductClick(product.id)}
                          onAddToCart={(e) => handleAddToCart(product, e)}
                        />
                      ))}
                   </div>
                </div>
              );
            } else {
              return (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2 text-gray-300">No official products found</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
                  <Button 
                    variant="outline" 
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Admin section - only visible to admins */}
      {user?.isAdmin && (
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Admin Controls</h2>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => navigate("/admin-store")}
            >
              Manage Products
            </Button>
          </div>
                    
          {/* Guide for photo upload process */}
          <Card className="bg-gray-900/60 border border-gray-800 mb-8">
            <CardHeader>
              <CardTitle>How to Use Your Photos in the Store</CardTitle>
              <CardDescription className="text-gray-400">
                Follow these steps to create products with your own photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                    1
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">Upload Your Photos</h3>
                    <p className="text-sm text-gray-400">
                      Click the "Manage Products" button above to access the admin page. Then create a new product and upload your photos.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                    2
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">Position Your QR Code</h3>
                    <p className="text-sm text-gray-400">
                      Use the QR Code Placement controls to position and size your QR code on the product image. You can preview how it will look.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                    3
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">Set Product Details</h3>
                    <p className="text-sm text-gray-400">
                      Add a name, description, price, and other details for your product. These will be shown to customers in the store.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                    4
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">Save and Publish</h3>
                    <p className="text-sm text-gray-400">
                      Save your product to make it available in the store. Set it as "featured" if you want it to appear in the featured section.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: Product;
  qrCodeUrl: string;
  onClick: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
}

function ProductCard({ product, qrCodeUrl, onClick, onAddToCart }: ProductCardProps) {
  // State for the preview image (with QR code overlay)
  const [previewMode, setPreviewMode] = useState(false);
  
  // Format category label correctly
  const getCategoryLabel = (category: ProductCategory): string => {
    switch(category) {
      case ProductCategory.TSHIRT:
        return "T-Shirt";
      case ProductCategory.HOODIE:
        return "Hoodie";
      case ProductCategory.ACCESSORY:
        return "Accessory";
      case ProductCategory.WRISTBAND:
        return "Wristband";
      case ProductCategory.STICKER:
        return "Sticker";
      case ProductCategory.OTHER:
        return "Other";
      default:
        return category;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="bg-gray-900/60 border border-gray-800 overflow-hidden cursor-pointer h-full flex flex-col"
        onClick={onClick}
      >
        {/* Product Image with QR Code Preview */}
        <div className="relative h-[220px] overflow-hidden group">
          <div className={`absolute inset-0 transition-opacity duration-300 ${previewMode ? 'opacity-30' : 'opacity-100'}`}>
            <img 
              src={product.images[0] || 'https://via.placeholder.com/400x300'} 
              alt={product.name}
              className="w-full h-full object-cover" 
            />
          </div>

          {previewMode && qrCodeUrl && (
            <div 
              className="absolute transition-opacity duration-300"
              style={{
                top: `${product.qrCodePlacement.y}%`,
                left: `${product.qrCodePlacement.x}%`,
                width: `${product.qrCodePlacement.width}%`,
                transform: `translate(-50%, -50%) rotate(${product.qrCodePlacement.rotation}deg)`,
              }}
            >
              <QRCodeSVG 
                value={qrCodeUrl}
                size={1000} // Will be scaled by the container width
                className="w-full h-auto"
                fgColor="#000000"
                bgColor="#FFFFFF"
                level="H"
                includeMargin={false}
              />
            </div>
          )}

          {/* Overlay controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className="bg-gray-900/80 border-gray-700 text-gray-300">
              {getCategoryLabel(product.category)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/40 px-3 py-1"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewMode(!previewMode);
              }}
            >
              {previewMode ? "Hide QR" : "Preview QR"}
            </Button>
          </div>
        </div>

        {/* Product Details */}
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-xl mb-2">{product.name}</CardTitle>
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
          <p className="text-xl font-bold text-purple-400">${product.price.toFixed(2)}</p>
          
          {/* Size and color options */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center">
              <Label className="mr-2 text-xs text-gray-500">Sizes:</Label>
              <div className="flex gap-1">
                {product.sizes.map((size) => (
                  <Badge 
                    key={size} 
                    variant="outline" 
                    className="text-xs cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {size}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
            onClick={(e) => {
              e.stopPropagation();
              // Cart functionality removed per request
            }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Buy Now
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Shopify Product Card Component
interface ShopifyProductCardProps {
  product: ShopifyProduct;
  qrCodeUrl: string;
}

function ShopifyProductCard({ product, qrCodeUrl }: ShopifyProductCardProps) {
  const navigate = useNavigate();
  const [showQrPreview, setShowQrPreview] = useState(false);
  
  // Get price from first variant or default
  const price = product.variants?.[0]?.price;
  const priceFormatted = price ? `${price.amount} ${price.currencyCode}` : "Price unavailable";

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/shopify-product-detail?id=${product.id}`);
  };

  const handleCardClick = () => {
    navigate(`/shopify-product-detail?id=${product.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="bg-gray-900/60 border border-gray-800 overflow-hidden cursor-pointer h-full flex flex-col"
        onClick={handleCardClick}
      >
        {/* Product Image with QR Code Preview */}
        <div className="relative h-[220px] overflow-hidden group">
          <div className={`absolute inset-0 transition-opacity duration-300 ${showQrPreview ? 'opacity-30' : 'opacity-100'}`}>
            <img 
              src={product.featuredImage?.url || product.images[0]?.url || 'https://via.placeholder.com/400x300'} 
              alt={product.title}
              className="w-full h-full object-cover" 
            />
          </div>

          {showQrPreview && qrCodeUrl && (
            <div 
              className="absolute transition-opacity duration-300"
              style={{
                top: '50%',
                left: '50%',
                width: '30%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <QRCodeSVG 
                value={qrCodeUrl}
                size={1000} // Will be scaled by the container width
                className="w-full h-auto"
                fgColor="#000000"
                bgColor="#FFFFFF"
                level="H"
                includeMargin={false}
              />
            </div>
          )}

          {/* Overlay controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className="bg-gray-900/80 border-gray-700 text-gray-300">
              Ninja POD
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/40 px-3 py-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowQrPreview(!showQrPreview);
              }}
            >
              {showQrPreview ? "Hide QR" : "Preview QR"}
            </Button>
          </div>
        </div>

        {/* Product Details */}
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-xl mb-2 line-clamp-1">{product.title}</CardTitle>
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
          <p className="text-xl font-bold text-purple-400">{priceFormatted}</p>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
            onClick={handleBuy}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

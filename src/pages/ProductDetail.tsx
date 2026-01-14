import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, ShoppingCart, CreditCard, Truck } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { apiClient } from "app";
import { CheckoutForm } from "@/components/CheckoutForm";
import { useProductStore, Product, ProductSize, ProductColor } from "../utils/product-store";
import { useAuthStore } from "../utils/auth-store";
import { useProfileStore } from "../utils/profile-store";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_BASE_PATH } from "app";
import { PRODUCTION_URL } from "../utils/config";

export default function ProductDetail() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { products, mockProducts = [], isLoading, fetchProductById, placeOrder } = useProductStore();
  
  // State for selected options
  const [selectedSize, setSelectedSize] = useState<ProductSize>();
  const [selectedColor, setSelectedColor] = useState<ProductColor>();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Stripe state
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"shipping" | "payment">("shipping");

  // Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    name: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state_code: "",
    zip: "",
    country_code: "US",
    phone: ""
  });

  useEffect(() => {
    // Set QR code URL
    if (user) {
      // Use the URL constructor to ensure correct formatting
      // Use production URL with 's' param for shortened QR code
      const baseUrl = `${PRODUCTION_URL}/`;
      const url = new URL(baseUrl);
      url.searchParams.append('s', user.uid);
      setQrCodeUrl(url.toString());
    }

    // Fetch or find product
    const loadProduct = async () => {
      if (!productId) {
        console.error("No product ID found in URL parameters");
        navigate('/store');
        return;
      }
      
      // Prevent resetting if we already have the correct product loaded
      // This prevents state reset when auth state changes or other non-product dependencies update
      if (product && product.id === productId) {
        return;
      }
      
      console.log("Loading product with ID:", productId);

      // First check if we already have the product in our store
      const existingProduct = products.find(p => p.id === productId);
      
      if (existingProduct) {
        setProduct(existingProduct);
        setSelectedSize(existingProduct.sizes[0]);
        setSelectedColor(existingProduct.colors[0]);
        if (existingProduct.colors[0]?.imageIndex !== undefined) {
          setActiveImageIndex(existingProduct.colors[0].imageIndex);
        }
        return;
      }
      
      // If not in store products, try fetching it
      try {
        const fetchedProduct = await fetchProductById(productId);
        if (fetchedProduct) {
          setProduct(fetchedProduct);
          setSelectedSize(fetchedProduct.sizes[0]);
          setSelectedColor(fetchedProduct.colors[0]);
          if (fetchedProduct.colors[0]?.imageIndex !== undefined) {
            setActiveImageIndex(fetchedProduct.colors[0].imageIndex);
          }
        } else {
          // As a fallback during development, check mock products
          console.log("Checking mock products:", mockProducts);
          const mockProduct = Array.isArray(mockProducts) ? mockProducts.find(p => p.id === productId) : null;
          if (mockProduct) {
            console.log("Found mock product:", mockProduct);
            setProduct(mockProduct);
            if (mockProduct.sizes && mockProduct.sizes.length > 0) {
              setSelectedSize(mockProduct.sizes[0]);
            }
            if (mockProduct.colors && mockProduct.colors.length > 0) {
              setSelectedColor(mockProduct.colors[0]);
              if (mockProduct.colors[0].imageIndex !== undefined) {
                setActiveImageIndex(mockProduct.colors[0].imageIndex);
              }
            }
          } else {
            console.error("Product not found in either products or mock products");
            navigate('/store'); // If not found, go back to store
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        navigate('/store');
      }
    };

    loadProduct();
  }, [productId, products, navigate, fetchProductById, user, mockProducts]);

  useEffect(() => {
    // Update active image when color changes
    if (selectedColor && selectedColor.imageIndex !== undefined && product) {
      // Ensure the index is valid
      if (selectedColor.imageIndex < product.images.length) {
        setActiveImageIndex(selectedColor.imageIndex);
      }
    }
  }, [selectedColor, product]);

  useEffect(() => {
    // Load Stripe key
    const loadStripeKey = async () => {
      try {
        const response = await apiClient.get_config();
        const { publishableKey } = await response.json();
        if (publishableKey) {
          setStripePromise(loadStripe(publishableKey));
        }
      } catch (error) {
        console.error("Failed to load Stripe config:", error);
      }
    };
    loadStripeKey();
  }, []);

  // Navigation back to store
  const handleBackToStore = () => {
    navigate("/store");
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImageIndex(index);
    
    // Find color associated with this image and select it
    if (product && product.colors) {
      const colorForImage = product.colors.find(c => c.imageIndex === index);
      if (colorForImage) {
        setSelectedColor(colorForImage);
      }
    }
  };

  const handleProceedToPayment = async () => {
    if (!product || !user) return;
    
    // Validate shipping details
    const requiredFields = ['name', 'email', 'address1', 'city', 'state_code', 'zip', 'country_code'];
    const missingField = requiredFields.find(field => !shippingDetails[field as keyof typeof shippingDetails]);
    
    if (missingField) {
      toast.error(`Please fill in ${missingField.replace('_', ' ')}`);
      return;
    }
    
    setIsPlacingOrder(true); // Reuse this loading state
    
    try {
      const response = await apiClient.create_payment_intent({
        items: [{ productId: product.id, quantity }],
        currency: "usd",
        shipping: {
          name: shippingDetails.name,
          address: {
            line1: shippingDetails.address1,
            line2: shippingDetails.address2 || undefined,
            city: shippingDetails.city,
            state: shippingDetails.state_code,
            postal_code: shippingDetails.zip,
            country: shippingDetails.country_code,
          }
        }
      });
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
      setCheckoutStep("payment");
    } catch (error) {
      console.error("Failed to create payment intent:", error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!product || !user) return;

    setIsPlacingOrder(true);
    
    try {
      const subtotal = product.price * quantity;
      const shippingCost = 5.00; // Flat rate shipping for now
      const tax = subtotal * 0.08; // Estimated tax
      const total = subtotal + shippingCost + tax;
      
      const orderId = await placeOrder({
        userId: user.uid,
        items: [{
          productId: product.id,
          variant_id: 0,
          name: product.name,
          quantity: quantity,
          price: product.price,
          selectedSize: selectedSize,
          selectedColor: selectedColor,
          files: [{ type: "qr_url", url: qrCodeUrl }]
        }],
        recipient: shippingDetails,
        shipping: {
          name: "Standard Shipping",
          service: "standard",
          price: shippingCost
        },
        costs: {
          subtotal,
          shipping: shippingCost,
          tax,
          total
        },
        fulfillmentSource: product.fulfillmentSource || "local",
        type: product.fulfillmentSource === "ninja" ? "ninja" : "local"
      });
      
      if (orderId) {
        setIsCheckoutOpen(false);
        setCheckoutStep("shipping"); // Reset for next time
        setClientSecret("");
        navigate("/orders");
      }
    } catch (error) {
      console.error("Order placement failed:", error);
      toast.error("Payment successful but order creation failed. Please contact support.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Loading state
  if (isLoading || !product) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/store")} 
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Store
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Skeleton className="w-full h-[400px] bg-gray-800 rounded-lg" />
          </div>
          <div className="space-y-6">
            <div>
              <Skeleton className="w-3/4 h-10 bg-gray-800 mb-3" />
              <Skeleton className="w-1/2 h-6 bg-gray-800 mb-5" />
            </div>
            <Skeleton className="w-full h-32 bg-gray-800" />
            <div className="space-y-4">
              <Skeleton className="w-1/3 h-6 bg-gray-800" />
              <Skeleton className="w-full h-12 bg-gray-800" />
              <Skeleton className="w-1/3 h-6 bg-gray-800" />
              <Skeleton className="w-full h-12 bg-gray-800" />
            </div>
            <Skeleton className="w-full h-12 bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen bg-black text-white">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/store")} 
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <Tabs defaultValue="image" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/80">
              <TabsTrigger value="image">Product</TabsTrigger>
              <TabsTrigger value="preview">QR Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-2">
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                <img 
                  src={product.images[activeImageIndex] || 'https://via.placeholder.com/500x500'} 
                  alt={product.name}
                  className="w-full h-full object-contain transition-all duration-300" 
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-2">
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg overflow-hidden relative h-[500px]">
                {/* Product image as background */}
                <img 
                  src={product.images[activeImageIndex] || 'https://via.placeholder.com/500x500'} 
                  alt={product.name}
                  className="w-full h-full object-cover opacity-30 transition-all duration-300" 
                />
                
                {/* QR code overlay */}
                {qrCodeUrl && (
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
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                )}
                
                {/* Helper text */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 text-center">
                  <p className="text-sm text-gray-300">This is how your QR code will appear on the product</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Image Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 relative z-50">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleThumbnailClick(index);
                  }}
                  className={`
                    relative w-20 h-20 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer
                    ${activeImageIndex === index ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105' : 'border-gray-800 hover:border-gray-600 opacity-70 hover:opacity-100'}
                  `}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} thumbnail ${index + 1}`} 
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-purple-400">${product.price.toFixed(2)}</p>
          </div>
          
          <p className="text-gray-300">{product.description}</p>
          
          {/* Product Options */}
          <Card className="bg-gray-900/60 border border-gray-800">
            <CardContent className="p-6 space-y-6">
              {/* Size Selection */}
              {product.sizes.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300">Size</Label>
                  <RadioGroup 
                    value={selectedSize} 
                    onValueChange={(value) => setSelectedSize(value as ProductSize)}
                    className="grid grid-cols-5 gap-2"
                  >
                    {product.sizes.map((size) => (
                      <div key={size}>
                        <RadioGroupItem 
                          value={size} 
                          id={`size-${size}`} 
                          className="peer sr-only" 
                        />
                        <Label 
                          htmlFor={`size-${size}`}
                          className="flex h-10 items-center justify-center rounded-md border-2 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:text-purple-400 cursor-pointer"
                        >
                          {size}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              
              {/* Color Selection */}
              {product.colors.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300">Color</Label>
                  <RadioGroup 
                    value={selectedColor?.name} 
                    onValueChange={(value) => {
                      const color = product.colors.find(c => c.name === value);
                      if (color) setSelectedColor(color);
                    }}
                    className="flex flex-wrap gap-2"
                  >
                    {product.colors.map((color) => (
                      <div key={color.name}>
                        <RadioGroupItem 
                          value={color.name} 
                          id={`color-${color.name}`} 
                          className="peer sr-only" 
                        />
                        <Label 
                          htmlFor={`color-${color.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-700 hover:border-gray-400 peer-data-[state=checked]:border-purple-500 cursor-pointer"
                        >
                          <span 
                            className="block h-6 w-6 rounded-full" 
                            style={{ backgroundColor: color.hex }}
                          />
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              
              {/* Quantity Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300">Quantity</Label>
                <div className="flex items-center border-2 border-gray-700 rounded-md w-32">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-400 hover:text-white" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="flex-1 text-center">{quantity}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-400 hover:text-white" 
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Back to Store Button */}
          <Button 
            className="w-full py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg"
            onClick={handleBackToStore}
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back to Store
          </Button>
          
          {/* Buy Button */}
          <Button 
            className="w-full py-6 mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-lg flex items-center justify-center"
            onClick={() => {
              // Check if size and color are selected
              if (!selectedSize && product.sizes.length > 0) {
                toast.error("Please select a size");
                return;
              }
              if (!selectedColor && product.colors.length > 0) {
                toast.error("Please select a color");
                return;
              }
              
              // For local products, open checkout dialog
              if (user) {
                // Pre-fill some details if available
                if (profile) {
                  setShippingDetails(prev => ({
                    ...prev,
                    name: profile.displayName || user.displayName || "",
                    email: profile.email || user.email || "",
                    address1: profile.address?.line1 || "",
                    address2: profile.address?.line2 || "",
                    city: profile.address?.city || "",
                    state_code: profile.address?.state || "",
                    zip: profile.address?.zip || "",
                    country_code: profile.address?.country || "US",
                    phone: profile.phoneNumber || ""
                  }));
                }
                setCheckoutStep("shipping");
                setIsCheckoutOpen(true);
              } else {
                toast.error("Please log in to purchase items");
                navigate("/login");
              }
            }}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Buy Now
          </Button>
          
          {/* Note */}
          <p className="text-sm text-gray-400 text-center mt-4">
            Your unique QR code will be applied to this product. When scanned, it will link people directly to your profile.
          </p>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset state when closing
          setCheckoutStep("shipping");
          setClientSecret("");
        }
        setIsCheckoutOpen(open);
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[500px] max-h-[90vh] overflow-y-auto" aria-describedby="checkout-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {checkoutStep === "shipping" ? "Shipping Details" : "Payment"}
            </DialogTitle>
            <DialogDescription className="text-gray-400" id="checkout-description">
              {checkoutStep === "shipping" 
                ? "Enter your shipping details to complete your order."
                : "Enter your payment details securely."}
            </DialogDescription>
          </DialogHeader>
          
          {product && (
            <div className="py-4 border-b border-gray-800 mb-4">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold">{product.name}</h4>
                  <p className="text-sm text-gray-400">
                    {selectedSize && `Size: ${selectedSize} • `}
                    {selectedColor && `Color: ${selectedColor.name} • `}
                    Qty: {quantity}
                  </p>
                  <p className="text-purple-400 font-medium mt-1">${(product.price * quantity).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
          
          {checkoutStep === "shipping" ? (
            <>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={shippingDetails.name} 
                      onChange={(e) => setShippingDetails({...shippingDetails, name: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={shippingDetails.email} 
                      onChange={(e) => setShippingDetails({...shippingDetails, email: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address1">Address</Label>
                  <Input 
                    id="address1" 
                    value={shippingDetails.address1} 
                    onChange={(e) => setShippingDetails({...shippingDetails, address1: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Street address, P.O. box, company name, c/o"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input 
                    id="address2" 
                    value={shippingDetails.address2} 
                    onChange={(e) => setShippingDetails({...shippingDetails, address2: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={shippingDetails.city} 
                      onChange={(e) => setShippingDetails({...shippingDetails, city: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input 
                      id="state" 
                      value={shippingDetails.state_code} 
                      onChange={(e) => setShippingDetails({...shippingDetails, state_code: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip / Postal Code</Label>
                    <Input 
                      id="zip" 
                      value={shippingDetails.zip} 
                      onChange={(e) => setShippingDetails({...shippingDetails, zip: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country Code</Label>
                    <Input 
                      id="country" 
                      value={shippingDetails.country_code} 
                      onChange={(e) => setShippingDetails({...shippingDetails, country_code: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={shippingDetails.phone} 
                    onChange={(e) => setShippingDetails({...shippingDetails, phone: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              
              {product && (
                <div className="bg-gray-800/50 p-4 rounded-md mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span>${(product.price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shipping (Flat Rate)</span>
                    <span>$5.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Tax (8%)</span>
                    <span>${((product.price * quantity) * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-purple-400">
                      ${((product.price * quantity) * 1.08 + 5).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="border-gray-700 hover:bg-gray-800 text-gray-300">
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToPayment} 
                  disabled={isPlacingOrder}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isPlacingOrder ? "Initializing Payment..." : "Continue to Payment"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                  <CheckoutForm 
                    amount={(product!.price * quantity * 1.08) + 5} 
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setCheckoutStep("shipping")}
                  />
                </Elements>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Thumbnails */}
      {product.images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {product.images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleThumbnailClick(index);
              }}
              className={`
                relative w-20 h-20 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer
                ${activeImageIndex === index ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105' : 'border-gray-800 hover:border-gray-600 opacity-70 hover:opacity-100'}
              `}
            >
              <img 
                src={image} 
                alt={`${product.name} thumbnail ${index + 1}`} 
                className="w-full h-full object-cover pointer-events-none"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

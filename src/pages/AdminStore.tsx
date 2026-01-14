import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "qrcode.react";
import { APP_BASE_PATH } from "app";
import { useAuthStore, User } from "../utils/auth-store";
import { toast } from "sonner";
import { 
  useProductStore, 
  Product, 
  ProductCategory, 
  ProductSize, 
  ProductColor,
  createEmptyProduct,
  FulfillmentSource
} from "../utils/product-store";
import { Trash, Plus, Upload, Eye, Save, Image, Edit, ArrowLeft, Shield, Search, UserPlus, UserCheck, X, Link as LinkIcon, AlertCircle, Calendar, MapPin as MapPinIcon, ScanBarcode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { collection, query, getDocs, where, or, orderBy, limit } from "firebase/firestore";
import { firestore as db } from "../utils/firebase";
import { apiClient } from "app";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import QRCode from "qrcode";
import { PRODUCTION_URL } from "../utils/config";
import { AdminIcebreakers } from "@/components/AdminIcebreakers";
import { useEventStore } from "../utils/event-store";
import { format } from "date-fns";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { AdminActivationCodes } from "@/components/AdminActivationCodes";
import { AdminVeterans } from "@/components/AdminVeterans";
import { useShopifyStore } from "../utils/shopify-store";

export default function AdminStore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, setAdminStatus } = useAuthStore();
  const { 
    products, 
    isLoading,
    error, 
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  } = useProductStore();

  const { 
    events, 
    fetchEvents, 
    deleteEvent 
  } = useEventStore();

  const {
    products: shopifyProducts,
    isLoading: isShopifyLoading,
    fetchProducts: fetchShopifyProducts
  } = useShopifyStore();

  // State for tab selection
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "local");

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // State for product list
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // State for product form
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [showQrOverlay, setShowQrOverlay] = useState(true);
  
  // QR code preview modal
  const [showQrPreviewModal, setShowQrPreviewModal] = useState(false);
  const [qrPreviewImage, setQrPreviewImage] = useState<string | null>(null);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "admin" | "member">("all");
  
  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasCheckedAuth = useRef(false);

  // Check auth and admin status on load
  useEffect(() => {
    // We want this check to run only once on mount.
    if (hasCheckedAuth.current) {
      return;
    }
    hasCheckedAuth.current = true;
    
    const checkAuth = async () => {
      // Wait for the auth store to finish its initial loading
      if (useAuthStore.getState().loading) {
        // We can subscribe to the store's loading state if needed,
        // but for now, we rely on the user object becoming available.
        // A short delay might be a pragmatic initial approach if issues persist.
        return;
      }
      
      const currentUser = useAuthStore.getState().user;
      
      if (!currentUser) {
        navigate("/login");
        return;
      }
      
      // Actively re-validate the user's admin status with the database.
      const isUserAdmin = await useAuthStore.getState().checkAdminStatus();
      
      if (!isUserAdmin) {
        toast.error("You don't have permission to access the admin area");
        navigate("/");
      }
    };
    
    checkAuth();
  }, [navigate]); // Removed 'user' from dependencies to prevent infinite loop

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      await fetchProducts();
    };
    
    loadProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (activeTab === "ninja") {
      fetchShopifyProducts();
    }
  }, [activeTab, fetchShopifyProducts]);

  // Filter products when search query changes
  useEffect(() => {
    if (products.length > 0) {
      let filtered = products;
      
      // Filter by tab source
      if (activeTab === "local") {
        filtered = products.filter(p => !p.fulfillmentSource || p.fulfillmentSource === "local");
      } else if (activeTab === "ninja") {
        filtered = products.filter(p => p.fulfillmentSource === "ninja");
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(product => 
          product.name.toLowerCase().includes(query) || 
          product.description.toLowerCase().includes(query)
        );
      }
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery, activeTab]);
  
  // Load users when user tab is selected
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Load events when events tab is selected
  useEffect(() => {
    if (activeTab === "events") {
      fetchEvents();
    }
  }, [activeTab, fetchEvents]);
  
  // Filter users when search query changes
  useEffect(() => {
    if (users.length > 0) {
      if (userSearchQuery) {
        const query = userSearchQuery.toLowerCase();
        const filtered = users.filter(user => 
          (user.displayName?.toLowerCase().includes(query) || false) || 
          (user.email?.toLowerCase().includes(query) || false)
        );
        setFilteredUsers(filtered);
      } else {
        setFilteredUsers(users);
      }
    }
  }, [users, userSearchQuery]);
  
  // Fetch users from Firestore
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersQuery = query(
        collection(db, "users"),
        orderBy("displayName", "asc"),
        limit(100) // Limit to first 100 users for performance
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const usersData: User[] = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        email: doc.data().email || null,
        displayName: doc.data().displayName || null,
        photoURL: doc.data().photoURL || null,
        isAdmin: doc.data().isAdmin || false,
      }));
      
      setUsers(usersData);
      setFilteredUsers(usersData);
      setLoadingUsers(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoadingUsers(false);
    }
  };
  
  // Toggle admin status for a user
  const toggleAdminStatus = async (userId: string, isAdminValue: boolean) => {
    try {
      await setAdminStatus(userId, isAdminValue);
      
      // Update local state
      const updatedUsers = users.map(u => {
        if (u.uid === userId) {
          return { ...u, isAdmin: isAdminValue };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      setFilteredUsers(prevFiltered => 
        prevFiltered.map(u => {
          if (u.uid === userId) {
            return { ...u, isAdmin: isAdminValue };
          }
          return u;
        })
      );
      
      toast.success(`Admin status ${isAdminValue ? 'granted' : 'revoked'} successfully`);
    } catch (error: any) {
      toast.error(`Failed to update admin status: ${error.message}`);
    }
  };

  // Handle create new product
  const handleCreateProduct = () => {
    const newProduct = createEmptyProduct();
    // Set source based on active tab
    if (activeTab === "ninja") {
      newProduct.fulfillmentSource = "ninja";
    } else {
      newProduct.fulfillmentSource = "local";
    }
    
    setCurrentProduct(newProduct);
    setProductImages([]);
    setImagePreviewUrls([]);
    setIsEditing(true);
    // Don't change tab, just show edit mode within current context
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setProductImages([]);
    setImagePreviewUrls(product.images);
    setIsEditing(true);
  };

  // Handle delete product
  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      const success = await deleteProduct(product.id);
      if (success) {
        toast.success(`Product "${product.name}" deleted successfully.`);
      }
    }
  };

  const handleDeleteEvent = async (event: any) => {
    if (window.confirm(`Are you sure you want to delete event "${event.title}"?`)) {
      try {
        await deleteEvent(event.id);
        toast.success(`Event "${event.title}" deleted successfully.`);
      } catch (error) {
        toast.error("Failed to delete event");
      }
    }
  };

  // State for Ninja POD integration
  const [ninjaTemplates, setNinjaTemplates] = useState<any[]>([]);
  const [isLoadingNinja, setIsLoadingNinja] = useState(false);
  const [ninjaApiKey, setNinjaApiKey] = useState("");

  const processNewImages = (newFiles: File[]) => {
      // Preview the first image with QR code overlay
      const previewImage = newFiles[0];
      if (previewImage) {
        const previewUrl = URL.createObjectURL(previewImage);
        setQrPreviewImage(previewUrl);
        
        // Show QR preview modal
        // setShowQrPreviewModal(true); // Optional: Don't auto-show for every upload if annoying
      }
      
      const updatedFiles = [...productImages, ...newFiles];
      setProductImages(updatedFiles);
      
      // Generate preview URLs
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prevUrls => [...prevUrls, ...newPreviews]);
      
      // Show success message
      toast.success(`${newFiles.length} image${newFiles.length > 1 ? 's' : ''} added successfully.`);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      processNewImages(newFiles);
    }
  };

  const handleGenerateUserQR = async () => {
    if (!user?.uid) {
      toast.error("User not found");
      return;
    }

    try {
      const qrUrl = `${PRODUCTION_URL}/?s=${user.uid}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        },
        errorCorrectionLevel: 'M'
      });

      // Convert Data URL to File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `qr-code-${user.uid}.png`, { type: "image/png" });

      processNewImages([file]);
      toast.success("User QR code generated and added!");
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  // Handle remove image
  const handleRemoveImage = (index: number) => {
    // Remove from files
    const updatedFiles = productImages.filter((_, i) => i !== index);
    setProductImages(updatedFiles);
    
    // Remove from previews
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form change
  const handleFormChange = (field: string, value: any) => {
    if (currentProduct) {
      setCurrentProduct({
        ...currentProduct,
        [field]: value
      });
    }
  };

  // Handle size selection
  const handleSizeToggle = (size: ProductSize) => {
    if (!currentProduct) return;

    const sizes = currentProduct.sizes || [];
    if (sizes.includes(size)) {
      handleFormChange('sizes', sizes.filter(s => s !== size));
    } else {
      handleFormChange('sizes', [...sizes, size]);
    }
  };

  // Handle color selection
  const handleColorChange = (index: number, field: string, value: any) => {
    if (!currentProduct) return;

    const updatedColors = [...(currentProduct.colors || [])];
    if (!updatedColors[index]) {
      updatedColors[index] = { name: "", hex: "" };
    }

    updatedColors[index] = {
      ...updatedColors[index],
      [field]: value
    };

    handleFormChange('colors', updatedColors);
  };

  // Handle add color
  const handleAddColor = () => {
    if (!currentProduct) return;

    const updatedColors = [...(currentProduct.colors || [])];
    updatedColors.push({ name: "", hex: "#000000" });
    handleFormChange('colors', updatedColors);
  };

  // Handle remove color
  const handleRemoveColor = (index: number) => {
    if (!currentProduct) return;

    const updatedColors = [...(currentProduct.colors || [])];
    updatedColors.splice(index, 1);
    handleFormChange('colors', updatedColors);
  };

  // Handle save product
  const handleSaveProduct = async () => {
    if (!currentProduct) return;

    // Validation
    if (!currentProduct.name || !currentProduct.price || currentProduct.sizes.length === 0) {
      toast.error("Please fill in all required fields (name, price, and at least one size)");
      return;
    }

    try {
      let result;

      if (currentProduct.id && currentProduct.id !== "new") {
        // Update existing product
        result = await updateProduct(currentProduct.id, currentProduct, productImages);
        if (result) {
          toast.success(`Product "${currentProduct.name}" updated successfully.`);
        }
      } else {
        // Create new product
        result = await createProduct(currentProduct, productImages);
        if (result) {
          toast.success(`Product "${currentProduct.name}" created successfully.`);
        }
      }

      if (result) {
        // Reset form
        setCurrentProduct(null);
        setProductImages([]);
        setImagePreviewUrls([]);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error saving product. Please try again.");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setCurrentProduct(null);
    setProductImages([]);
    setImagePreviewUrls([]);
    setIsEditing(false);
  };

  const renderProductForm = () => (
    <Card className="bg-gray-900/60 border border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{currentProduct?.id && currentProduct.id !== "new" ? "Edit Product" : "Create New Product"}</CardTitle>
          <Badge variant="outline" className={currentProduct?.fulfillmentSource === "ninja" ? "border-orange-500 text-orange-400" : "border-blue-500 text-blue-400"}>
            {currentProduct?.fulfillmentSource === "ninja" ? "Ninja POD" : "Local Fulfillment"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {currentProduct && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Product Image Upload Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="aspect-square bg-gray-800 rounded-md overflow-hidden relative border border-gray-700">
                  {imagePreviewUrls.length > 0 ? (
                    <>
                      <img 
                        src={imagePreviewUrls[0]} 
                        alt="Product preview" 
                        className="w-full h-full object-cover"
                      />
                      {/* QR Code Overlay Preview */}
                      {showQrOverlay && (
                        <div 
                          className="absolute border-2 border-dashed border-purple-500 bg-purple-500/10 flex items-center justify-center overflow-hidden"
                          style={{
                            top: `${currentProduct.qrCodePlacement?.y || 50}%`,
                            left: `${currentProduct.qrCodePlacement?.x || 50}%`,
                            width: `${currentProduct.qrCodePlacement?.width || 20}%`,
                            aspectRatio: '1/1',
                            transform: `translate(-50%, -50%) rotate(${currentProduct.qrCodePlacement?.rotation || 0}deg)`,
                          }}
                        >
                          <div className="flex flex-col items-center justify-center p-1 text-center">
                            <Shield className="w-4 h-4 text-purple-400 mb-0.5 opacity-75" />
                            <span className="text-[8px] leading-tight text-purple-200 font-medium bg-black/50 px-1 rounded">QR Location</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                      <Image className="h-12 w-12 mb-2 opacity-50" />
                      <span className="text-sm">No image uploaded</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-gray-800 rounded-md overflow-hidden border border-gray-700 group">
                      <img src={url} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                        Img {index + 1}
                      </div>
                      <button 
                        onClick={() => handleRemoveImage(index)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => imageInputRef.current?.click()}
                    className="aspect-square bg-gray-800 rounded-md border border-dashed border-gray-600 flex flex-col gap-1 items-center justify-center hover:bg-gray-700 transition-colors"
                    title="Upload Image"
                  >
                    <Plus className="h-6 w-6 text-gray-400" />
                    <span className="text-[10px] text-gray-400">Upload</span>
                  </button>
                  
                  <button 
                    onClick={handleGenerateUserQR}
                    className="aspect-square bg-gray-800 rounded-md border border-dashed border-purple-500/50 flex flex-col gap-1 items-center justify-center hover:bg-purple-900/20 transition-colors"
                    title="Use User QR Code"
                  >
                    <QRCodeSVG 
                      value="QR" 
                      size={20} 
                      className="text-purple-400"
                      fgColor="currentColor"
                      bgColor="transparent"
                    />
                    <span className="text-[10px] text-purple-400 text-center px-1">Use QR</span>
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                  onClick={(e) => (e.target as HTMLInputElement).value = ""}
                  onChange={handleImageUpload} 
                />
              </div>

              {/* QR Code Placement Controls */}
              <div className="space-y-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm text-gray-300 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-purple-400" />
                    QR Placement
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="show-overlay" className="text-xs text-gray-400 cursor-pointer">Preview</Label>
                    <Switch 
                      id="show-overlay"
                      checked={showQrOverlay}
                      onCheckedChange={setShowQrOverlay}
                      className="scale-75 data-[state=checked]:bg-purple-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <Label className="text-xs">Horizontal Position (X)</Label>
                      <span>{currentProduct.qrCodePlacement?.x || 50}%</span>
                    </div>
                    <Slider 
                      value={[currentProduct.qrCodePlacement?.x || 50]} 
                      min={0} 
                      max={100} 
                      step={1}
                      onValueChange={(val) => handleFormChange('qrCodePlacement', { ...currentProduct.qrCodePlacement, x: val[0] })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <Label className="text-xs">Vertical Position (Y)</Label>
                      <span>{currentProduct.qrCodePlacement?.y || 50}%</span>
                    </div>
                    <Slider 
                      value={[currentProduct.qrCodePlacement?.y || 50]} 
                      min={0} 
                      max={100} 
                      step={1}
                      onValueChange={(val) => handleFormChange('qrCodePlacement', { ...currentProduct.qrCodePlacement, y: val[0] })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <Label className="text-xs">Size (Width)</Label>
                      <span>{currentProduct.qrCodePlacement?.width || 20}%</span>
                    </div>
                    <Slider 
                      value={[currentProduct.qrCodePlacement?.width || 20]} 
                      min={5} 
                      max={50} 
                      step={1}
                      onValueChange={(val) => handleFormChange('qrCodePlacement', { ...currentProduct.qrCodePlacement, width: val[0] })}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <Label className="text-xs">Rotation</Label>
                      <span>{currentProduct.qrCodePlacement?.rotation || 0}°</span>
                    </div>
                    <Slider 
                      value={[currentProduct.qrCodePlacement?.rotation || 0]} 
                      min={-180} 
                      max={180} 
                      step={5}
                      onValueChange={(val) => handleFormChange('qrCodePlacement', { ...currentProduct.qrCodePlacement, rotation: val[0] })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input 
                    id="name" 
                    value={currentProduct.name} 
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g. Classic QR T-Shirt"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={currentProduct.price} 
                    onChange={(e) => handleFormChange('price', parseFloat(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={currentProduct.category} 
                  onValueChange={(val) => handleFormChange('category', val)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.values(ProductCategory).map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={currentProduct.description} 
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Product description..."
                  className="bg-gray-800 border-gray-700 min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Available Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(ProductSize).filter(size => {
                    const isStickerSize = ["3x3", "4x4", "6x6", "9x9"].includes(size);
                    // If Ninja source, only show sticker sizes
                    if (currentProduct.fulfillmentSource === "ninja") {
                      return isStickerSize;
                    }
                    // If not Ninja, show all sizes (or maybe exclude sticker sizes if preferred, but let's keep it flexible for local)
                    return true;
                  }).map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={currentProduct.sizes.includes(size) ? "default" : "outline"}
                      onClick={() => handleSizeToggle(size)}
                      className={currentProduct.sizes.includes(size) ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700 text-gray-400"}
                      size="sm"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Colors</Label>
                <div className="space-y-2">
                  {currentProduct.colors.map((color, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: color.hex }}></div>
                      <Input 
                        value={color.name} 
                        onChange={(e) => handleColorChange(index, 'name', e.target.value)}
                        placeholder="Color Name"
                        className="bg-gray-800 border-gray-700 flex-1"
                      />
                      <Input 
                        type="color"
                        value={color.hex} 
                        onChange={(e) => handleColorChange(index, 'hex', e.target.value)}
                        className="w-12 h-10 p-1 bg-gray-800 border-gray-700 cursor-pointer"
                      />
                      
                      <Select
                        value={color.imageIndex !== undefined ? color.imageIndex.toString() : "none"}
                        onValueChange={(val) => handleColorChange(index, 'imageIndex', val === "none" ? undefined : parseInt(val))}
                      >
                        <SelectTrigger className="w-[100px] bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Image" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="none">No Image</SelectItem>
                          {imagePreviewUrls.map((_, imgIdx) => (
                            <SelectItem key={imgIdx} value={imgIdx.toString()}>
                              Image {imgIdx + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveColor(index)}
                        className="text-gray-400 hover:text-red-400"
                        disabled={currentProduct.colors.length <= 1}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddColor}
                    className="mt-2 border-gray-700 text-gray-400"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Color
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                  <div className="space-y-0.5">
                    <Label className="text-base">Featured</Label>
                    <p className="text-xs text-gray-400">Show on home page</p>
                  </div>
                  <Switch 
                    checked={currentProduct.featured} 
                    onCheckedChange={(val) => handleFormChange('featured', val)} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                  <div className="space-y-0.5">
                    <Label className="text-base">In Stock</Label>
                    <p className="text-xs text-gray-400">Available for purchase</p>
                  </div>
                  <Switch 
                    checked={currentProduct.inStock} 
                    onCheckedChange={(val) => handleFormChange('inStock', val)} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
        <Button onClick={handleSaveProduct} className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" />
          Save Product
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container px-4 py-8 mx-auto min-h-screen bg-black text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2"
                onClick={() => navigate("/store")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-gray-400">
              Manage users, events, products, and view analytics
            </p>
          </div>

          <Button 
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={handleCreateProduct}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="bg-gray-900 border border-gray-700 w-full overflow-x-auto flex justify-start">
            <TabsTrigger value="local" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Local Products
            </TabsTrigger>
            <TabsTrigger value="ninja" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Ninja POD
            </TabsTrigger>
            <TabsTrigger value="demo" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Example Products
            </TabsTrigger>
            <TabsTrigger value="missions" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Icebreakers
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Events
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Users
            </TabsTrigger>
            <TabsTrigger value="activation" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Activation Codes
            </TabsTrigger>
            <TabsTrigger value="veterans" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Military & Vets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Manage Local Products Tab */}
          <TabsContent value="local" className="space-y-6">
            {isEditing && activeTab === "local" ? (
              renderProductForm()
            ) : (
              /* Product List View */
              <Card className="bg-gray-900/60 border border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle>Local Product Catalog</CardTitle>
                  <CardDescription className="text-gray-400">Manage your product inventory stored in Firestore</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search local products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8"><p className="text-gray-400">Loading products...</p></div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="grid gap-4">
                      {filteredProducts.map(product => (
                        <Card key={product.id} className="bg-gray-800/40 border-gray-700 overflow-hidden">
                          <div className="flex flex-col sm:flex-row">
                            <div className="w-full sm:w-40 h-40 bg-gray-900">
                              {product.images && product.images.length > 0 ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600"><Image className="h-12 w-12" /></div>
                              )}
                            </div>
                            <div className="flex-1 p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h3 className="text-lg font-semibold">{product.name}</h3>
                                    <p className="text-gray-400 text-sm mb-2">{product.category}</p>
                                  </div>
                                  <div className="text-lg font-bold text-purple-400">${product.price.toFixed(2)}</div>
                                </div>
                                <p className="text-gray-300 text-sm">{product.description}</p>
                              </div>
                              <div className="flex justify-between items-center mt-4">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" className="border-purple-500 text-purple-400 hover:bg-purple-500/10" onClick={() => handleEditProduct(product)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                                <Button variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteProduct(product)}>
                                  <Trash className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 mb-4">No local products found</p>
                      <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10" onClick={handleCreateProduct}>
                        <Plus className="h-5 w-5 mr-2" />
                        Add Your First Product
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Ninja POD Tab - Placeholder for future admin integration */}
          <TabsContent value="ninja" className="space-y-6">
             <Card className="bg-gray-900/60 border border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Ninja POD Integration</CardTitle>
                    <CardDescription className="text-gray-400">Manage your connected Shopify store products</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10">
                    Connected to Shopify
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="flex flex-col gap-6">
                   <div className="flex justify-between items-center bg-gray-800/40 p-4 rounded-lg border border-gray-700">
                     <p className="text-gray-300 text-sm">
                       Your Shopify store is connected via the Ninja POD integration. 
                       Products below are synced from your Shopify store. 
                       Full management is handled in your Shopify admin dashboard.
                     </p>
                     <Button 
                       onClick={() => window.open("https://admin.shopify.com", "_blank")}
                       className="bg-[#95BF47] hover:bg-[#85AB3E] text-white shrink-0 ml-4"
                     >
                       Go to Shopify Admin
                     </Button>
                   </div>

                   {isShopifyLoading ? (
                     <div className="text-center py-12 text-gray-400">Loading Shopify products...</div>
                   ) : shopifyProducts.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {shopifyProducts.map((prod) => (
                         <Card key={prod.id} className="bg-gray-800/40 border-gray-700 overflow-hidden flex flex-col">
                           <div className="aspect-video bg-gray-900 w-full relative">
                             {prod.featuredImage ? (
                               <img 
                                 src={prod.featuredImage.url} 
                                 alt={prod.featuredImage.altText || prod.title} 
                                 className="w-full h-full object-cover"
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-600">
                                 <Image className="h-8 w-8" />
                               </div>
                             )}
                             <div className="absolute top-2 right-2">
                               <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm">
                                 Shopify
                               </Badge>
                             </div>
                           </div>
                           <CardContent className="p-4 flex-1 flex flex-col">
                             <h4 className="font-semibold text-white mb-1 line-clamp-1">{prod.title}</h4>
                             <p className="text-sm text-gray-400 mb-3 line-clamp-2">{prod.description}</p>
                             <div className="mt-auto flex justify-between items-center">
                                <span className="text-purple-400 font-bold">
                                  {prod.variants[0]?.price?.amount ? `$${prod.variants[0].price.amount}` : "Price Varies"}
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => window.open(`https://admin.shopify.com/products/${prod.id.split('/').pop()}`, "_blank")}>
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </Button>
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg">
                       <p className="text-gray-400">No products found in connected Shopify store.</p>
                     </div>
                   )}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Products Tab */}
          <TabsContent value="demo" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {useProductStore.getState().mockProducts?.map((product) => (
                <Card key={product.id} className="bg-gray-800/40 border-gray-700">
                  <div className="aspect-square bg-gray-900 relative">
                    <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                    <Badge className="absolute top-2 right-2 bg-purple-600">Demo</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>${product.price}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">{product.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Icebreakers Tab */}
          <TabsContent value="missions" className="space-y-6">
            <AdminIcebreakers />
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Events</h2>
              <Button onClick={() => navigate("/create-event")} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" /> Create Event
              </Button>
            </div>

            {useEventStore.getState().isLoading ? (
              <div className="text-center py-8"><p className="text-gray-400">Loading events...</p></div>
            ) : events.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Card key={event.id} className="bg-gray-800/40 border-gray-700 overflow-hidden">
                    <div className="aspect-video bg-gray-900 relative">
                      {event.imageURL ? (
                        <img src={event.imageURL} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Calendar className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80" onClick={() => navigate(`/edit-event?id=${event.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteEvent(event)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg truncate pr-2">{event.title}</CardTitle>
                        <Badge variant="outline" className="shrink-0">{event.isPublic ? 'Public' : 'Private'}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                      </CardDescription>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPinIcon className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-900/40 rounded-lg border border-gray-800">
                <p className="text-gray-400 mb-4">No events found</p>
                <Button variant="outline" onClick={() => navigate("/create-event")}>Create Your First Event</Button>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-gray-900/60 border border-gray-800">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription className="text-gray-400">Manage registered users and admin permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search users by name or email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-9 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                  <ToggleGroup type="single" value={userFilter} onValueChange={(val) => val && setUserFilter(val as any)}>
                    <ToggleGroupItem value="all" aria-label="All users">All</ToggleGroupItem>
                    <ToggleGroupItem value="admin" aria-label="Admins only">Admins</ToggleGroupItem>
                    <ToggleGroupItem value="member" aria-label="Members only">Members</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-8"><p className="text-gray-400">Loading users...</p></div>
                ) : (
                  <div className="rounded-md border border-gray-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-800/50">
                        <TableRow className="border-gray-800 hover:bg-transparent">
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers
                            .filter(u => {
                              if (userFilter === "admin") return u.isAdmin;
                              if (userFilter === "member") return !u.isAdmin;
                              return true;
                            })
                            .map((u) => (
                            <TableRow key={u.uid} className="border-gray-800 hover:bg-gray-800/30">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  {/* Avatar placeholder */}
                                  <div className="h-8 w-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs">
                                    {u.photoURL ? (
                                      <img src={u.photoURL} alt={u.displayName || "User"} className="h-full w-full object-cover" />
                                    ) : (
                                      (u.displayName || "??").substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <span>{u.displayName || "No Name"}</span>
                                </div>
                              </TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>
                                {u.isAdmin ? (
                                  <Badge className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/50">Admin</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-400 border-gray-700">Member</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {u.uid !== user?.uid && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => toggleAdminStatus(u.uid, !u.isAdmin)}
                                      title={u.isAdmin ? "Revoke Admin" : "Make Admin"}
                                    >
                                      {u.isAdmin ? (
                                        <UserCheck className="h-4 w-4 text-green-400" />
                                      ) : (
                                        <UserPlus className="h-4 w-4 text-gray-400" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activation Codes Tab */}
          <TabsContent value="activation" className="space-y-6">
            <AdminActivationCodes />
          </TabsContent>

          {/* Veterans Verification Tab */}
          <TabsContent value="veterans" className="space-y-6">
            <AdminVeterans />
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* QR Preview Modal */}
      {showQrPreviewModal && qrPreviewImage && currentProduct && (
        <Dialog open={showQrPreviewModal} onOpenChange={setShowQrPreviewModal}>
          <DialogContent className="bg-gray-900 border border-gray-800 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">QR Code Preview</DialogTitle>
              <DialogDescription className="text-gray-400">
                Here's how your photo will look with a QR code overlay
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Image */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-300">Original Photo</h3>
                <div className="aspect-square bg-gray-800 rounded-md overflow-hidden">
                  {qrPreviewImage && (
                    <img 
                      src={qrPreviewImage} 
                      alt="Original image" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              
              {/* With QR Code */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-300">With QR Code</h3>
                <div className="aspect-square bg-gray-800 rounded-md overflow-hidden relative">
                  {qrPreviewImage && (
                    <>
                      <img 
                        src={qrPreviewImage} 
                        alt="With QR code" 
                        className="w-full h-full object-cover"
                      />
                      <div 
                        className="absolute transition-all duration-200"
                        style={{
                          top: `${currentProduct.qrCodePlacement?.y || 50}%`,
                          left: `${currentProduct.qrCodePlacement?.x || 50}%`,
                          width: `${currentProduct.qrCodePlacement?.width || 20}%`,
                          aspectRatio: '1/1',
                          transform: `translate(-50%, -50%) rotate(${currentProduct.qrCodePlacement?.rotation || 0}deg)`,
                        }}
                      >
                        <QRCodeSVG 
                          value={`${window.location.origin}${APP_BASE_PATH}/add-friend?id=${user?.uid || 'example'}`} 
                          size={1000} 
                          className="w-full h-auto"
                          fgColor="#000000"
                          bgColor="#FFFFFF"
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-400">
              <p>Tips for optimal results:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Photos with clear backgrounds or solid colors work best</li>
                <li>High contrast images help the QR code stand out</li>
                <li>You can adjust the QR code size, position, and rotation after upload</li>
              </ul>
            </div>
            
            <DialogFooter>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => setShowQrPreviewModal(false)}
              >
                Continue to Customize
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

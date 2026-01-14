import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { useMarketplaceStore, MarketplaceProduct } from "../utils/marketplace-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, User, Tag, Calendar, MapPin, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, CheckCircle } from "lucide-react";

export default function MarketplaceProductDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("id");
  
  const { user } = useAuthStore();
  const { fetchProductById, deleteProduct, markAsSold, isLoading } = useMarketplaceStore();
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (!productId) {
      navigate("/marketplace");
      return;
    }
    
    const loadProduct = async () => {
      const data = await fetchProductById(productId);
      if (data) {
        setProduct(data);
      }
    };
    
    loadProduct();
    setPageUrl(window.location.href);
  }, [productId, navigate, fetchProductById]);

  const handleDelete = async () => {
    if (!product) return;
    if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      await deleteProduct(product.id);
      navigate("/marketplace");
    }
  };

  const handleMarkSold = async () => {
    if (!product) return;
    if (confirm("Mark this item as sold?")) {
      await markAsSold(product.id);
      // Refresh local product state
      setProduct(prev => prev ? { ...prev, isSold: true } : null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.title,
          text: `Check out this ${product?.title} on ScanMe Classifieds!`,
          url: pageUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(pageUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <Button onClick={() => navigate("/marketplace")} variant="outline">Back to Classifieds</Button>
      </div>
    );
  }

  const isOwner = user?.uid === product.sellerId;
  const isAdmin = user?.isAdmin || false;

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 hover:text-white pl-0 hover:bg-transparent"
          onClick={() => navigate("/marketplace")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Classifieds
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl relative">
               {product.isSold && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-red-600 text-white px-8 py-3 text-4xl font-bold transform -rotate-12 border-4 border-white shadow-2xl opacity-90">
                      SOLD
                    </div>
                  </div>
               )}
               {product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.title}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/600x400/1f2937/ffffff?text=Image+Not+Found";
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                    No Image Available
                  </div>
                )}
            </div>
            
            {/* Product Description */}
            <div className="bg-gray-900/40 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Description</h3>
              <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
              
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-800">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Category</span>
                  <span className="text-sm font-medium flex items-center"><Tag className="w-3 h-3 mr-1 text-purple-400"/> {product.category}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Condition</span>
                  <span className="text-sm font-medium flex items-center"><ShieldCheck className="w-3 h-3 mr-1 text-green-400"/> {product.condition.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Listed</span>
                  <span className="text-sm font-medium flex items-center"><Calendar className="w-3 h-3 mr-1 text-blue-400"/> {format(product.createdAt, 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details & Seller */}
          <div className="space-y-6">
            <Card className="bg-gray-900/60 border-gray-800 backdrop-blur-xl sticky top-24">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{product.title}</h1>
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                      ${product.price}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleShare} className="text-gray-400 hover:text-white">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* Owner Actions */}
                {isOwner && (
                  <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                    <h3 className="font-semibold text-purple-200 mb-3">Manage Listing</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {!product.isSold ? (
                        <Button 
                          onClick={handleMarkSold}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Mark Sold
                        </Button>
                      ) : (
                        <Button disabled variant="secondary" className="bg-gray-700 text-gray-400 cursor-not-allowed">
                          Already Sold
                        </Button>
                      )}
                      <Button 
                        onClick={handleDelete}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Actions (for non-owners) */}
                {!isOwner && isAdmin && (
                  <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h3 className="font-semibold text-red-200 mb-3 flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2"/> Admin Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {!product.isSold ? (
                        <Button 
                          onClick={handleMarkSold}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Mark Sold
                        </Button>
                      ) : (
                        <Button disabled variant="secondary" className="bg-gray-700 text-gray-400 cursor-not-allowed">
                          Already Sold
                        </Button>
                      )}
                      <Button 
                        onClick={handleDelete}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                )}

                {/* Seller Info (Show for everyone except owner) */}
                {!isOwner && (
                  <>
                    <div 
                      className="flex items-center p-3 bg-gray-800/50 rounded-lg mb-6 cursor-pointer hover:bg-gray-800 transition-colors"
                      onClick={() => navigate(`/member?id=${product.sellerId}`)}
                    >
                      <Avatar className="h-12 w-12 mr-3 border border-gray-700">
                        <AvatarImage src={product.sellerPhotoURL} />
                        <AvatarFallback className="bg-purple-900 text-purple-200">
                          {product.sellerName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 mb-0.5">Sold by</p>
                        <p className="font-semibold text-white flex items-center">
                          {product.sellerName}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                        View Profile
                      </Button>
                    </div>
                    
                    <Button 
                      className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-6 text-lg mb-4"
                      onClick={() => navigate(`/member?id=${product.sellerId}`)}
                    >
                      Contact Seller
                    </Button>
                  </>
                )}

                <div className="text-center text-xs text-gray-500 mb-6">
                  Transactions are handled directly between users. ScanMe is not responsible for payments or shipping.
                </div>
                
                {/* QR Code */}
                <div className="bg-white p-6 rounded-xl flex flex-col items-center text-center mt-8">
                  <div className="transform rotate-45 my-6 p-2 bg-white">
                    <QRCodeSVG 
                      value={pageUrl} 
                      size={150}
                      level="M"
                      className="mb-0"
                    />
                  </div>
                  <p className="text-black font-medium text-sm mt-8">Scan to view on phone</p>
                  <p className="text-gray-500 text-xs mt-1">Share this item with friends nearby</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

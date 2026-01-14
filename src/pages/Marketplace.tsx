import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketplaceStore, MarketplaceProduct } from "../utils/marketplace-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Tag, ShoppingBag, Loader2 } from "lucide-react";

export default function Marketplace() {
  const navigate = useNavigate();
  const { fetchAllProducts, isLoading } = useMarketplaceStore();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<MarketplaceProduct[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await fetchAllProducts();
      setProducts(data);
      setFilteredProducts(data);
    };
    loadProducts();
  }, [fetchAllProducts]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = products.filter(p => 
        p.title.toLowerCase().includes(lowerQuery) || 
        p.description.toLowerCase().includes(lowerQuery)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-4 pb-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Community Classifieds
            </h1>
            <p className="text-gray-400 text-lg">
              Discover unique items from the ScanMe community
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              onClick={() => navigate("/store")}
            >
              Visit Official Store
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => navigate("/seller-dashboard")}
            >
              Sell Items
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-12">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
          <Input
            placeholder="Search items..."
            className="pl-10 bg-gray-900 border-gray-800 h-12 rounded-full focus:ring-purple-500 focus:border-purple-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400">No items found</h3>
            <p className="text-gray-600 mt-2">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="bg-gray-900/40 border-gray-800 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => navigate(`/marketplace-product?id=${product.id}`)}
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-gray-800">
                  {product.images[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/400x400/1f2937/ffffff?text=Image+Not+Found";
                        e.currentTarget.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-black/60 backdrop-blur-md hover:bg-black/70 border-none">
                      ${product.price}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg truncate mb-1 text-gray-100 group-hover:text-purple-400 transition-colors">{product.title}</h3>
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <span className="flex items-center mr-3">
                      <Tag className="h-3 w-3 mr-1" /> {product.category}
                    </span>
                    <span>{product.condition.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center mt-2 pt-2 border-t border-gray-800/50">
                    {product.sellerPhotoURL ? (
                      <img src={product.sellerPhotoURL} alt={product.sellerName} className="h-5 w-5 rounded-full mr-2 object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-purple-900 mr-2 flex items-center justify-center text-[10px]">{product.sellerName[0]}</div>
                    )}
                    <span className="text-xs text-gray-400 truncate">Sold by {product.sellerName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

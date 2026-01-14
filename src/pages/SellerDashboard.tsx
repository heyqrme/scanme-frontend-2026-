import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { useMarketplaceStore, ProductCondition } from "../utils/marketplace-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Tag, Image as ImageIcon, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sellerProducts, fetchSellerProducts, createProduct, deleteProduct, markAsSold, isLoading } = useMarketplaceStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<ProductCondition>(ProductCondition.GOOD);
  const [category, setCategory] = useState("general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchSellerProducts(user.uid);
  }, [user, navigate, fetchSellerProducts]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !imageFile) {
      toast.error("Please fill in all required fields (Title, Price, Image)");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProduct({
        title,
        description,
        price: parseFloat(price),
        currency: "USD",
        condition,
        category,
        tags: []
      }, [imageFile]);
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPrice("");
    setDescription("");
    setCondition(ProductCondition.GOOD);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-gray-900 text-white pt-20 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="h-8 w-8 text-gray-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Seller Dashboard
              </h1>
            </div>
            <p className="text-gray-400 ml-10">Manage your listings and sales</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-900/20">
                <Plus className="mr-2 h-4 w-4" /> List New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>List an Item for Sale</DialogTitle>
                <DialogDescription>
                  Create a listing for your product. It will be visible in the Classifieds section immediately.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Product Image (Required)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors overflow-hidden relative">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-8 h-8 mb-3 text-gray-400" />
                          <p className="text-sm text-gray-500">Click to upload image</p>
                        </div>
                      )}
                      <input 
                        id="image-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onClick={(e) => (e.target as HTMLInputElement).value = ""}
                        onChange={handleImageChange} 
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Vintage Denim Jacket" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="price" 
                        type="number" 
                        placeholder="0.00" 
                        min="0" 
                        step="0.01"
                        value={price} 
                        onChange={e => setPrice(e.target.value)}
                        className="pl-9 bg-gray-800 border-gray-700"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={condition} onValueChange={(v) => setCondition(v as ProductCondition)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value={ProductCondition.NEW}>New</SelectItem>
                        <SelectItem value={ProductCondition.LIKE_NEW}>Like New</SelectItem>
                        <SelectItem value={ProductCondition.GOOD}>Good</SelectItem>
                        <SelectItem value={ProductCondition.FAIR}>Fair</SelectItem>
                        <SelectItem value={ProductCondition.POOR}>Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe your item..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    className="bg-gray-800 border-gray-700 min-h-[100px]"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    List Item
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Inventory List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          </div>
        ) : sellerProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
            <Tag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300">No listings yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Start selling by listing your first item. It only takes a minute!</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
              Create First Listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sellerProducts.map((product) => (
              <Card key={product.id} className="bg-gray-900/60 border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors group">
                <div className="aspect-square relative overflow-hidden bg-gray-800">
                  {product.images[0] && (
                    <img 
                      src={product.images[0]} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/400x400/1f2937/ffffff?text=Image+Not+Found";
                        e.currentTarget.onerror = null;
                      }}
                    />
                  )}
                  {product.isSold && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Badge className="bg-red-600 hover:bg-red-700 text-lg px-4 py-1">SOLD</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-none">
                      {product.condition.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg truncate flex-1 mr-2" title={product.title}>{product.title}</h3>
                    <span className="font-bold text-green-400">${product.price}</span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 h-10 mb-3">{product.description}</p>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Tag className="h-3 w-3 mr-1" /> {product.category}
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0 flex gap-2">
                  {!product.isSold ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-gray-700 hover:bg-gray-800 hover:text-white"
                      onClick={() => markAsSold(product.id)}
                    >
                      Mark Sold
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="flex-1 cursor-default opacity-50" disabled>Sold</Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this listing?")) {
                        deleteProduct(product.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

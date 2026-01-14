import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthStore } from "../utils/auth-store";
import { doc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { firestore as db } from "../utils/firebase";

// Order status types
enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  FAILED = "failed",
  CANCELED = "canceled",
  FULFILLED = "fulfilled",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  IN_PROGRESS = "in_progress",
}

// Order interface
interface Order {
  id: string;
  external_id: string;
  status: OrderStatus;
  created: string;
  shipping: {
    name: string;
    service: string;
    price: number;
  };
  recipient: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  items: OrderItem[];
  costs: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  };
  tracking_number?: string;
  tracking_url?: string;
  fulfillmentSource?: "local" | "ninja";
}

// Order item interface
interface OrderItem {
  id: string;
  external_id?: string;
  variant_id: number;
  quantity: number;
  price: number;
  name: string;
  files?: {
    type: string;
    url: string;
  }[];
}

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [indexError, setIndexError] = useState<string | null>(null);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.external_id.toLowerCase().includes(query) ||
      order.recipient.name.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query)
    );

    setFilteredOrders(filtered);
  }, [searchQuery, orders]);

  // Handle tab change
  useEffect(() => {
    if (activeTab === "all") {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => {
        if (activeTab === "active") {
          return [
            OrderStatus.PENDING, 
            OrderStatus.IN_PROGRESS
          ].includes(order.status as OrderStatus);
        }
        if (activeTab === "completed") {
          return order.status === OrderStatus.FULFILLED;
        }
        if (activeTab === "canceled") {
          return [
            OrderStatus.CANCELED, 
            OrderStatus.FAILED
          ].includes(order.status as OrderStatus);
        }
        return true;
      });
      setFilteredOrders(filtered);
    }
  }, [activeTab, orders]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("created", "desc")
        );

        const querySnapshot = await getDocs(ordersQuery);
        const ordersList: Order[] = [];

        querySnapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as Order);
        });

        setOrders(ordersList);
        setFilteredOrders(ordersList);
        setIndexError(null);
      } catch (error) {
        console.error("Error fetching orders:", error);
        
        // Check for specific Firestore index error
        if (error instanceof Error && error.message.includes("requires an index")) {
          // Extract the index creation URL from the error message
          const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[\/\w\d\?\=\-\&\.\%]+/);
          if (urlMatch && urlMatch[0]) {
            setIndexError(urlMatch[0]);
          }
        }
        
        toast.error("Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // Map status to display text and badge variant
  const getStatusDisplayData = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DRAFT:
        return { text: "Draft", variant: "outline", class: "bg-gray-500/20 text-gray-300 border-gray-500/50" };
      case OrderStatus.PENDING:
        return { text: "Pending", variant: "outline", class: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" };
      case OrderStatus.IN_PROGRESS:
        return { text: "In Progress", variant: "outline", class: "bg-blue-500/20 text-blue-300 border-blue-500/50" };
      case OrderStatus.FULFILLED:
        return { text: "Fulfilled", variant: "default", class: "bg-green-500/20 text-green-300 border-green-500/50" };
      case OrderStatus.PARTIALLY_FULFILLED:
        return { text: "Partially Fulfilled", variant: "outline", class: "bg-green-500/20 text-green-300 border-green-500/50" };
      case OrderStatus.FAILED:
        return { text: "Failed", variant: "destructive", class: "bg-red-500/20 text-red-300 border-red-500/50" };
      case OrderStatus.CANCELED:
        return { text: "Canceled", variant: "destructive", class: "bg-gray-500/20 text-gray-300 border-gray-500/50" };
      default:
        return { text: status, variant: "outline", class: "" };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // View order details
  const viewOrderDetails = (orderId: string) => {
    navigate(`/order-detail?id=${orderId}`);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          My Orders
        </h1>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-900/60 border border-gray-800 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-1/3 bg-gray-800 mb-4" />
                    <Skeleton className="h-4 w-1/2 bg-gray-800 mb-2" />
                    <Skeleton className="h-4 w-1/4 bg-gray-800 mb-4" />
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-8 w-24 bg-gray-800" />
                    </div>
                  </div>
                  <div className="md:text-right">
                    <Skeleton className="h-6 w-24 md:ml-auto bg-gray-800 mb-2" />
                    <Skeleton className="h-4 w-16 md:ml-auto bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto min-h-screen bg-black text-white">
      <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
        My Orders
      </h1>
      
      {indexError && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-950/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-yellow-300 mb-2">Database Index Required</h3>
            <p className="text-gray-300 mb-4">
              We need to create a special index in our database to sort your orders properly. This is a one-time setup.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                If you're an administrator, please click the button below to create the required index:
              </p>
              <Button 
                variant="outline" 
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => window.open(indexError, '_blank')}
              >
                Create Required Index
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-gray-900 border border-gray-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              All Orders
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Active
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Completed
            </TabsTrigger>
            <TabsTrigger value="canceled" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              Canceled
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="w-full md:w-auto md:min-w-[250px]">
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white"
          />
        </div>
      </div>

      {/* Orders list */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const statusData = getStatusDisplayData(order.status as OrderStatus);
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="bg-gray-900/60 border border-gray-800 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer"
                  onClick={() => viewOrderDetails(order.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">Order #{order.external_id}</h3>
                          <Badge className={statusData.class}>
                            {statusData.text}
                          </Badge>
                          {order.fulfillmentSource === "ninja" && (
                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/50">
                              Ninja POD
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-400 mb-1">
                          {formatDate(order.created)}
                        </p>
                        
                        <p className="text-gray-400 mb-3">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                        
                        {order.tracking_number && (
                          <div className="mt-3">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                              Tracking: {order.tracking_number}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="md:text-right">
                        <p className="text-xl font-bold text-purple-400">
                          {formatPrice(order.costs.total)}
                        </p>
                        <p className="text-sm text-gray-400">
                          {order.shipping.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex justify-end">
                    <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                      View Details →
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-800 rounded-lg bg-gray-900/40">
          <h3 className="text-xl font-semibold mb-2 text-gray-300">
            {user ? 'No orders found' : 'Please log in to view your orders'}
          </h3>
          <p className="text-gray-500 mb-6">
            {user 
              ? searchQuery 
                ? 'Try adjusting your search criteria'
                : 'When you place an order, it will appear here'
              : 'You need to be logged in to see your order history'
            }
          </p>
          
          {user ? (
            searchQuery ? (
              <Button 
                variant="outline" 
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            ) : (
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => navigate("/store")}
              >
                Shop Now
              </Button>
            )
          ) : (
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => navigate("/login")}
            >
              Log In
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

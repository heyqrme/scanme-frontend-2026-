import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { apiClient } from "app";
import { CheckoutForm } from "@/components/CheckoutForm";
import { toast } from "sonner";
import { TicketIcon } from "lucide-react";

interface BuyTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    price: number;
    date: Date | string;
  };
  onSuccess: () => void;
}

export function BuyTicketDialog({ open, onOpenChange, event, onSuccess }: BuyTicketDialogProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"quantity" | "payment">("quantity");

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
    
    if (open) {
      loadStripeKey();
    }
  }, [open]);

  const handleCreateIntent = async () => {
    setLoading(true);
    try {
      const response = await apiClient.create_ticket_payment_intent({
        eventId: event.id,
        quantity: quantity
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (error) {
      console.error("Failed to create payment intent:", error);
      toast.error("Failed to start payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setLoading(true);
    try {
      await apiClient.confirm_ticket_purchase({
        paymentIntentId,
        eventId: event.id,
        quantity
      });
      toast.success("Tickets purchased successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to confirm purchase:", error);
      toast.error("Payment succeeded but ticket issuance failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = event.price * quantity;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        // Reset state on close
        setStep("quantity");
        setClientSecret("");
        setQuantity(1);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Get Tickets</DialogTitle>
          <DialogDescription>
            {event.title}
          </DialogDescription>
        </DialogHeader>

        {step === "quantity" ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="font-medium text-white">General Admission</p>
                <p className="text-sm text-gray-400">${event.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 border-gray-600"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 border-gray-600"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= 10}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-bold pt-4 border-t border-gray-800">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-6"
              onClick={handleCreateIntent}
              disabled={loading}
            >
              {loading ? "Processing..." : `Checkout $${totalAmount.toFixed(2)}`}
            </Button>
          </div>
        ) : (
          <div className="py-4">
            {clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <CheckoutForm 
                  amount={totalAmount} 
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setStep("quantity")}
                />
              </Elements>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

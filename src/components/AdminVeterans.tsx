import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "app";
import { Check, X, ExternalLink, Eye, Clock } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface VeteranRequest {
  user_id: string;
  display_name: string;
  email: string;
  proof_url: string;
  submitted_at: string;
}

export function AdminVeterans() {
  const [requests, setRequests] = useState<VeteranRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VeteranRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get_pending_requests();
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        toast.error("Failed to fetch pending requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Error loading verification requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: VeteranRequest) => {
    if (!confirm(`Are you sure you want to approve ${request.display_name}?`)) return;
    
    setIsProcessing(true);
    try {
      const response = await apiClient.review_request({
        user_id: request.user_id,
        action: "approve"
      });
      
      if (response.ok) {
        toast.success(`Verified ${request.display_name} successfully`);
        // Remove from list
        setRequests(prev => prev.filter(r => r.user_id !== request.user_id));
        if (selectedRequest?.user_id === request.user_id) setSelectedRequest(null);
      } else {
        toast.error("Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      const response = await apiClient.review_request({
        user_id: selectedRequest.user_id,
        action: "reject",
        reason: rejectionReason || "Document does not meet requirements"
      });
      
      if (response.ok) {
        toast.success(`Rejected request for ${selectedRequest.display_name}`);
        setRequests(prev => prev.filter(r => r.user_id !== selectedRequest.user_id));
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason("");
      } else {
        toast.error("Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/60 border border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Military & Vets Verifications
            <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-400 border-yellow-800">
              {requests.length} Pending
            </Badge>
          </CardTitle>
          <CardDescription>
            Review proof of service documents. Ensure PII is redacted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Check className="w-12 h-12 mx-auto mb-2 opacity-20" />
              No pending verification requests
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.user_id} className="border-gray-800 hover:bg-gray-800/30">
                    <TableCell>
                      <div>
                        <div className="font-medium">{req.display_name}</div>
                        <div className="text-xs text-gray-400">{req.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                         {/* Simple date display */}
                         {new Date(req.submitted_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setSelectedRequest(req)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest && !showRejectDialog} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              Reviewing proof for {selectedRequest?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <div className="bg-black/50 rounded-lg p-2 border border-gray-800 mb-4 flex justify-center">
              {selectedRequest?.proof_url && (
                <div className="relative">
                  <img 
                    src={selectedRequest.proof_url} 
                    alt="Proof of Service" 
                    className="max-h-[60vh] object-contain rounded" 
                  />
                  <a 
                    href={selectedRequest.proof_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 bg-black/80 text-white p-2 rounded-full hover:bg-black"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
            
            <div className="bg-yellow-900/10 border border-yellow-900/30 p-3 rounded text-sm text-yellow-200/80">
              <strong>Checklist:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Document looks authentic (DD-214, VA Card, etc.)</li>
                <li>Name matches user: {selectedRequest?.display_name}</li>
                <li><strong>SSN is redacted/hidden</strong> (Reject if visible!)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="destructive" 
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => selectedRequest && handleApprove(selectedRequest)}
              disabled={isProcessing}
            >
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be shown to the user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
             <Textarea 
               placeholder="Reason for rejection (e.g., 'Document blurry', 'SSN visible', 'Name mismatch')..."
               value={rejectionReason}
               onChange={(e) => setRejectionReason(e.target.value)}
               className="bg-gray-800 border-gray-700 min-h-[100px]"
             />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

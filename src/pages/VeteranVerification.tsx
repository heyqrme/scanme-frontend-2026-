import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, Shield, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/utils/auth-store";
import { useProfileStore } from "@/utils/profile-store";
import { toast } from "sonner";
import { apiClient } from "app";

export default function VeteranVerification() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const { profile, loadProfile } = useProfileStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadProfile(user.uid);
    }
  }, [user, loadProfile]);

  if (authLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login?next=/veteran-verification" replace />;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload a proof document");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the API client to submit
      // Note: We need to pass the file properly. 
      // The generated client might expect 'body' or specific args.
      // Based on common patterns in this codebase:
      const response = await apiClient.submit_verification({ file: file });
      
      if (response.ok) {
        toast.success("Verification request submitted successfully");
        // Reload profile to update status
        if (user?.uid) loadProfile(user.uid);
      } else {
        const errorData = await response.json();
        toast.error(`Submission failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error("Failed to submit verification request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!profile) return <div className="p-8 text-center">Loading profile...</div>;

    const status = profile.veteranStatus || 'unverified';

    if (status === 'verified') {
      return (
        <Card className="bg-green-900/20 border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-900/50 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <CardTitle className="text-green-400">You are Verified!</CardTitle>
            <CardDescription className="text-green-200/70">
              Thank you for your service. You have full access to the Military & Vets Hub.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => navigate("/veteran-hub")}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              Enter Military & Vets Hub
            </Button>
          </CardFooter>
        </Card>
      );
    }

    if (status === 'pending') {
      return (
        <Card className="bg-yellow-900/20 border-yellow-800">
          <CardHeader className="text-center">
            <div className="mx-auto bg-yellow-900/50 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-yellow-400" />
            </div>
            <CardTitle className="text-yellow-400">Verification Pending</CardTitle>
            <CardDescription className="text-yellow-200/70">
              Your document has been received and is under review by our team.
              <br/>This usually takes 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-400">
            <p>You will be notified once your status changes.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
             <Button variant="outline" onClick={() => navigate("/")}>
               Back to Home
             </Button>
          </CardFooter>
        </Card>
      );
    }

    if (status === 'rejected') {
       // Allow re-submission
       return (
         <div className="space-y-6">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Verification Rejected</AlertTitle>
              <AlertDescription>
                Your previous request was not approved. Please ensure your document is clear and valid, then try again.
              </AlertDescription>
            </Alert>
            {renderUploadForm()}
         </div>
       );
    }

    // Default: Unverified
    return renderUploadForm();
  };

  const renderUploadForm = () => (
    <Card className="bg-gray-900/60 border border-gray-800">
      <CardHeader>
        <CardTitle>Submit Proof of Service</CardTitle>
        <CardDescription>
          To access the Military & Vets Hub, please upload a document verifying your veteran status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-sm text-blue-200">
          <p className="font-semibold mb-2 flex items-center"><Shield className="w-4 h-4 mr-2"/> Privacy & Security</p>
          <ul className="list-disc list-inside space-y-1 opacity-80">
            <li>We accept redacted DD-214, VA ID Card, or Driver's License with Veteran designation.</li>
            <li><strong>Please redact (black out) your SSN and other sensitive info.</strong></li>
            <li>Documents are only visible to our admin verification team.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {previewUrl ? (
               <div className="flex flex-col items-center">
                 <img src={previewUrl} alt="Preview" className="max-h-48 rounded shadow-lg mb-4" />
                 <p className="text-sm text-green-400 font-medium">Click to change file</p>
               </div>
            ) : file ? (
               <div className="flex flex-col items-center">
                 <FileText className="w-12 h-12 text-purple-400 mb-2" />
                 <p className="font-medium text-white">{file.name}</p>
                 <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
               </div>
            ) : (
               <div className="flex flex-col items-center">
                 <Upload className="w-12 h-12 text-gray-500 mb-2" />
                 <p className="font-medium text-gray-300">Click to upload or drag and drop</p>
                 <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF (Max 10MB)</p>
               </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={!file || isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isSubmitting ? "Uploading..." : "Submit for Verification"}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container px-4 py-8 mx-auto min-h-screen bg-black text-white max-w-2xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">Veteran Verification</h1>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { useProfileStore, UserProfile } from "../utils/profile-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { APP_BASE_PATH } from "app";
import { getSafeImageUrl } from "../utils/avatar-utils";

interface ProfileFormData {
  displayName: string;
  bio: string;
  location: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phoneNumber: string;
  birthdate: string;
  interests: string;
  instagram: string;
  twitter: string;
  facebook: string;
  relationshipStatus: string;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile, isLoading, error, updateProfile, uploadProfilePicture, loadProfile } = useProfileStore();
  
  // QR code state
  const [qrValue, setQrValue] = useState<string>("");
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    bio: "",
    location: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phoneNumber: "",
    birthdate: "",
    interests: "",
    instagram: "",
    twitter: "",
    facebook: "",
    relationshipStatus: "",
  });
  
  // File upload state
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState<boolean>(false);
  
  // Form completion tracking
  const [formProgress, setFormProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Load user profile when component mounts
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    const fetchProfile = async () => {
      const userProfile = await loadProfile(user.uid);
      
      if (userProfile) {
        // Pre-fill form with existing profile data
        setFormData({
          displayName: userProfile.displayName || "",
          bio: userProfile.bio || "",
          location: userProfile.location || "",
          addressLine1: userProfile.address?.line1 || "",
          addressLine2: userProfile.address?.line2 || "",
          city: userProfile.address?.city || "",
          state: userProfile.address?.state || "",
          zip: userProfile.address?.zip || "",
          country: userProfile.address?.country || "",
          phoneNumber: userProfile.phoneNumber || "",
          birthdate: userProfile.birthdate || "",
          interests: userProfile.interests?.join(", ") || "",
          instagram: userProfile.socialLinks?.instagram || "",
          twitter: userProfile.socialLinks?.twitter || "",
          facebook: userProfile.socialLinks?.facebook || "",
          relationshipStatus: userProfile.relationshipStatus || "",
        });
        
        // Set QR code URL to point directly to the user's profile
        setQrValue(`${window.location.origin}${APP_BASE_PATH}/member?id=${user.uid}`);
        
        // Calculate initial form progress
        calculateFormProgress();
      } else {
        // Create a basic profile
        await updateProfile({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: new Date(),
          profileCompleted: false,
          friends: [],
        });
        
        // Set form data from user auth
        setFormData({
          ...formData,
          displayName: user.displayName || "",
        });
        
        // Set QR code URL using the app's actual URL with query parameters and correct base path
        setQrValue(`${window.location.origin}${APP_BASE_PATH}/add-friend?id=${user.uid}`);
      }
    };
    
    fetchProfile();
  }, [user, navigate, loadProfile]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update form progress when input changes
    setTimeout(calculateFormProgress, 100);
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTimeout(calculateFormProgress, 100);
  };
  
  // Handle profile picture change
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.match(/(jpeg|jpg|png|gif)/gi)) {
        toast.error("Please upload an image file (jpeg, jpg, png, gif)");
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit");
        return;
      }
      
      // Set file and preview
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      
      // Update form progress
      setTimeout(calculateFormProgress, 100);
    }
  };
  
  // Calculate form progress
  const calculateFormProgress = () => {
    let requiredFields = ["displayName", "bio"];
    let totalFields = Object.keys(formData).length + 1; // +1 for profile picture
    let completedFields = 0;
    
    // Check required fields
    for (const field of requiredFields) {
      if (formData[field as keyof ProfileFormData]) {
        completedFields += 1;
      }
    }
    
    // Check optional fields
    for (const field of Object.keys(formData)) {
      if (!requiredFields.includes(field) && formData[field as keyof ProfileFormData]) {
        completedFields += 0.5; // Give half weight to optional fields
      }
    }
    
    // Check profile picture
    if (profilePicture || user?.photoURL) {
      completedFields += 1;
    }
    
    // Calculate percentage (cap at 100)
    const progress = Math.min(Math.round((completedFields / (requiredFields.length + 2)) * 100), 100);
    setFormProgress(progress);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to complete your profile");
      return;
    }
    
    // Validate required fields
    if (!formData.displayName) {
      toast.error("Display name is required");
      return;
    }
    
    if (!formData.bio) {
      toast.error("Bio is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Parse interests into array
      const interests = formData.interests
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Prepare social links
      const socialLinks = {
        instagram: formData.instagram,
        twitter: formData.twitter,
        facebook: formData.facebook,
      };
      
      // Update profile with picture if it exists
      await updateProfile({
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country
        },
        phoneNumber: formData.phoneNumber,
        birthdate: formData.birthdate,
        interests,
        socialLinks,
        relationshipStatus: formData.relationshipStatus,
        profileCompleted: true,
      }, profilePicture);
      
      toast.success("Profile setup complete!");
      
      // Redirect to profile page
      navigate("/profile");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(`Failed to save profile: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not logged in, redirect to login
  if (!user) {
    return null; // Redirect in useEffect
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-xl">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Determine QR code colors based on relationship status
  const getQrColors = () => {
    const status = formData.relationshipStatus;
    switch (status) {
      case 'Single':
        return { bg: '#22d3ee', fg: '#000000' }; // Neon Cyan
      case 'Looking':
        return { bg: '#e879f9', fg: '#000000' }; // Neon Fuchsia
      case 'Just Friends':
        return { bg: '#f87171', fg: '#000000' }; // Neon Red
      case 'Taken':
        return { bg: '#a855f7', fg: '#000000' }; // Neon Purple
      default:
        return { bg: '#FFFFFF', fg: '#000000' };
    }
  };

  const { bg: qrBgColor, fg: qrFgColor } = getQrColors();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative pb-20">
      {/* Background lighting effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500"
          >
            ScanMe
          </motion.h1>
          
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => navigate('/')}
            >
              Home
            </Button>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-center">Complete Your Profile</h2>
          <p className="text-gray-400 text-center mt-2">Tell us more about you to customize your experience</p>
          
          {/* Progress bar */}
          <div className="mt-6 mb-8 w-full max-w-md mx-auto bg-gray-800 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${formProgress}%` }}
            ></div>
            <p className="text-xs text-center mt-2 text-gray-400">{formProgress}% complete</p>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture and QR Code */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle>Your Identity</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a profile picture and get your unique QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="text-center">
                    <Avatar className="h-32 w-32 border-2 border-purple-500 mb-4">
                      <AvatarImage 
                        src={profilePicturePreview || getSafeImageUrl(user.photoURL)} 
                        alt={formData.displayName || user.displayName || "User"} 
                      />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-600 to-blue-600">
                        {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 
                         user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <Label 
                      htmlFor="profile-picture"
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-md cursor-pointer border border-gray-700 inline-block transition duration-200"
                    >
                      {uploadingPicture ? "Uploading..." : "Choose Picture"}
                    </Label>
                    <Input 
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                      disabled={uploadingPicture}
                    />
                    <p className="text-xs text-gray-400 mt-2">PNG, JPG or GIF (max 5MB)</p>
                  </div>
                  
                  <Separator className="bg-gray-800" />
                  
                  {/* QR Code Display */}
                  <div className="w-full">
                    <h3 className="text-lg font-medium mb-8 text-center">Your Unique QR Code</h3>
                    <div className="p-4 rounded-lg mx-auto w-max transition-colors duration-300 transform rotate-45 my-8" style={{ backgroundColor: qrBgColor }}>
                      <QRCodeSVG 
                        value={qrValue} 
                        size={200} 
                        bgColor={qrBgColor}
                        fgColor={qrFgColor}
                        level="M"
                        className="mx-auto"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">Share this code to let others add you as a friend</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Profile Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Fill in your details to complete your profile
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-gray-300">Display Name *</Label>
                        <Input 
                          id="displayName"
                          name="displayName"
                          placeholder="Your display name"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="relationshipStatus" className="text-gray-300">Relationship Status</Label>
                        <Select 
                          value={formData.relationshipStatus} 
                          onValueChange={(value) => handleSelectChange("relationshipStatus", value)}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Looking">Looking</SelectItem>
                            <SelectItem value="Just Friends">Just Friends</SelectItem>
                            <SelectItem value="Taken">Taken</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-gray-300">Location (Display Only)</Label>
                      <Input 
                        id="location"
                        name="location"
                        placeholder="City, Country"
                        className="bg-gray-800 border-gray-700 text-white"
                        value={formData.location}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-4 pt-2">
                      <h4 className="text-sm font-medium text-gray-300">Shipping Address (Private)</h4>
                      <div className="space-y-2">
                        <Label htmlFor="addressLine1" className="text-gray-300">Address Line 1</Label>
                        <Input 
                          id="addressLine1"
                          name="addressLine1"
                          placeholder="Street address, P.O. box"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.addressLine1}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressLine2" className="text-gray-300">Address Line 2</Label>
                        <Input 
                          id="addressLine2"
                          name="addressLine2"
                          placeholder="Apartment, suite, unit, etc."
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.addressLine2}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-gray-300">City</Label>
                          <Input 
                            id="city"
                            name="city"
                            placeholder="City"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={formData.city}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-gray-300">State</Label>
                          <Input 
                            id="state"
                            name="state"
                            placeholder="State"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={formData.state}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zip" className="text-gray-300">Zip Code</Label>
                          <Input 
                            id="zip"
                            name="zip"
                            placeholder="Zip Code"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={formData.zip}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country" className="text-gray-300">Country</Label>
                          <Input 
                            id="country"
                            name="country"
                            placeholder="Country"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={formData.country}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-gray-300">Bio *</Label>
                      <Textarea 
                        id="bio"
                        name="bio"
                        placeholder="Tell us about yourself"
                        className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                        value={formData.bio}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthdate" className="text-gray-300">Birthdate</Label>
                        <Input 
                          id="birthdate"
                          name="birthdate"
                          type="date"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.birthdate}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number</Label>
                        <Input 
                          id="phoneNumber"
                          name="phoneNumber"
                          placeholder="+1 (123) 456-7890"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interests" className="text-gray-300">Interests</Label>
                      <Input 
                        id="interests"
                        name="interests"
                        placeholder="Music, Art, Technology (comma separated)"
                        className="bg-gray-800 border-gray-700 text-white"
                        value={formData.interests}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <Separator className="bg-gray-800" />
                  
                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Social Media</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="text-gray-300">Instagram</Label>
                        <Input 
                          id="instagram"
                          name="instagram"
                          placeholder="@username"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.instagram}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="twitter" className="text-gray-300">Twitter</Label>
                        <Input 
                          id="twitter"
                          name="twitter"
                          placeholder="@username"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.twitter}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="facebook" className="text-gray-300">Facebook</Label>
                        <Input 
                          id="facebook"
                          name="facebook"
                          placeholder="username or URL"
                          className="bg-gray-800 border-gray-700 text-white"
                          value={formData.facebook}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between border-t border-gray-800 pt-5">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => navigate('/profile')}
                  >
                    Skip for Now
                  </Button>
                  
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Complete Profile"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

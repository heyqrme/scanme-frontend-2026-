import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../utils/auth-store";
import { toast } from "sonner";
import { APP_BASE_PATH } from "app";
import { PRODUCTION_URL } from "../utils/config";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, user, loading, error, clearError } = useAuthStore();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/profile');
    }
  }, [user, loading, navigate]);
  
  // Check for friend ID in URL
  useEffect(() => {
    const friendId = searchParams.get('friendId');
    if (friendId) {
      sessionStorage.setItem('pendingFriendRequest', friendId);
    }
    
    const code = searchParams.get('code');
    if (code) {
      sessionStorage.setItem('pendingActivationCode', code);
    }
  }, [searchParams]);
  
  // Handle form submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormError('');
    clearError();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    try {
      // Submit the form
      await signup(email, password, name);
      
      // If signup is successful, navigate to profile setup page
      // Note: useAuthStore.getState().user is used here because 'user' from hook might not update immediately in this callback scope
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        toast.success("Account created successfully! Let's set up your profile.");
        
        // Check for pending friend request
        const pendingFriendId = sessionStorage.getItem('pendingFriendRequest');
        const pendingActivationCode = sessionStorage.getItem('pendingActivationCode');
        
        if (pendingFriendId) {
          sessionStorage.removeItem('pendingFriendRequest');
          navigate(`/add-friend?id=${pendingFriendId}`);
        } else if (pendingActivationCode) {
          // Activation code will be handled by App.tsx (Home)
          sessionStorage.removeItem('pendingActivationCode');
          navigate(`/?code=${pendingActivationCode}`);
        } else {
          navigate('/profile-setup');
        }
      }
    } catch (error) {
      // Error will be handled by the auth store
      console.error("Signup error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background lighting effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-pink-600/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <main className="container mx-auto px-4 py-16 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500">
              ScanMe
            </h1>
            <p className="text-gray-400 mt-2">Join the community and get your unique QR code</p>
          </div>
          
          <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription className="text-gray-400">
                Fill in your details to join ScanMe
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
              <CardContent>
                {(error || formError) && (
                  <div className="bg-red-900/30 border border-red-800 p-3 rounded-md text-sm text-red-300 mb-4">
                    {formError || error}
                    <button 
                      type="button" 
                      className="ml-2 text-red-400 hover:text-red-300"
                      onClick={() => {
                        setFormError('');
                        clearError();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="John Doe" 
                        className="bg-gray-800 border-gray-700 text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        className="bg-gray-800 border-gray-700 text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-gray-800 border-gray-700 text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm" className="text-gray-300">Confirm Password</Label>
                      <Input 
                        id="confirm" 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-gray-800 border-gray-700 text-white"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 border border-gray-800 rounded-lg bg-gray-900/30">
                    <p className="text-gray-400 mb-8 text-center">Your unique QR code will look like this:</p>
                    <div className="relative my-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg filter blur-md opacity-50 -m-1 transform rotate-45"></div>
                      <div className="bg-black p-4 rounded-lg relative transform rotate-45">
                        <QRCodeSVG 
                          value={`${PRODUCTION_URL}/?s=preview`} 
                          size={150} 
                          bgColor="#000000"
                          fgColor="#ffffff"
                          level="M"
                          className="mx-auto"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">Preview (Your actual QR code will be generated after signup)</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <p className="text-sm text-gray-400 text-center">
                  Already have an account?{" "}
                  <span 
                    className="text-purple-400 hover:text-purple-300 cursor-pointer"
                    onClick={() => navigate('/login')}
                  >
                    Sign in
                  </span>
                </p>
                <p className="text-sm text-gray-400 text-center">
                  <span 
                    className="text-purple-400 hover:text-purple-300 cursor-pointer"
                    onClick={() => navigate('/')}
                  >
                    Back to home
                  </span>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, user, loading, error, clearError } = useAuthStore();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

  const handleSuccessRedirect = () => {
    // Check for pending friend request
    const pendingFriendId = sessionStorage.getItem('pendingFriendRequest');
    const pendingActivationCode = sessionStorage.getItem('pendingActivationCode');
    const next = searchParams.get('next');

    if (pendingFriendId) {
      sessionStorage.removeItem('pendingFriendRequest');
      navigate(`/add-friend?id=${pendingFriendId}`);
    } else if (pendingActivationCode) {
      sessionStorage.removeItem('pendingActivationCode');
      navigate(`/?code=${pendingActivationCode}`);
    } else if (next) {
      navigate(next);
    } else {
      navigate('/profile');
    }
  };
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && !loginSuccess && !redirecting) {
      setRedirecting(true);
      handleSuccessRedirect();
    }
  }, [user, loading, loginSuccess, redirecting]);

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      const success = await login(email, password);
      if (success) {
        setLoginSuccess(true);
      }
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    const success = await loginWithGoogle();
    if (success) {
      setLoginSuccess(true);
    }
  };

  // Show loading spinner if checking auth
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background lighting effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <main className="container mx-auto px-4 py-16 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 mb-2">
              ScanMe
            </h1>
            <p className="text-gray-400 mt-2">Sign in to your account</p>
          </div>
          
          <Card className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            {loginSuccess ? (
              <CardContent className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-8"
                >
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Login Successful!</h2>
                  <p className="text-gray-400 mb-6">Welcome back. Redirecting you...</p>
                  <Button
                    onClick={handleSuccessRedirect}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                  >
                    Continue
                  </Button>
                </motion.div>
              </CardContent>
            ) : (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-900/30 border border-red-800 p-3 rounded-md text-sm text-red-300">
                    {error}
                    <button 
                      type="button" 
                      className="ml-2 text-red-400 hover:text-red-300"
                      onClick={clearError}
                    >
                      ✕
                    </button>
                  </div>
                )}
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
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="flex items-center justify-between w-full my-2">
                  <Separator className="w-[30%] bg-gray-700" />
                  <span className="text-xs text-gray-500">OR</span>
                  <Separator className="w-[30%] bg-gray-700" />
                </div>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </Button>
                
                <p className="text-sm text-gray-400 text-center">
                  Don't have an account?{" "}
                  <span 
                    className="text-purple-400 hover:text-purple-300 cursor-pointer"
                    onClick={() => navigate('/signup')}
                  >
                    Sign up
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
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../utils/auth-store";
import { useProfileStore, checkAndRedirectProfile } from "../utils/profile-store";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireCompleteProfile?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireCompleteProfile = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuthStore();
  const { isProfileComplete } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth to initialize
      if (loading) return;
      
      if (requireAuth && !user) {
        // User is not authenticated but route requires auth
        return;
      }
      
      if (requireCompleteProfile && user) {
        // Check if profile is complete for routes that require it
        await checkAndRedirectProfile(user.uid, navigate);
      }
      
      setChecking(false);
    };
    
    checkAuth();
  }, [user, loading, requireAuth, requireCompleteProfile, navigate]);
  
  // Show loading state while checking auth
  if (loading || (checking && requireAuth)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-xl">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if authentication is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If we get here, either authentication is not required or user is authenticated
  return <>{children}</>;
}
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { firebaseAuthService } from "@/lib/firebase-auth";
import LoadingScreen from "@/components/ui/loading-screen";
import { wsService } from "@/lib/websocket";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { useFirestoreRealtime } from "@/hooks/useFirestoreRealtime";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const [authStateLoading, setAuthStateLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for Firebase auth state changes to handle page refresh
  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth not initialized, skipping auth guard');
      setAuthStateLoading(false);
      setIsAuthenticated(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase auth state changed:', !!user);
      }
      setIsAuthenticated(!!user);
      setAuthStateLoading(false);
      
      if (user) {
        // User is signed in, update the auth service and refresh token
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            firebaseAuthService.setUser(JSON.parse(userData));
            // Refresh the token to ensure it's valid for API calls
            firebaseAuthService.refreshToken().catch(tokenError => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Token refresh failed in auth guard:', tokenError);
              }
              // Return null to prevent unhandled promise rejection
              return null;
            });
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error restoring user data:', error);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['firebase-auth-user'],
    enabled: isAuthenticated && !authStateLoading,
    queryFn: async () => {
      try {
        return await firebaseAuthService.getCurrentUser();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('AuthGuard: Error getting current user:', error);
        }
        firebaseAuthService.logout().catch(logoutError => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error during logout in AuthGuard:', logoutError);
          }
          // Return null to prevent unhandled promise rejection
          return null;
        });
        setLocation('/login');
        return null;
      }
    },
    retry: false,
  });

  // Enable cost-efficient Firestore real-time listeners (disabled WebSocket polling)
  useFirestoreRealtime();

  useEffect(() => {
    // Don't redirect until we know the auth state
    if (authStateLoading) return;
    
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    const needsProfile = firebaseAuthService.requiresProfile();
    console.log('AuthGuard: User needs profile?', needsProfile);
    console.log('AuthGuard: Current user:', firebaseAuthService.getUser());
    
    if (needsProfile) {
      console.log('AuthGuard: Redirecting to complete-profile');
      setLocation('/complete-profile');
      return;
    }

    // Connect to WebSocket for authenticated users (skip if not configured)
    try {
      wsService.connect();
    } catch (e) {
      console.log('WebSocket not available:', e);
    }

    return () => {
      try {
        wsService.disconnect();
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket disconnect failed:', e);
        }
      }
    };
  }, [setLocation, user, authStateLoading, isAuthenticated]);

  // Show loading while waiting for Firebase auth state
  if (authStateLoading) {
    return <LoadingScreen message="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return <LoadingScreen message="Verifying authentication..." />;
  }

  if (firebaseAuthService.requiresProfile()) {
    return null;
  }

  return (
    <>
      {children}
    </>
  );
}

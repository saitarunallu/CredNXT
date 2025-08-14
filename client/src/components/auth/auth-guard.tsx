import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { firebaseAuthService } from "@/lib/firebase-auth";
import LoadingScreen from "@/components/ui/loading-screen";
import { wsService } from "@/lib/websocket";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['firebase-auth-user'],
    enabled: firebaseAuthService.isAuthenticated(),
    queryFn: async () => {
      try {
        return await firebaseAuthService.getCurrentUser();
      } catch (error) {
        console.error('AuthGuard: Error getting current user:', error);
        firebaseAuthService.logout();
        setLocation('/login');
        return null;
      }
    },
    retry: false,
  });

  // Enable real-time updates for authenticated users
  useRealtimeUpdates();

  useEffect(() => {
    if (!firebaseAuthService.isAuthenticated()) {
      setLocation('/login');
      return;
    }

    if (firebaseAuthService.requiresProfile()) {
      setLocation('/complete-profile');
      return;
    }

    // Connect to WebSocket for authenticated users
    wsService.connect();

    return () => {
      wsService.disconnect();
    };
  }, [setLocation, user]);

  if (!firebaseAuthService.isAuthenticated()) {
    return null;
  }

  if (isLoading) {
    return <LoadingScreen message="Verifying authentication..." />;
  }

  if (firebaseAuthService.requiresProfile()) {
    return null;
  }

  return <>{children}</>;
}

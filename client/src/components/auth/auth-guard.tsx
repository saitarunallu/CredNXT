import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import LoadingScreen from "@/components/ui/loading-screen";
import { wsService } from "@/lib/websocket";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: authService.isAuthenticated(),
    queryFn: async () => {
      try {
        return await authService.getCurrentUser();
      } catch (error) {
        console.error('AuthGuard: Error getting current user:', error);
        // If there's an auth error, clear tokens and redirect to login
        if (error instanceof Error && error.message.includes('401')) {
          authService.logout();
          setLocation('/login');
          return null; // Return null instead of throwing to prevent unhandled rejection
        }
        // For other errors, still throw to maintain error state
        throw error;
      }
    },
    retry: false, // Don't retry auth failures
  });

  // Enable real-time updates for authenticated users
  useRealtimeUpdates();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setLocation('/login');
      return;
    }

    if (authService.requiresProfile()) {
      setLocation('/complete-profile');
      return;
    }

    // Connect to WebSocket for authenticated users
    wsService.connect();

    return () => {
      wsService.disconnect();
    };
  }, [setLocation, user]);

  if (!authService.isAuthenticated()) {
    return null;
  }

  if (isLoading) {
    return <LoadingScreen message="Verifying authentication..." />;
  }

  if (authService.requiresProfile()) {
    return null;
  }

  return <>{children}</>;
}

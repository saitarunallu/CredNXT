import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import LoadingScreen from "@/components/ui/loading-screen";
import { wsService } from "@/lib/websocket";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: authService.isAuthenticated(),
    queryFn: async () => {
      return await authService.getCurrentUser();
    },
  });

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

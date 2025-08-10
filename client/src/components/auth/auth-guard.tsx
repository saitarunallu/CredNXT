import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (authService.requiresProfile()) {
    return null;
  }

  return <>{children}</>;
}

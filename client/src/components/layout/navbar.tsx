import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { formatNotificationTime } from "@/hooks/useRealtimeNotifications";
import { Shield, Bell, User, LogOut, Menu, X, IndianRupee } from "lucide-react";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = firebaseAuthService.getUser();
  const queryClient = useQueryClient();

  const { data: notifications, error: notificationsError } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    staleTime: 0, // Always consider data stale so it re-renders on cache updates
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // If auth error, try to refresh token once
      if (error?.message?.includes('401') && failureCount === 0) {
        firebaseAuthService.refreshToken();
        return true;
      }
      return false;
    }
  });

  // Debug logging to see what we're getting
  console.log('🔔 Navbar notifications data:', notifications);
  console.log('🔔 Navbar notifications array:', (notifications as any)?.notifications);
  
  const unreadCount = (notifications as any)?.notifications?.filter((n: any) => !n.isRead).length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/notifications/mark-all-read', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const handleLogout = () => {
    firebaseAuthService.logout();
    setLocation('/');
  };

  const NavLinks = () => (
    <>
      <Link href="/dashboard">
        <Button 
          variant={location === '/dashboard' ? 'default' : 'ghost'} 
          className="justify-start"
        >
          Dashboard
        </Button>
      </Link>
      <Link href="/offers/create">
        <Button 
          variant={location === '/offers/create' ? 'default' : 'ghost'} 
          className="justify-start"
        >
          Create Offer
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-navy rounded-lg flex items-center justify-center relative">
                <Shield className="w-6 h-6 text-white" />
                <IndianRupee className="w-3 h-3 text-white absolute" />
              </div>
              <span className="text-xl font-bold text-foreground">CredNXT</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLinks />
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="relative"
                  onClick={() => {
                    // Mark all notifications as read when notification button is clicked
                    if (unreadCount > 0) {
                      markAllAsReadMutation.mutate();
                    }
                  }}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                {(notifications as any)?.notifications?.length > 0 ? (
                  <>
                    {unreadCount > 0 && (
                      <div className="p-2 border-b">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsReadMutation.mutate();
                          }}
                          disabled={markAllAsReadMutation.isPending}
                          className="w-full text-xs"
                        >
                          {markAllAsReadMutation.isPending ? 'Marking all as read...' : 'Mark all as read'}
                        </Button>
                      </div>
                    )}
                    {(notifications as any)?.notifications?.map((notification: any) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className={`flex flex-col items-start p-4 cursor-pointer hover:bg-accent ${!notification.isRead ? 'bg-accent/50 border-l-4 border-primary' : ''}`}
                        onClick={() => {
                          // Navigate to offer if it's an offer notification
                          if (notification.offerId) {
                            setLocation(`/offers/${notification.offerId}`);
                          }
                        }}
                      >
                        <div className={`font-medium ${!notification.isRead ? 'text-primary' : 'text-foreground'}`}>
                          {notification.title}
                        </div>
                        <div className={`text-sm ${!notification.isRead ? 'text-primary/80' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between w-full">
                          <span>{formatNotificationTime(notification.createdAt)}</span>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                              New
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <DropdownMenuItem>No notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="font-medium">
                  {user?.name || user?.phone}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            <NavLinks />
          </div>
        )}
      </div>
    </nav>
  );
}

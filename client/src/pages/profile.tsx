import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingScreen from "@/components/ui/loading-screen";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { User, LogOut, Shield, Bell, HelpCircle } from "lucide-react";
import type { User as UserType } from "@shared/firestore-schema";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use Firebase Auth directly instead of API calls
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      
      try {
        // Always fetch fresh data from Firebase to ensure we have the latest
        const currentUser = await firebaseAuthService.getCurrentUser();
        if (currentUser) {
          console.log('Loaded user from Firebase:', currentUser);
          setUser(currentUser);
        } else {
          // No user found, redirect to login
          console.log('No user found in Firebase, redirecting to login');
          firebaseAuthService.logout();
          setLocation('/login');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        firebaseAuthService.logout();
        setLocation('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (firebaseAuthService.isAuthenticated()) {
      loadUserData();
    } else {
      setLocation('/login');
    }
  }, [setLocation]);
  // Theme functionality removed - light theme only

  const handleLogout = () => {
    firebaseAuthService.logout();
    setLocation('/');
  };

  // Handle authentication check first (fastest check)
  if (!firebaseAuthService.isAuthenticated()) {
    setLocation('/login');
    return null;
  }
  
  // Show loading if we're still fetching user data
  if (isLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }
  
  // Redirect if no user data available after loading
  if (!user) {
    console.log('No user data available, redirecting to complete profile');
    setLocation('/auth/complete-profile');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <Card className="shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
                <p className="text-sm text-muted-foreground">Update your personal details</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={user?.name || ''} 
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={user?.phone || ''} 
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  value={user?.email || ''} 
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              {isEditing ? (
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance card removed - light theme only */}

        {/* Settings */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-foreground">Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Two-Factor Authentication</span>
                  <span className="text-sm font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Phone Verification</span>
                  <span className="text-sm font-medium text-green-600">Verified</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Manage Security
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="text-foreground">Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Reminders</span>
                  <span className="text-sm font-medium text-green-600">On</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Offers</span>
                  <span className="text-sm font-medium text-green-600">On</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Manage Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support & Help */}
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <span className="text-foreground">Support & Help</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col">
                <span className="font-medium text-foreground">Help Center</span>
                <span className="text-sm text-muted-foreground">FAQs & Guides</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col">
                <span className="font-medium text-foreground">Contact Support</span>
                <span className="text-sm text-muted-foreground">Get Help</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}
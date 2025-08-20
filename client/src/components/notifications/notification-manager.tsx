import { useEffect, useState } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-config";

/**
 * Notification Manager Component
 * Handles real-time notifications with onSnapshot for authenticated users
 * Shows instant toast notifications when new notifications arrive
 * Now works independently across all pages, not just within AuthGuard
 */
export default function NotificationManager() {
  const [user, setUser] = useState(firebaseAuthService.getUser());
  const [authStateLoaded, setAuthStateLoaded] = useState(false);
  
  // Listen for authentication state changes
  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth not initialized, notifications will not work');
      setAuthStateLoaded(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Update user state from localStorage or auth service
        const userData = firebaseAuthService.getUser();
        if (userData) {
          setUser(userData);
          console.log('🔔 Notification manager detected authenticated user:', userData.id);
        }
      } else {
        setUser(null);
        console.log('🔔 Notification manager detected user logout');
      }
      setAuthStateLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // Initialize real-time notifications for authenticated users
  const notificationsInitialized = useRealtimeNotifications();
  
  useEffect(() => {
    if (authStateLoaded && user) {
      console.log('🔔 Notification manager fully initialized for user:', user.id);
    } else if (authStateLoaded && !user) {
      console.log('🔔 Notification manager ready but no authenticated user');
    }
  }, [user, authStateLoaded]);

  // This component doesn't render anything visible
  // It only manages the real-time notification system
  return null;
}
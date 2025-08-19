import { useEffect } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { firebaseAuthService } from "@/lib/firebase-auth";

/**
 * Notification Manager Component
 * Handles real-time notifications with onSnapshot for authenticated users
 * Shows instant toast notifications when new notifications arrive
 */
export default function NotificationManager() {
  const user = firebaseAuthService.getUser();
  
  // Initialize real-time notifications for authenticated users
  useRealtimeNotifications();
  
  useEffect(() => {
    if (user) {
      console.log('🔔 Notification manager initialized for user:', user.id);
    }
  }, [user]);

  // This component doesn't render anything visible
  // It only manages the real-time notification system
  return null;
}
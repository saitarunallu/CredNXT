import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { useToast } from './use-toast';
// Format utility moved to local function

/**
 * Enhanced real-time notifications with instant toast alerts
 * Shows toast notifications when new notifications arrive via onSnapshot
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const listenersSetup = useRef(false);
  const lastNotificationCount = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Prevent multiple listener setups
    if (listenersSetup.current) return;
    
    // Use the stored user data instead of Firebase auth user
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!userData?.id || !db) {
      console.log('🔔 No user data or db available, skipping notification setup');
      return;
    }

    console.log('🔔 Setting up enhanced real-time notifications for user:', userData.id);

    // Listen to user's notifications with recent filter
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userData.id),
      orderBy('createdAt', 'desc'),
      limit(50) // Increased limit for better notification history
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      if (!snapshot.metadata.hasPendingWrites) {
        console.log('🔔 Real-time notification update received');
        
        // Transform notification data with proper typing
        const notifications = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            userId: data.userId,
            offerId: data.offerId,
            type: data.type,
            priority: data.priority,
            title: data.title,
            message: data.message,
            isRead: data.isRead || false,
            metadata: data.metadata,
            batchId: data.batchId,
            // Convert Firestore timestamps to Date objects for consistent handling
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            readAt: data.readAt?.toDate ? data.readAt.toDate() : null,
            scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : new Date(data.scheduledFor),
            expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : null
          };
        });

        // Update React Query cache directly
        console.log('🔔 Real-time: Setting cache with notifications:', notifications.length);
        queryClient.setQueryData(['/api/notifications'], { notifications });
        
        // Force invalidate to trigger re-renders
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

        // Show toast for new notifications (skip on first load)
        if (!isFirstLoad.current) {
          const currentCount = notifications.length;
          const unreadNotifications = notifications.filter(n => !n.isRead);
          
          // Check if we have new notifications
          if (currentCount > lastNotificationCount.current) {
            const newNotifications = notifications.slice(0, currentCount - lastNotificationCount.current);
            
            // Show toast for each new notification (max 3 to avoid spam)
            newNotifications.slice(0, 3).forEach((notification, index) => {
              setTimeout(() => {
                toast({
                  title: notification.title,
                  description: notification.message,
                  duration: 5000,
                  className: getNotificationToastClass(notification.priority, notification.type)
                });
              }, index * 500); // Stagger notifications by 500ms
            });

            // If more than 3 new notifications, show a summary toast
            if (newNotifications.length > 3) {
              setTimeout(() => {
                toast({
                  title: `${newNotifications.length} New Notifications`,
                  description: "Check your notification panel for all updates",
                  duration: 4000,
                });
              }, 1500);
            }
          }
          
          // Update unread count in document title
          updateDocumentTitle(unreadNotifications.length);
        }

        lastNotificationCount.current = notifications.length;
        isFirstLoad.current = false;
      }
    }, (error) => {
      console.error('Error in notifications listener:', error);
      toast({
        title: "Notification Error",
        description: "Failed to receive real-time notifications. Please refresh the page.",
        variant: "destructive",
        duration: 5000
      });
    });

    listenersSetup.current = true;

    return () => {
      console.log('🔔 Cleaning up real-time notification listeners');
      unsubscribeNotifications();
      listenersSetup.current = false;
      isFirstLoad.current = true;
      resetDocumentTitle();
    };
  }, [queryClient, toast]);
}

/**
 * Get appropriate toast styling based on notification priority and type
 */
function getNotificationToastClass(priority: string, type: string): string {
  // High priority notifications
  if (priority === 'urgent' || priority === 'high') {
    return 'border-red-200 bg-red-50 text-red-900';
  }
  
  // Payment related notifications
  if (type?.includes('payment') || type?.includes('reminder')) {
    return 'border-yellow-200 bg-yellow-50 text-yellow-900';
  }
  
  // Security alerts
  if (type?.includes('security') || type?.includes('alert')) {
    return 'border-orange-200 bg-orange-50 text-orange-900';
  }
  
  // Offer related notifications
  if (type?.includes('offer')) {
    return 'border-blue-200 bg-blue-50 text-blue-900';
  }
  
  // Default styling
  return 'border-gray-200 bg-white text-gray-900';
}

/**
 * Update document title with unread notification count
 */
function updateDocumentTitle(unreadCount: number) {
  const baseTitle = 'CredNxt - P2P Lending Platform';
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

/**
 * Reset document title to default
 */
function resetDocumentTitle() {
  document.title = 'CredNxt - P2P Lending Platform';
}

/**
 * Format notification timestamp for display
 */
export function formatNotificationTime(timestamp: Date | any): string {
  if (!timestamp) return 'Unknown time';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
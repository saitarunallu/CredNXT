import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onSnapshot, collection, query, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { firebaseAuthService } from '../lib/firebase-auth';

/**
 * Hook to set up Firestore real-time listeners for offers and notifications
 * This provides a fallback for real-time updates when WebSocket fails
 */
export function useFirestoreRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Use the stored user data instead of Firebase auth user
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!userData?.id || !db) return;

    const unsubscribes: Array<() => void> = [];

    // Listen to offers where user is sender
    const sentOffersQuery = query(
      collection(db, 'offers'),
      where('fromUserId', '==', userData.id)
    );
    
    const unsubscribeSentOffers = onSnapshot(sentOffersQuery, (snapshot) => {
      console.log('🔄 Firestore: Sent offers updated');
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }, (error) => {
      console.error('Error in sent offers listener:', error);
    });
    unsubscribes.push(unsubscribeSentOffers);

    // Listen to offers where user is recipient
    const receivedOffersQuery = query(
      collection(db, 'offers'),
      where('toUserId', '==', userData.id)
    );
    
    const unsubscribeReceivedOffers = onSnapshot(receivedOffersQuery, (snapshot) => {
      console.log('🔄 Firestore: Received offers updated');
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    }, (error) => {
      console.error('Error in received offers listener:', error);
    });
    unsubscribes.push(unsubscribeReceivedOffers);

    // Listen to user's notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userData.id)
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      console.log('🔄 Firestore: Notifications updated');
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
    unsubscribes.push(unsubscribeNotifications);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [queryClient]);
}
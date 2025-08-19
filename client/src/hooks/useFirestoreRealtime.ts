import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase-config';

/**
 * Cost-efficient Firestore real-time listeners for offers and notifications
 * Uses onSnapshot for real-time updates without polling or cache invalidation
 */
export function useFirestoreRealtime() {
  const queryClient = useQueryClient();
  const listenersSetup = useRef(false);

  useEffect(() => {
    // Prevent multiple listener setups
    if (listenersSetup.current) return;
    
    // Use the stored user data instead of Firebase auth user
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!userData?.id || !db) return;

    const unsubscribes: Array<() => void> = [];
    console.log('🔄 Setting up cost-efficient Firestore real-time listeners for user:', userData.id);

    // Listen to offers where user is sender with recent filter
    const sentOffersQuery = query(
      collection(db, 'offers'),
      where('fromUserId', '==', userData.id),
      orderBy('updatedAt', 'desc'),
      limit(50) // Limit to reduce read costs
    );
    
    const unsubscribeSentOffers = onSnapshot(sentOffersQuery, (snapshot) => {
      if (!snapshot.metadata.hasPendingWrites) {
        console.log('🔄 Firestore: Sent offers real-time update');
        
        // Update React Query cache directly with new data instead of invalidating
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        queryClient.setQueryData(['/api/offers', 'sent'], offers);
        queryClient.setQueryData(['dashboard-offers'], (oldData: any) => {
          if (oldData) {
            return { ...oldData, sentOffers: offers };
          }
          return oldData;
        });
      }
    }, (error) => {
      console.error('Error in sent offers listener:', error);
    });
    unsubscribes.push(unsubscribeSentOffers);

    // Listen to offers where user is recipient with recent filter
    const receivedOffersQuery = query(
      collection(db, 'offers'),
      where('toUserId', '==', userData.id),
      orderBy('updatedAt', 'desc'),
      limit(50) // Limit to reduce read costs
    );
    
    const unsubscribeReceivedOffers = onSnapshot(receivedOffersQuery, (snapshot) => {
      if (!snapshot.metadata.hasPendingWrites) {
        console.log('🔄 Firestore: Received offers real-time update');
        
        // Update React Query cache directly with new data instead of invalidating
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        queryClient.setQueryData(['/api/offers', 'received'], offers);
        queryClient.setQueryData(['dashboard-offers'], (oldData: any) => {
          if (oldData) {
            return { ...oldData, receivedOffers: offers };
          }
          return oldData;
        });
      }
    }, (error) => {
      console.error('Error in received offers listener:', error);
    });
    unsubscribes.push(unsubscribeReceivedOffers);

    // Listen to user's notifications with recent filter
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userData.id),
      orderBy('createdAt', 'desc'),
      limit(20) // Limit to reduce read costs
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      if (!snapshot.metadata.hasPendingWrites) {
        console.log('🔄 Firestore: Notifications real-time update');
        
        // Update React Query cache directly with new data instead of invalidating
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        queryClient.setQueryData(['/api/notifications'], notifications);
      }
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
    unsubscribes.push(unsubscribeNotifications);

    listenersSetup.current = true;

    return () => {
      console.log('🔄 Cleaning up Firestore real-time listeners');
      unsubscribes.forEach(unsubscribe => unsubscribe());
      listenersSetup.current = false;
    };
  }, [queryClient]);
}
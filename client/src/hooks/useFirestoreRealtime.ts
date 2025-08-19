import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onSnapshot, collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
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
    if (!userData?.id || !db) {
      console.warn('🔄 Real-time listeners not initialized - missing user data or db:', { userData: !!userData?.id, db: !!db });
      return;
    }

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
      console.log('🔄 Firestore: Sent offers snapshot received, hasPendingWrites:', snapshot.metadata.hasPendingWrites, 'docs:', snapshot.docs.length);
      
      // Process all updates, including pending writes for more responsive UI
      const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📦 Sent offers updated:', offers.map(o => ({ id: o.id, status: (o as any).status })));
      
      // Update all relevant cache keys used by different pages
      queryClient.setQueryData(['/api/offers', 'sent'], offers);
      queryClient.setQueryData(['dashboard-offers'], (oldData: any) => {
        console.log('🔄 Updating dashboard cache with sent offers');
        if (oldData) {
          return { ...oldData, sentOffers: offers };
        }
        return { sentOffers: offers, receivedOffers: [] };
      });
      
      // Update the offers page cache
      queryClient.setQueryData(['offers', 'firebase'], (oldData: any) => {
        console.log('🔄 Updating offers page cache with sent offers');
        if (oldData) {
          return { ...oldData, sentOffers: offers };
        }
        return { sentOffers: offers, receivedOffers: oldData?.receivedOffers || [] };
      });
      
      // Force re-render by invalidating queries
      queryClient.invalidateQueries({ queryKey: ['/api/offers', 'sent'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['offers', 'firebase'], exact: false });
    }, (error) => {
      console.error('❌ Error in sent offers listener:', error);
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
      console.log('🔄 Firestore: Received offers snapshot received, hasPendingWrites:', snapshot.metadata.hasPendingWrites, 'docs:', snapshot.docs.length);
      
      // Process all updates, including pending writes for more responsive UI
      const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📦 Received offers updated:', offers.map(o => ({ id: o.id, status: (o as any).status })));
      
      // Update all relevant cache keys used by different pages
      queryClient.setQueryData(['/api/offers', 'received'], offers);
      queryClient.setQueryData(['dashboard-offers'], (oldData: any) => {
        console.log('🔄 Updating dashboard cache with received offers');
        if (oldData) {
          return { ...oldData, receivedOffers: offers };
        }
        return { sentOffers: [], receivedOffers: offers };
      });
      
      // Update the offers page cache
      queryClient.setQueryData(['offers', 'firebase'], (oldData: any) => {
        console.log('🔄 Updating offers page cache with received offers');
        if (oldData) {
          return { ...oldData, receivedOffers: offers };
        }
        return { sentOffers: oldData?.sentOffers || [], receivedOffers: offers };
      });
      
      // Force re-render by invalidating queries
      queryClient.invalidateQueries({ queryKey: ['/api/offers', 'received'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['offers', 'firebase'], exact: false });
    }, (error) => {
      console.error('❌ Error in received offers listener:', error);
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

    // Set up global listener for any offer changes to update individual offer detail pages
    const allOffersQuery = query(
      collection(db, 'offers'),
      orderBy('updatedAt', 'desc'),
      limit(100) // Monitor recent offers for real-time updates
    );
    
    const unsubscribeAllOffers = onSnapshot(allOffersQuery, (snapshot) => {
      console.log('🔄 Firestore: All offers snapshot received, hasPendingWrites:', snapshot.metadata.hasPendingWrites, 'changes:', snapshot.docChanges().length);
      
      // Process all updates, including pending writes for more responsive UI
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const offerData = { id: change.doc.id, ...change.doc.data() };
          console.log(`🔄 Updating offer detail cache for: ${offerData.id}, status: ${(offerData as any).status}, change type: ${change.type}`);
          
          // Update the specific offer detail cache
          queryClient.setQueryData(['offer-details', offerData.id], offerData);
          
          // Force invalidation of offer detail queries for immediate UI updates
          queryClient.invalidateQueries({ queryKey: ['offer-details', offerData.id] });
          
          // Also invalidate schedule data if it's an important status change
          if (change.type === 'modified' && (offerData as any).status) {
            queryClient.invalidateQueries({ queryKey: ['offer-schedule', offerData.id] });
          }
        }
      });
    }, (error) => {
      console.error('❌ Error in all offers listener:', error);
    });
    unsubscribes.push(unsubscribeAllOffers);

    listenersSetup.current = true;

    return () => {
      console.log('🔄 Cleaning up Firestore real-time listeners');
      unsubscribes.forEach(unsubscribe => unsubscribe());
      listenersSetup.current = false;
    };
  }, [queryClient]);
}
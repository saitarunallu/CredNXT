import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase-config';

interface Offer {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  fromUserId: string;
  toUserId: string;
  amount: number;
  updatedAt: any;
  [key: string]: any;
}

/**
 * Cost-efficient hook for managing offers using direct Firestore queries
 * Eliminates API calls and uses real-time listeners for instant updates
 */
export function useFirestoreOffers() {
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!userData?.id || !db) {
      setLoading(false);
      return;
    }

    const unsubscribes: Array<() => void> = [];

    try {
      // Real-time listener for sent offers
      const sentQuery = query(
        collection(db, 'offers'),
        where('fromUserId', '==', userData.id),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
        const offers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Offer[];
        setSentOffers(offers);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching sent offers:', error);
        setError('Failed to load sent offers');
        setLoading(false);
      });
      unsubscribes.push(unsubscribeSent);

      // Real-time listener for received offers
      const receivedQuery = query(
        collection(db, 'offers'),
        where('toUserId', '==', userData.id),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
        const offers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Offer[];
        setReceivedOffers(offers);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching received offers:', error);
        setError('Failed to load received offers');
        setLoading(false);
      });
      unsubscribes.push(unsubscribeReceived);

    } catch (error) {
      console.error('Error setting up offer listeners:', error);
      setError('Failed to initialize offer tracking');
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Direct Firestore update function for offer status
  const updateOfferStatus = async (offerId: string, status: 'accepted' | 'declined' | 'cancelled') => {
    if (!db) throw new Error('Firestore not initialized');
    
    const offerRef = doc(db, 'offers', offerId);
    await updateDoc(offerRef, {
      status,
      updatedAt: Timestamp.now()
    });
  };

  const allOffers = [...sentOffers, ...receivedOffers].sort((a, b) => {
    const aTime = a.updatedAt?.seconds || 0;
    const bTime = b.updatedAt?.seconds || 0;
    return bTime - aTime;
  });

  return {
    sentOffers,
    receivedOffers,
    allOffers,
    loading,
    error,
    updateOfferStatus
  };
}
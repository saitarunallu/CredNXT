// Direct Firestore access for production fallback
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const db = getFirestore();

// Get offer directly from Firestore (fallback when API is unavailable)
export const getOfferDirect = async (offerId: string, currentUser: User | null) => {
  if (!currentUser) {
    throw new Error('Authentication required');
  }

  try {
    // Get the offer document
    const offerDoc = await getDoc(doc(db, 'offers', offerId));
    
    if (!offerDoc.exists()) {
      throw new Error('Offer not found');
    }

    const offerData = offerDoc.data();
    
    // Get current user data for authorization
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : null;
    
    // Check authorization: user can view offer if they are creator, recipient by ID, or recipient by phone
    const isAuthorized = 
      offerData.fromUserId === currentUser.uid ||
      offerData.toUserId === currentUser.uid ||
      (currentUserData && offerData.toUserPhone === currentUserData.phone);
    
    if (!isAuthorized) {
      console.log(`Direct Firestore authorization failed for user ${currentUser.uid}:`, {
        fromUserId: offerData.fromUserId,
        toUserId: offerData.toUserId,
        toUserPhone: offerData.toUserPhone,
        userPhone: currentUserData?.phone
      });
      throw new Error('Unauthorized to view this offer');
    }
    
    // Get the user who created the offer
    let fromUser = null;
    if (offerData.fromUserId) {
      const fromUserDoc = await getDoc(doc(db, 'users', offerData.fromUserId));
      if (fromUserDoc.exists()) {
        fromUser = fromUserDoc.data();
      }
    }
    
    // Get payments for this offer
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('offerId', '==', offerId),
      orderBy('createdAt', 'asc')
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      offer: { id: offerDoc.id, ...offerData },
      fromUser,
      payments
    };
    
  } catch (error) {
    console.error('Direct Firestore offer fetch error:', error);
    throw error;
  }
};

// Get user's offers directly from Firestore
export const getOffersDirect = async (currentUser: User | null) => {
  if (!currentUser) {
    throw new Error('Authentication required');
  }

  try {
    // Get offers created by user
    const sentOffersQuery = query(
      collection(db, 'offers'),
      where('fromUserId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    // Get offers received by user
    const receivedOffersQuery = query(
      collection(db, 'offers'),
      where('toUserId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const [sentOffersSnapshot, receivedOffersSnapshot] = await Promise.all([
      getDocs(sentOffersQuery),
      getDocs(receivedOffersQuery)
    ]);
    
    const sentOffers = sentOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const receivedOffers = receivedOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      sent: sentOffers,
      received: receivedOffers
    };
    
  } catch (error) {
    console.error('Direct Firestore offers fetch error:', error);
    throw error;
  }
};
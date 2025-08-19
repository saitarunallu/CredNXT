import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OfferCard from "@/components/offers/offer-card";
import { Clock, Send, Inbox, Filter, IndianRupee, TrendingUp, FileText, AlertCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firebaseAuthService } from "@/lib/firebase-auth";

export default function OffersPage() {
  const [location, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Helper function to convert Firebase timestamps
  const convertFirebaseTimestamps = (data: any) => {
    if (!data) return data;
    
    const converted = { ...data };
    const timestampFields = ['createdAt', 'updatedAt', 'startDate', 'dueDate', 'nextPaymentDueDate'];
    
    timestampFields.forEach(field => {
      if (converted[field]) {
        // Handle Firebase Timestamp objects
        if (converted[field]._seconds !== undefined) {
          converted[field] = new Date(converted[field]._seconds * 1000 + (converted[field]._nanoseconds || 0) / 1000000);
        } else if (converted[field].toDate && typeof converted[field].toDate === 'function') {
          converted[field] = converted[field].toDate();
        } else if (typeof converted[field] === 'string') {
          converted[field] = new Date(converted[field]);
        }
      }
    });
    
    return converted;
  };

  // Fetch offers directly from Firebase with enhanced error handling
  const { data: offersData, error: offersError } = useQuery({
    queryKey: ['offers', 'firebase'],
    queryFn: async () => {
      let retryCount = 0;
      const maxRetries = 3;
      
      const executeWithRetry = async () => {
        try {
          const currentUser = firebaseAuthService.getUser();
          console.log('🔍 Current user in offers page:', currentUser);
          if (!currentUser?.id) {
            throw new Error('User not authenticated');
          }

          const db = getFirestore();
          console.log('📊 Querying offers for user:', currentUser.id);
          console.log('📱 User phone:', currentUser.phone);
          console.log('👤 User name:', currentUser.name);
          
          // Log known user IDs from production for debugging
          const knownUserIds = ['OXryhvycCzXImCJGGyZXCk89yaY2', 'bVWBKaib0IbS3VSkLKoSeOQ4YY03', 'xt8OK1z2PifGrAkeDA2OUVjSlLW2'];
          console.log('🔍 Known production user IDs:', knownUserIds);
          console.log('🔍 Current user matches known ID:', knownUserIds.includes(currentUser.id));
          console.log('🔍 Current user full details:', JSON.stringify(currentUser, null, 2));
          
          // In production, temporarily show sample data if no user-specific offers found
          let shouldShowSampleData = false;
          
          // Get sent offers (avoid orderBy to prevent index issues)
          const sentQuery = query(
            collection(db, 'offers'),
            where('fromUserId', '==', currentUser.id)
          );
          const sentSnapshot = await getDocs(sentQuery);
          console.log(`📤 Found ${sentSnapshot.docs.length} sent offers for user ${currentUser.id}`);
          const sentOffers = sentSnapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('📤 Sent offer data:', data);
            return convertFirebaseTimestamps(data);
          });
          
          // Get received offers - try both toUserId and toUserPhone with multiple phone formats
          let receivedOffers = [];
          
          // First try by toUserId (preferred method)
          const receivedByIdQuery = query(
            collection(db, 'offers'),
            where('toUserId', '==', currentUser.id)
          );
          const receivedByIdSnapshot = await getDocs(receivedByIdQuery);
          receivedOffers = receivedByIdSnapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            return convertFirebaseTimestamps(data);
          });
          
          console.log(`📥 Found ${receivedOffers.length} received offers by toUserId for user ${currentUser.id}`);
          
          // If no offers found by ID, try by phone number with different formats
          if (receivedOffers.length === 0) {
            console.log(`No offers found by toUserId, trying phone lookup for: ${currentUser.phone}`);
            const phoneVariants = [
              currentUser.phone,
              currentUser.phone.replace(/^\+91/, ''), // Remove +91 prefix
              currentUser.phone.replace(/\D/g, ''), // Remove all non-digits
              `+91${currentUser.phone.replace(/\D/g, '')}` // Add +91 prefix
            ];
            
            for (const phoneVariant of phoneVariants) {
              if (receivedOffers.length > 0) break; // Stop if we found offers
              
              console.log(`Trying phone variant: ${phoneVariant}`);
              const receivedByPhoneQuery = query(
                collection(db, 'offers'),
                where('toUserPhone', '==', phoneVariant)
              );
              const receivedByPhoneSnapshot = await getDocs(receivedByPhoneQuery);
              const phoneOffers = receivedByPhoneSnapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() };
                return convertFirebaseTimestamps(data);
              });
              
              console.log(`Found ${phoneOffers.length} offers for phone variant: ${phoneVariant}`);
              receivedOffers = [...receivedOffers, ...phoneOffers];
            }
            
            // Remove duplicates if any
            const uniqueOffers = receivedOffers.filter((offer, index, self) => 
              index === self.findIndex(o => o.id === offer.id)
            );
            receivedOffers = uniqueOffers;
          }
          
          // Sort on client side
          sentOffers.sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
          
          receivedOffers.sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
          
          console.log('📊 Final offers summary:', {
            totalSent: sentOffers.length,
            totalReceived: receivedOffers.length,
            userId: currentUser.id,
            userPhone: currentUser.phone
          });
          
          // Always show actual offers if user matches known production accounts
          const isKnownUser = knownUserIds.includes(currentUser.id);
          console.log('🔍 Is known user:', isKnownUser);
          
          // If no user-specific offers found, check if user ID matches production accounts
          if ((sentOffers.length === 0 && receivedOffers.length === 0) && window.location.hostname.includes('web.app')) {
            if (isKnownUser) {
              console.log('🔧 Known user with no offers, trying alternative queries');
              
              // For known users, try all possible queries
              const allOffersQuery = query(collection(db, 'offers'));
              const allOffersSnapshot = await getDocs(allOffersQuery);
              const allOffers = allOffersSnapshot.docs.map(doc => ({
                id: doc.id, 
                ...(doc.data() as any)
              }));
              
              // Find offers for this specific user by any means
              const phoneVariants = currentUser.phone ? [
                currentUser.phone,
                currentUser.phone.replace(/^\+91/, ''),
                currentUser.phone.replace(/\D/g, ''),
                `+91${currentUser.phone.replace(/\D/g, '')}`
              ] : [];
              
              console.log('📱 Phone variants to check:', phoneVariants);
              
              const userOffers = allOffers.filter((offer: any) => {
                const matchesFromUser = offer.fromUserId === currentUser.id;
                const matchesToUser = offer.toUserId === currentUser.id;
                const matchesToPhone = phoneVariants.some(variant => 
                  offer.toUserPhone === variant || 
                  offer.toUserPhone === variant.replace(/^\+91/, '') ||
                  offer.toUserPhone === variant.replace(/\D/g, '') ||
                  `+91${offer.toUserPhone}` === variant
                );
                
                const isMatch = matchesFromUser || matchesToUser || matchesToPhone;
                
                if (isMatch) {
                  console.log(`✅ Matched offer ${offer.id}:`, {
                    fromUserId: offer.fromUserId,
                    toUserId: offer.toUserId,
                    toUserPhone: offer.toUserPhone,
                    matchesFromUser,
                    matchesToUser,
                    matchesToPhone,
                    status: offer.status
                  });
                }
                
                return isMatch;
              });
              
              const userSentOffers = userOffers.filter((offer: any) => offer.fromUserId === currentUser.id);
              const userReceivedOffers = userOffers.filter((offer: any) => 
                offer.toUserId === currentUser.id || 
                (currentUser.phone && [
                  currentUser.phone,
                  currentUser.phone.replace(/^\+91/, ''),
                  currentUser.phone.replace(/\D/g, ''),
                  `+91${currentUser.phone.replace(/\D/g, '')}`
                ].includes(offer.toUserPhone))
              );
              
              console.log(`🎯 Found ${userOffers.length} offers for known user ${currentUser.id}`);
              console.log(`📤 User sent offers: ${userSentOffers.length}`);
              console.log(`📥 User received offers: ${userReceivedOffers.length}`);
              
              if (userOffers.length > 0) {
                return { 
                  sentOffers: userSentOffers.map(convertFirebaseTimestamps), 
                  receivedOffers: userReceivedOffers.map(convertFirebaseTimestamps)
                };
              }
            }
            console.log('🔧 No user-specific offers found in production, querying all offers for demo');
            
            // Get all offers as sample data
            const allOffersQuery = query(collection(db, 'offers'));
            const allOffersSnapshot = await getDocs(allOffersQuery);
            const allOffers = allOffersSnapshot.docs.map(doc => {
              const data = { id: doc.id, ...doc.data() };
              return convertFirebaseTimestamps(data);
            });
            
            console.log(`📄 Found ${allOffers.length} total offers for sample display`);
            
            // Split into sent/received for demo purposes
            const demoSentOffers = allOffers.filter(offer => offer.status === 'pending').slice(0, 2);
            const demoReceivedOffers = allOffers.filter(offer => offer.status === 'accepted').slice(0, 2);
            
            return { 
              sentOffers: demoSentOffers, 
              receivedOffers: demoReceivedOffers,
              isDemo: true
            };
          }
          
          return { sentOffers, receivedOffers };
        } catch (error: any) {
          if (retryCount < maxRetries && (
            error.code === 'unavailable' || 
            error.code === 'deadline-exceeded' || 
            error.code === 'resource-exhausted'
          )) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            console.warn(`Firebase query attempt ${retryCount} failed, retrying in ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            return executeWithRetry();
          }
          
          console.error('Error fetching offers:', error);
          throw error;
        }
      };
      
      return executeWithRetry();
    },
    retry: false, // We handle retries internally
    staleTime: 30000,
  });

  const sentOffers = offersData?.sentOffers || [];
  const receivedOffers = offersData?.receivedOffers || [];
  const isDemo = offersData?.isDemo || false;

  // Debug: Log offers data only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Offers Debug:', { sentOffers, receivedOffers, location, activeFilter });
  }

  // Handle query errors
  useEffect(() => {
    if (offersError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Offers page error:', offersError);
      }
    }
  }, [offersError]);

  // Parse filter from URL query parameters and sessionStorage
  useEffect(() => {
    const updateFilterFromUrl = () => {
      // First check if there's a pending filter from navigation
      const pendingFilter = sessionStorage.getItem('pendingFilter');
      if (pendingFilter) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Found pending filter from sessionStorage:', pendingFilter);
        }
        setActiveFilter(pendingFilter);
        // Update URL to match the filter
        window.history.replaceState({}, '', `/offers?filter=${pendingFilter}`);
        // Clear the pending filter
        sessionStorage.removeItem('pendingFilter');
        return;
      }

      // Otherwise, parse from URL
      const currentUrl = window.location.href;
      const urlObj = new URL(currentUrl);
      const filter = urlObj.searchParams.get('filter');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Current URL:', currentUrl);
        console.log('Current location (wouter):', location);
        console.log('Parsed filter from URL:', filter);
        console.log('All URL params:', Object.fromEntries(urlObj.searchParams.entries()));
      }
      
      setActiveFilter(filter);
    };

    // Initial load and on location change
    updateFilterFromUrl();

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      updateFilterFromUrl();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location]);

  // Calculate filtered offers based on actual offer status (likely 'pending' not 'accepted')
  const filteredOffers = useMemo(() => {
    const allOffers = [...sentOffers, ...receivedOffers];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Filtering with activeFilter:', activeFilter);
      console.log('All offers count:', allOffers.length);
    }
    
    if (!activeFilter) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No active filter, returning all offers');
      }
      return allOffers;
    }
    
    let filtered = [];
    switch (activeFilter) {
      case 'lent':
        // Money I gave out: sent lend offers + received borrow offers
        const sentLendOffers = sentOffers.filter((offer: any) => offer.offerType === 'lend');
        const receivedBorrowOffers = receivedOffers.filter((offer: any) => offer.offerType === 'borrow');
        filtered = [...sentLendOffers, ...receivedBorrowOffers];
        if (process.env.NODE_ENV === 'development') {
          console.log('Lent filter - sent lend:', sentLendOffers.length, 'received borrow:', receivedBorrowOffers.length, 'total:', filtered.length);
        }
        return filtered;
      
      case 'borrowed':
        // Money I received: sent borrow offers + received lend offers
        const sentBorrowOffers = sentOffers.filter((offer: any) => offer.offerType === 'borrow');
        const receivedLendOffers = receivedOffers.filter((offer: any) => offer.offerType === 'lend');
        filtered = [...sentBorrowOffers, ...receivedLendOffers];
        if (process.env.NODE_ENV === 'development') {
          console.log('Borrowed filter - sent borrow:', sentBorrowOffers.length, 'received lend:', receivedLendOffers.length, 'total:', filtered.length);
        }
        return filtered;
      
      case 'active':
        // All accepted offers
        filtered = allOffers.filter((offer: any) => 
          offer.status && offer.status !== 'pending' && offer.status !== 'rejected'
        );
        if (process.env.NODE_ENV === 'development') {
          console.log('Active filter - total:', filtered.length);
        }
        return filtered;
      
      case 'pending':
        filtered = allOffers.filter((offer: any) => 
          !offer.status || offer.status === 'pending'
        );
        if (process.env.NODE_ENV === 'development') {
          console.log('Pending filter - total:', filtered.length);
        }
        return filtered;
      
      case 'completed':
        filtered = allOffers.filter((offer: any) => 
          offer.status === 'completed' || offer.status === 'closed'
        );
        if (process.env.NODE_ENV === 'development') {
          console.log('Completed filter - total:', filtered.length);
        }
        return filtered;
      
      default:
        if (process.env.NODE_ENV === 'development') {
          console.log('Unknown filter:', activeFilter, 'returning all offers');
        }
        return allOffers;
    }
  }, [sentOffers, receivedOffers, activeFilter]);

  const pendingOffers = [...sentOffers, ...receivedOffers].filter(
    (offer: any) => !offer.status || offer.status === 'pending'
  );

  // Clear filter
  const clearFilter = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Clear filter called');
    }
    window.history.pushState({}, '', '/offers');
    setActiveFilter(null);
  };

  // Navigate to filter
  const navigateToFilter = (filter: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Navigating to filter: ${filter}`);
    }
    window.history.pushState({}, '', `/offers?filter=${filter}`);
    setActiveFilter(filter);
  };

  // Get filter display info
  const getFilterInfo = () => {
    switch (activeFilter) {
      case 'lent':
        return { title: 'Lent Offers', subtitle: 'Money you have given out', color: 'text-emerald-600 bg-emerald-50' };
      case 'borrowed':
        return { title: 'Borrowed Offers', subtitle: 'Money you have received', color: 'text-blue-600 bg-blue-50' };
      case 'active':
        return { title: 'Active Offers', subtitle: 'Currently ongoing agreements', color: 'text-purple-600 bg-purple-50' };
      case 'pending':
        return { title: 'Pending Offers', subtitle: 'Awaiting approval', color: 'text-orange-600 bg-orange-50' };
      case 'completed':
        return { title: 'Completed Offers', subtitle: 'Finished agreements', color: 'text-green-600 bg-green-50' };
      default:
        return null;
    }
  };

  const filterInfo = getFilterInfo();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Demo notification */}
        {isDemo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Demo Mode</p>
                <p className="text-blue-700">You're viewing sample offers. To see your actual offers, log in with one of the test accounts: +919876543210, +919876543211, or +919676561932</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {filterInfo ? filterInfo.title : 'My Offers'}
              </h1>
              <p className="text-gray-600">
                {filterInfo ? filterInfo.subtitle : 'Manage all your lending offers and requests'}
              </p>
            </div>
            {activeFilter && (
              <Button 
                variant="outline" 
                onClick={clearFilter}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filter
              </Button>
            )}
          </div>
          
          {/* Simplified Filter Tabs */}
          <div className="border-b border-gray-200 overflow-x-auto overflow-y-hidden filter-scroll-container">
            <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max" aria-label="Tabs">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('All filter clicked');
                  }
                  clearFilter();
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  !activeFilter
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All ({sentOffers.length + receivedOffers.length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Lent filter clicked');
                  }
                  navigateToFilter('lent');
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'lent'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Lent ({sentOffers.filter((offer: any) => offer.offerType === 'lend').length + receivedOffers.filter((offer: any) => offer.offerType === 'borrow').length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Borrowed filter clicked');
                  }
                  navigateToFilter('borrowed');
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'borrowed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Borrowed ({sentOffers.filter((offer: any) => offer.offerType === 'borrow').length + receivedOffers.filter((offer: any) => offer.offerType === 'lend').length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Pending filter clicked');
                  }
                  navigateToFilter('pending');
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'pending'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending ({pendingOffers.length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Active filter clicked');
                  }
                  navigateToFilter('active');
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'active'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active ({[...sentOffers, ...receivedOffers].filter((offer: any) => offer.status === 'accepted' || offer.status === 'active').length})
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Completed filter clicked');
                  }
                  navigateToFilter('completed');
                }}
                className={`filter-button flex-shrink-0 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'completed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Completed ({[...sentOffers, ...receivedOffers].filter((offer: any) => offer.status === 'completed' || offer.status === 'closed').length})
              </button>
            </nav>
          </div>
          
          {activeFilter && (
            <div className="mt-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${filterInfo?.color}`}>
                <Filter className="w-3 h-3 mr-1" />
                {filteredOffers.length} {activeFilter} offers
              </div>
            </div>
          )}
        </div>



        {/* Offers Display */}
        {activeFilter ? (
          // Filtered View
          <div className="space-y-4">
            {filteredOffers.length > 0 ? (
              <div className="space-y-3">
                {filteredOffers.map((offer: any) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    fromUser={offer.fromUser || null}
                    totalPaid={offer.totalPaid}
                    isReceived={!!offer.fromUser}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeFilter} offers found</h3>
                <p className="text-gray-500 mb-4">
                  {activeFilter === 'pending' && 'All offers have been processed'}
                  {activeFilter === 'lent' && 'You haven\'t lent any money yet'}
                  {activeFilter === 'borrowed' && 'You haven\'t borrowed any money yet'}
                  {activeFilter === 'active' && 'No active offers at the moment'}
                  {activeFilter === 'completed' && 'No completed offers found'}
                </p>
                <Button variant="outline" onClick={clearFilter}>
                  View All Offers
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Default View: Sent and Received in Columns
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sent Offers */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Send className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">My Sent Offers</h2>
                <span className="text-sm text-gray-500">({sentOffers.length})</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Offers you created</p>
              <div className="space-y-3">
                {sentOffers.length > 0 ? (
                  sentOffers.map((offer: any) => (
                    <OfferCard 
                      key={offer.id} 
                      offer={offer} 
                      isReceived={false}
                    />
                  ))
                ) : (
                  <Card className="bg-white border-0 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">No sent offers yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Received Offers */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Inbox className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Received Offers</h2>
                <span className="text-sm text-gray-500">({receivedOffers.length})</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Offers sent to you</p>
              <div className="space-y-3">
                {receivedOffers.length > 0 ? (
                  receivedOffers.map((offer: any) => (
                    <OfferCard 
                      key={offer.id} 
                      offer={offer} 
                      fromUser={offer.fromUser}
                      isReceived={true}
                    />
                  ))
                ) : (
                  <Card className="bg-white border-0 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">No received offers yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
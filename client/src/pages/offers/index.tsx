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

import { firebaseAuthService } from "@/lib/firebase-auth";
import { firebaseBackend } from "@/lib/firebase-backend-service";

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

  // Fetch offers using unified data service (same as dashboard)
  const { data: offersData, isLoading: offersLoading, error: offersError } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const currentUser = firebaseAuthService.getUser();
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Get all offers (sent and received) using the same method as dashboard
      const allOffers = await firebaseBackend.getOffers();
      
      // Normalize phone number for comparison
      const normalizePhone = (phone: string | undefined) => {
        if (!phone) return '';
        return phone.replace(/^\+91/, '').replace(/\D/g, '');
      };
      
      const currentUserPhone = normalizePhone(currentUser.phone);

      // Separate sent and received offers
      const sentOffers = allOffers.filter((offer: any) => offer.fromUserId === currentUser.id);
      const receivedOffers = allOffers.filter((offer: any) => 
        offer.toUserId === currentUser.id || 
        (currentUserPhone && normalizePhone(offer.toUserPhone) === currentUserPhone)
      );

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Offers Page Debug:', {
          totalOffers: allOffers.length,
          currentUserId: currentUser.id,
          currentUserPhone: currentUser.phone,
          normalizedPhone: currentUserPhone,
          sentCount: sentOffers.length,
          receivedCount: receivedOffers.length,
          sentOffers: sentOffers.map((o: any) => ({ id: o.id, fromUserId: o.fromUserId, toUserPhone: o.toUserPhone })),
          receivedOffers: receivedOffers.map((o: any) => ({ id: o.id, fromUserId: o.fromUserId, toUserId: o.toUserId, toUserPhone: o.toUserPhone }))
        });
      }

      return {
        sentOffers: sentOffers || [],
        receivedOffers: receivedOffers || []
      };
    },
    staleTime: 30000 // 30 seconds
  });

  const sentOffers = offersData?.sentOffers || [];
  const receivedOffers = offersData?.receivedOffers || [];

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
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

export default function OffersPage() {
  const [location, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const { data: offersData } = useQuery({
    queryKey: ['/api/offers'],
  });

  const sentOffers = (offersData as any)?.sentOffers || [];
  const receivedOffers = (offersData as any)?.receivedOffers || [];

  // Debug: Log offers data to understand structure
  console.log('Offers Debug:', { sentOffers, receivedOffers, location, activeFilter });

  // Parse filter from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const filter = params.get('filter');
    setActiveFilter(filter);
  }, [location]);

  // Calculate filtered offers based on actual offer status (likely 'pending' not 'accepted')
  const filteredOffers = useMemo(() => {
    const allOffers = [...sentOffers, ...receivedOffers];
    
    if (!activeFilter) return allOffers;
    
    switch (activeFilter) {
      case 'lent':
        // Money I gave out: sent lend offers + received borrow offers
        return [
          ...sentOffers.filter((item: any) => item.offer.offerType === 'lend'),
          ...receivedOffers.filter((item: any) => item.offer.offerType === 'borrow')
        ];
      
      case 'borrowed':
        // Money I received: sent borrow offers + received lend offers
        return [
          ...sentOffers.filter((item: any) => item.offer.offerType === 'borrow'),
          ...receivedOffers.filter((item: any) => item.offer.offerType === 'lend')
        ];
      
      case 'active':
        // All accepted offers
        return allOffers.filter((item: any) => 
          item.offer.status && item.offer.status !== 'pending' && item.offer.status !== 'rejected'
        );
      
      case 'pending':
        return allOffers.filter((item: any) => 
          !item.offer.status || item.offer.status === 'pending'
        );
      
      default:
        return allOffers;
    }
  }, [sentOffers, receivedOffers, activeFilter]);

  const pendingOffers = [...sentOffers, ...receivedOffers].filter(
    (item: any) => !item.offer.status || item.offer.status === 'pending'
  );

  // Clear filter
  const clearFilter = () => {
    setLocation('/offers');
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
      default:
        return null;
    }
  };

  const filterInfo = getFilterInfo();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 relative z-10" aria-label="Tabs">
              <button
                onClick={clearFilter}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  !activeFilter
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Offers ({sentOffers.length + receivedOffers.length})
              </button>
              <button
                onClick={() => {
                  console.log('Pending filter clicked');
                  setLocation('/offers?filter=pending');
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'pending'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                Pending ({pendingOffers.length})
              </button>
              <button
                onClick={() => {
                  console.log('Lent filter clicked');
                  setLocation('/offers?filter=lent');
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'lent'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                Lent ({sentOffers.filter((item: any) => item.offer.offerType === 'lend').length + receivedOffers.filter((item: any) => item.offer.offerType === 'borrow').length})
              </button>
              <button
                onClick={() => {
                  console.log('Borrowed filter clicked');
                  setLocation('/offers?filter=borrowed');
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeFilter === 'borrowed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                Borrowed ({sentOffers.filter((item: any) => item.offer.offerType === 'borrow').length + receivedOffers.filter((item: any) => item.offer.offerType === 'lend').length})
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
                {filteredOffers.map((item: any) => (
                  <OfferCard
                    key={item.offer.id}
                    offer={item.offer}
                    fromUser={item.fromUser || null}
                    totalPaid={item.totalPaid}
                    isReceived={!!item.fromUser}
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
                  sentOffers.map((item: any) => (
                    <OfferCard 
                      key={item.offer.id} 
                      offer={item.offer} 
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
                  receivedOffers.map((item: any) => (
                    <OfferCard 
                      key={item.offer.id} 
                      offer={item.offer} 
                      fromUser={item.fromUser}
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
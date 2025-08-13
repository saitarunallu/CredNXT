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
  const [location, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const { data: offersData } = useQuery({
    queryKey: ['/api/offers'],
  });

  const sentOffers = (offersData as any)?.sentOffers || [];
  const receivedOffers = (offersData as any)?.receivedOffers || [];

  // Parse filter from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const filter = params.get('filter');
    setActiveFilter(filter);
  }, [location]);

  // Calculate filtered offers based on money flow perspective
  const filteredOffers = useMemo(() => {
    const allOffers = [...sentOffers, ...receivedOffers];
    
    if (!activeFilter) return allOffers;
    
    switch (activeFilter) {
      case 'lent':
        // Money I gave out: sent lend offers (accepted) + received borrow offers (accepted)
        return [
          ...sentOffers.filter((item: any) => 
            item.offer.offerType === 'lend' && item.offer.status === 'accepted'
          ),
          ...receivedOffers.filter((item: any) => 
            item.offer.offerType === 'borrow' && item.offer.status === 'accepted'
          )
        ];
      
      case 'borrowed':
        // Money I received: sent borrow offers (accepted) + received lend offers (accepted)
        return [
          ...sentOffers.filter((item: any) => 
            item.offer.offerType === 'borrow' && item.offer.status === 'accepted'
          ),
          ...receivedOffers.filter((item: any) => 
            item.offer.offerType === 'lend' && item.offer.status === 'accepted'
          )
        ];
      
      case 'active':
        return allOffers.filter((item: any) => item.offer.status === 'accepted');
      
      case 'pending':
        return allOffers.filter((item: any) => item.offer.status === 'pending');
      
      default:
        return allOffers;
    }
  }, [sentOffers, receivedOffers, activeFilter]);

  const pendingOffers = [...sentOffers, ...receivedOffers].filter(
    (item: any) => item.offer.status === 'pending'
  );

  // Clear filter
  const clearFilter = () => {
    navigate('/offers');
    setActiveFilter(null);
  };

  // Get filter display info
  const getFilterInfo = () => {
    switch (activeFilter) {
      case 'lent':
        return { title: 'Lent Offers', subtitle: 'Money you have given out', icon: IndianRupee, color: 'emerald' };
      case 'borrowed':
        return { title: 'Borrowed Offers', subtitle: 'Money you have received', icon: TrendingUp, color: 'blue' };
      case 'active':
        return { title: 'Active Offers', subtitle: 'Currently ongoing agreements', icon: FileText, color: 'purple' };
      case 'pending':
        return { title: 'Pending Offers', subtitle: 'Awaiting approval', icon: AlertCircle, color: 'orange' };
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
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
          
          {/* Filter Buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant={!activeFilter ? "default" : "outline"}
              onClick={clearFilter}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              All Offers
            </Button>
            <Button
              variant={activeFilter === 'lent' ? "default" : "outline"}
              onClick={() => navigate('/offers?filter=lent')}
              className="flex items-center gap-2"
            >
              <IndianRupee className="w-4 h-4" />
              Lent
            </Button>
            <Button
              variant={activeFilter === 'borrowed' ? "default" : "outline"}
              onClick={() => navigate('/offers?filter=borrowed')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Borrowed
            </Button>
            <Button
              variant={activeFilter === 'active' ? "default" : "outline"}
              onClick={() => navigate('/offers?filter=active')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Active
            </Button>
            <Button
              variant={activeFilter === 'pending' ? "default" : "outline"}
              onClick={() => navigate('/offers?filter=pending')}
              className="flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Pending
            </Button>
          </div>
          
          {activeFilter && (
            <div className="mt-4">
              <Badge variant="outline" className={`text-${filterInfo?.color}-600 border-${filterInfo?.color}-200 bg-${filterInfo?.color}-50`}>
                <Filter className="w-3 h-3 mr-1" />
                Showing {filteredOffers.length} {activeFilter} offers
              </Badge>
            </div>
          )}
        </div>

        {/* Interactive Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card 
            className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate('/offers')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{sentOffers.length}</p>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate('/offers')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <Inbox className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{receivedOffers.length}</p>
              <p className="text-sm text-gray-500">Received</p>
              <p className="text-xs text-green-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate('/offers?filter=pending')}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{pendingOffers.length}</p>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xs text-orange-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtered Offers or Regular Lists */}
        {activeFilter ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {filterInfo?.title} ({filteredOffers.length})
              </h2>
            </div>
            
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
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No {activeFilter} offers found</p>
                  <Button variant="outline" onClick={clearFilter} className="mt-4">
                    View All Offers
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sent Offers */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Send className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">My Sent Offers</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Offers you created (loans you requested or money you offered to lend)</p>
              <div className="space-y-4">
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
              </div>
              <p className="text-sm text-gray-600 mb-4">Offers sent to you (people wanting to lend you money or asking to borrow from you)</p>
              <div className="space-y-4">
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
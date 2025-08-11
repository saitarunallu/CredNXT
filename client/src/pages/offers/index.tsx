import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OfferCard from "@/components/offers/offer-card";
import { Clock, Send, Inbox } from "lucide-react";

export default function OffersPage() {
  const { data: offersData } = useQuery({
    queryKey: ['/api/offers'],
  });

  const sentOffers = (offersData as any)?.sentOffers || [];
  const receivedOffers = (offersData as any)?.receivedOffers || [];

  const pendingOffers = [...sentOffers, ...receivedOffers].filter(
    (item: any) => item.offer.status === 'pending'
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Offers</h1>
          <p className="text-gray-600">Manage all your lending offers and requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{sentOffers.length}</p>
              <p className="text-sm text-gray-500">Sent</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Inbox className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{receivedOffers.length}</p>
              <p className="text-sm text-gray-500">Received</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{pendingOffers.length}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Offers Lists */}
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
      </div>
      
      <BottomNav />
    </div>
  );
}
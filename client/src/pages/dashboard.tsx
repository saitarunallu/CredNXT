import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OfferCard from "@/components/offers/offer-card";
import { IndianRupee, Plus, Users, FileText, TrendingUp, AlertCircle, Clock, Receipt } from "lucide-react";

export default function Dashboard() {
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close FAB menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setFabOpen(false);
      }
    };

    if (fabOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fabOpen]);

  const { data: statsData } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: offersData } = useQuery({
    queryKey: ['/api/offers'],
  });

  const stats = (statsData as any)?.stats || {
    totalLent: 0,
    totalBorrowed: 0,
    activeOffers: 0,
    pendingOffers: 0
  };

  const sentOffers = (offersData as any)?.sentOffers || [];
  const receivedOffers = (offersData as any)?.receivedOffers || [];

  const recentOffers = [...sentOffers, ...receivedOffers]
    .sort((a, b) => new Date(b.offer.createdAt).getTime() - new Date(a.offer.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your lending and borrowing activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Lent</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalLent.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Borrowed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalBorrowed.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeOffers}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingOffers}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/offers/create">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Create Offer</h3>
                    <p className="text-xs text-gray-500">New agreement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Analytics</h3>
                  <p className="text-xs text-gray-500">View trends</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Reports</h3>
                  <p className="text-xs text-gray-500">View analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Offers */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Badge variant="outline" className="text-xs">{recentOffers.length} offers</Badge>
            </div>
            
            {recentOffers.length > 0 ? (
              <div className="space-y-3">
                {recentOffers.map((item) => (
                  <OfferCard
                    key={item.offer.id}
                    offer={item.offer}
                    contact={item.contact}
                    fromUser={item.fromUser}
                    totalPaid={item.totalPaid}
                    isReceived={!!item.fromUser}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">No offers yet</h3>
                  <p className="text-gray-600 mb-4">Create your first offer to get started</p>
                  <Link href="/offers/create">
                    <Button variant="outline">Create Offer</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Offers Sent</span>
                    <span className="text-sm font-semibold text-gray-900">{sentOffers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Offers Received</span>
                    <span className="text-sm font-semibold text-gray-900">{receivedOffers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-semibold text-green-600">
                      {sentOffers.length > 0 ? 
                        Math.round((sentOffers.filter((o: any) => o.offer.status === 'accepted').length / sentOffers.length) * 100) : 0
                      }%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">No payments due in the next 7 days</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAB Button with Menu */}
        <div ref={fabRef} className="fixed bottom-6 right-6 z-50">
          {/* FAB Menu Options */}
          {fabOpen && (
            <div className="absolute bottom-16 right-0 space-y-3 mb-2">
              <Link href="/offers/create">
                <div className="flex items-center space-x-3 group">
                  <span className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    New Offer
                  </span>
                  <Button 
                    size="icon" 
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => setFabOpen(false)}
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </Link>

              <div className="flex items-center space-x-3 group cursor-pointer">
                <span className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Pending Offers
                </span>
                <Button 
                  size="icon" 
                  className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setFabOpen(false)}
                >
                  <Clock className="w-5 h-5 text-white" />
                </Button>
              </div>

              <div className="flex items-center space-x-3 group cursor-pointer">
                <span className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Transactions
                </span>
                <Button 
                  size="icon" 
                  className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setFabOpen(false)}
                >
                  <Receipt className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          )}

          {/* Main FAB Button */}
          <Button 
            className={`w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 p-0 ${fabOpen ? 'rotate-45' : 'rotate-0'}`}
            onClick={() => setFabOpen(!fabOpen)}
          >
            <Plus className="w-6 h-6 text-white transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </div>
  );
}

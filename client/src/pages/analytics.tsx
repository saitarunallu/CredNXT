import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, IndianRupee, Users, Calendar } from "lucide-react";

export default function Analytics() {
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

  const successRate = sentOffers.length > 0 ? 
    Math.round((sentOffers.filter((o: any) => o.status === 'accepted').length / sentOffers.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-600">Track your lending performance and trends</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Volume</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(stats.totalLent + stats.totalBorrowed).toLocaleString()}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Deals</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.activeOffers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pendingOffers}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Lending Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount Lent</span>
                  <span className="font-semibold">₹{stats.totalLent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Offers Sent</span>
                  <span className="font-semibold">{sentOffers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accepted</span>
                  <span className="font-semibold text-green-600">
                    {sentOffers.filter((o: any) => o.status === 'accepted').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Borrowing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount Borrowed</span>
                  <span className="font-semibold">₹{stats.totalBorrowed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Offers Received</span>
                  <span className="font-semibold">{receivedOffers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accepted</span>
                  <span className="font-semibold text-blue-600">
                    {receivedOffers.filter((o: any) => o.status === 'accepted').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-gray-600">Charts, trends, and detailed insights to help you make better lending decisions.</p>
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}
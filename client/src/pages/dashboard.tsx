import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OfferCard from "@/components/offers/offer-card";
import { IndianRupee, Plus, Users, FileText, TrendingUp, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: statsData } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: offersData } = useQuery({
    queryKey: ['/api/offers'],
  });

  const stats = statsData?.stats || {
    totalLent: 0,
    totalBorrowed: 0,
    activeOffers: 0,
    pendingOffers: 0
  };

  const sentOffers = offersData?.sentOffers || [];
  const receivedOffers = offersData?.receivedOffers || [];

  const recentOffers = [...sentOffers, ...receivedOffers]
    .sort((a, b) => new Date(b.offer.createdAt).getTime() - new Date(a.offer.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">Dashboard</h1>
            <p className="text-gray-700 text-lg">Manage your lending and borrowing activities</p>
          </div>
          <Link href="/offers/create">
            <Button className="btn-primary-enhanced text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Create New Offer
            </Button>
          </Link>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card-enhanced border border-white/20 shadow-lg hover:shadow-xl hover:shadow-glow transition-all transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Lent</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₹{stats.totalLent.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">
                Money you've lent to others
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card-enhanced border border-white/20 shadow-lg hover:shadow-xl hover:shadow-glow transition-all transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Borrowed</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">₹{stats.totalBorrowed.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">
                Money you've borrowed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card-enhanced border border-white/20 shadow-lg hover:shadow-xl hover:shadow-glow transition-all transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Offers</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.activeOffers}</div>
              <p className="text-xs text-muted-foreground">
                Currently active agreements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOffers}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/offers/create">
              <CardContent className="p-6 text-center">
                <Plus className="w-12 h-12 text-navy-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Create New Offer</h3>
                <p className="text-sm text-gray-600">Start a new lending or borrowing agreement</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/contacts">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Manage Contacts</h3>
                <p className="text-sm text-gray-600">Add and organize your trusted circle</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">View Reports</h3>
              <p className="text-sm text-gray-600">Track your lending activity and performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Offers */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Offers</h2>
              <Badge variant="outline">{recentOffers.length} total</Badge>
            </div>
            
            {recentOffers.length > 0 ? (
              <div className="space-y-4">
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
              <Card>
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

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Lending Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offers Sent</span>
                    <span className="font-semibold">{sentOffers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offers Received</span>
                    <span className="font-semibold">{receivedOffers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-green-600">
                      {sentOffers.length > 0 ? 
                        Math.round((sentOffers.filter(o => o.offer.status === 'accepted').length / sentOffers.length) * 100) : 0
                      }%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Dues</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">No upcoming payments in the next 7 days</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

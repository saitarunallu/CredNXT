import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OfferCard from "@/components/offers/offer-card";
import { IndianRupee, Plus, Users, AlertCircle, TrendingUp, FileText } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: offersData, isLoading: offersLoading } = useQuery({
    queryKey: ['/api/offers'],
  });

  const stats = (statsData as any)?.stats || {
    totalLent: 0,
    totalBorrowed: 0,
    activeOffers: 0,
    pendingOffers: 0
  };

  console.log('Dashboard Stats Debug:', { statsData, stats, statsLoading });

  // Click handlers for navigating to filtered offers
  const handleLentClick = () => {
    console.log('Navigating to lent filter');
    // Update URL with query parameter and navigate
    window.history.pushState({}, '', '/offers?filter=lent');
    setLocation('/offers');
    // Force a custom event to notify offers page of URL change
    window.dispatchEvent(new CustomEvent('urlChange'));
  };

  const handleBorrowedClick = () => {
    console.log('Navigating to borrowed filter');
    window.history.pushState({}, '', '/offers?filter=borrowed');
    setLocation('/offers');
    window.dispatchEvent(new CustomEvent('urlChange'));
  };

  const handleActiveClick = () => {
    console.log('Navigating to active filter');
    window.history.pushState({}, '', '/offers?filter=active');
    setLocation('/offers');
    window.dispatchEvent(new CustomEvent('urlChange'));
  };

  const handlePendingClick = () => {
    console.log('Navigating to pending filter');
    window.history.pushState({}, '', '/offers?filter=pending');
    setLocation('/offers');
    window.dispatchEvent(new CustomEvent('urlChange'));
  };

  const sentOffers = (offersData as any)?.sentOffers || [];
  const receivedOffers = (offersData as any)?.receivedOffers || [];

  const recentOffers = [...sentOffers, ...receivedOffers]
    .sort((a, b) => new Date(b.offer.createdAt).getTime() - new Date(a.offer.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Manage your lending and borrowing activities</p>
        </div>

        {/* Interactive Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            className="bg-card border-border shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            onClick={handleLentClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Lent</p>
                  <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-emerald-600 transition-colors">₹{stats.totalLent.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view lent offers</p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-full flex items-center justify-center transition-colors">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            onClick={handleBorrowedClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Borrowed</p>
                  <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-blue-600 transition-colors">₹{stats.totalBorrowed.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view borrowed offers</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            onClick={handleActiveClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p>
                  <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-purple-600 transition-colors">{stats.activeOffers}</p>
                  <p className="text-xs text-purple-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view active offers</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-full flex items-center justify-center transition-colors">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            onClick={handlePendingClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-orange-600 transition-colors">{stats.pendingOffers}</p>
                  <p className="text-xs text-orange-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to view pending offers</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/offers/create">
            <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Create Offer</h3>
                    <p className="text-xs text-muted-foreground">New agreement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Reports and Analytics cards removed */}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Offers */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                <p className="text-sm text-muted-foreground">Your latest loans and lending offers</p>
              </div>
              <Badge variant="outline" className="text-xs">{recentOffers.length} offers</Badge>
            </div>
            
            {recentOffers.length > 0 ? (
              <div className="space-y-3">
                {recentOffers.map((item) => (
                  <OfferCard
                    key={item.offer.id}
                    offer={item.offer}
                    fromUser={item.fromUser}
                    totalPaid={item.totalPaid}
                    isReceived={!!item.fromUser}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No offers yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first offer to get started</p>
                  <Link href="/offers/create">
                    <Button variant="outline">Create Offer</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            
            {/* Overview Summary Cards */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center cursor-pointer hover:bg-emerald-50 p-2 rounded transition-colors" onClick={handleLentClick}>
                  <span className="text-sm text-muted-foreground">Total Lent</span>
                  <span className="font-semibold text-emerald-600">₹{stats.totalLent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors" onClick={handleBorrowedClick}>
                  <span className="text-sm text-muted-foreground">Total Borrowed</span>
                  <span className="font-semibold text-blue-600">₹{stats.totalBorrowed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors" onClick={handleActiveClick}>
                  <span className="text-sm text-muted-foreground">Active Offers</span>
                  <span className="font-semibold text-purple-600">{stats.activeOffers}</span>
                </div>
                <div className="flex justify-between items-center cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors" onClick={handlePendingClick}>
                  <span className="text-sm text-muted-foreground">Pending Offers</span>
                  <span className="font-semibold text-orange-600">{stats.pendingOffers}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/offers/create">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Offer
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>


      </div>
      
      <BottomNav />
    </div>
  );
}

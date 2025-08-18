import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { firebaseBackend } from "@/lib/firebase-backend-service";
import { firebaseAuthService } from "@/lib/firebase-auth";
import Navbar from "@/components/layout/navbar";
import { ArrowLeft, TestTube, Plus, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

export default function TestOffersPage() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const currentUser = firebaseAuthService.getUser();

  const createTestOffer = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create test offers",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const testOffer = await firebaseBackend.createTestOffer();
      toast({
        title: "Test Offer Created",
        description: `Created test offer with ID: ${testOffer.id}`,
      });
      
      // Refresh offers list
      await loadOffers();
    } catch (error) {
      console.error('Failed to create test offer:', error);
      toast({
        title: "Error",
        description: "Failed to create test offer. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const userOffers = await firebaseBackend.getOffers();
      setOffers(userOffers);
      console.log('Loaded offers:', userOffers);
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast({
        title: "Error",
        description: "Failed to load offers. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TestTube className="w-6 h-6" />
              Test Offers Page
            </h1>
            <p className="text-gray-600">Create and view test offers for development</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Test Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Test Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                onClick={createTestOffer}
                disabled={isCreating || !currentUser}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Creating...' : 'Create Test Offer'}
              </Button>
              
              <Button
                variant="outline"
                onClick={loadOffers}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isLoading ? 'Loading...' : 'Refresh Offers'}
              </Button>
            </CardContent>
          </Card>

          {/* Current User Info */}
          <Card>
            <CardHeader>
              <CardTitle>Current User</CardTitle>
            </CardHeader>
            <CardContent>
              {currentUser ? (
                <div className="space-y-2">
                  <p><strong>Name:</strong> {currentUser.name}</p>
                  <p><strong>ID:</strong> {currentUser.id}</p>
                  <p><strong>Phone:</strong> {currentUser.phone}</p>
                </div>
              ) : (
                <p className="text-gray-600">No user authenticated</p>
              )}
            </CardContent>
          </Card>

          {/* Offers List */}
          <Card>
            <CardHeader>
              <CardTitle>User Offers ({offers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">₹{offer.amount?.toLocaleString()}</h3>
                        <Badge variant={offer.status === 'pending' ? 'secondary' : 'default'}>
                          {offer.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><strong>ID:</strong> {offer.id}</p>
                          <p><strong>Interest Rate:</strong> {offer.interestRate}%</p>
                          <p><strong>Tenure:</strong> {offer.tenure} {offer.tenureUnit}</p>
                        </div>
                        <div>
                          <p><strong>To:</strong> {offer.toUserName || 'N/A'}</p>
                          <p><strong>Purpose:</strong> {offer.purpose || 'N/A'}</p>
                          <p><strong>Type:</strong> {offer.offerType}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Created: {offer.createdAt ? new Date(offer.createdAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No offers found. Create a test offer to get started.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
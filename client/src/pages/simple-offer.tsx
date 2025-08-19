import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SimpleOfferView() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<any>(null);

  useEffect(() => {
    console.log('🔄 SimpleOfferView: Component mounted');
    
    const loadOffer = async () => {
      try {
        console.log('🔍 Starting simple offer load...');
        console.log('🌐 Current hostname:', window.location.hostname);
        console.log('📍 Current pathname:', window.location.pathname);
        
        // Extract offer ID from URL
        const pathParts = window.location.pathname.split('/');
        const offerId = pathParts[pathParts.length - 1];
        console.log('🔗 Extracted offer ID:', offerId);
        
        if (!offerId || offerId === 'simple-offer') {
          setError('No offer ID found in URL');
          setIsLoading(false);
          return;
        }
        
        // Test basic Firebase access
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        console.log('✅ Firebase modules imported');
        
        const db = getFirestore();
        console.log('✅ Firestore instance created');
        
        const offerDoc = await getDoc(doc(db, 'offers', offerId));
        console.log('📄 Offer document fetched, exists:', offerDoc.exists());
        
        if (offerDoc.exists()) {
          const data = offerDoc.data();
          setOfferData({ ...data, id: offerId });
          console.log('✅ Offer data loaded successfully');
        } else {
          setError('Offer not found');
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Error in SimpleOfferView:', err);
        setError(err.message || 'Unknown error occurred');
        setIsLoading(false);
      }
    };
    
    loadOffer();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Loading Offer...</h3>
              <p className="text-gray-600">Fetching offer details</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-red-600 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => setLocation('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!offerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">No Offer Data</h3>
              <p className="text-gray-600">Offer data could not be loaded</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Simple Offer View - Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Offer ID:</strong> {offerData.id}
              </div>
              <div>
                <strong>Amount:</strong> ₹{offerData.amount}
              </div>
              <div>
                <strong>Status:</strong> {offerData.status}
              </div>
              <div>
                <strong>Interest Rate:</strong> {offerData.interestRate}%
              </div>
              <div>
                <strong>From User:</strong> {offerData.fromUserId}
              </div>
              <div>
                <strong>To User:</strong> {offerData.toUserId}
              </div>
              
              <div className="mt-6 p-4 bg-gray-100 rounded">
                <h4 className="font-semibold mb-2">Raw Data:</h4>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(offerData, null, 2)}
                </pre>
              </div>
              
              <Button onClick={() => setLocation('/dashboard')} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
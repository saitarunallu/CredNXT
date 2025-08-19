import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/navbar";

/**
 * Component for debugging and testing the loading of offer data with Firebase integration.
 * @example
 * <DebugOffer />
 * 
 * @returns {JSX.Element} A React component that provides a user interface for running offer load tests and displaying results, including logs, errors, and offer data.
 */
export default function DebugOffer() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<any>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  /**
   * Executes synchronization operations for testing Firebase offers.
   * @example
   * sync()
   * Returns null if successful or sets error state if failed.
   * @returns {void} No return value, sets logs and offer data in state.
   */
  const testOfferLoad = async () => {
    setLogs([]);
    setError(null);
    setOfferData(null);

    try {
      addLog('🔍 Starting offer load test...');
      addLog(`🌐 Current hostname: ${window.location.hostname}`);
      addLog(`🔍 Is production: ${window.location.hostname === 'crednxt.com'}`);

      // Test Firebase imports
      addLog('📦 Testing Firebase imports...');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');
      
      addLog('✅ Firebase modules imported successfully');

      const auth = getAuth();
      const db = getFirestore();
      
      addLog(`🔐 Auth instance: ${!!auth}`);
      addLog(`🔐 Current user: ${!!auth?.currentUser}`);
      addLog(`🔐 User ID: ${auth?.currentUser?.uid || 'none'}`);

      // Test offer document fetch
      const offerId = 'CMvmI8IcUbXme78luUAl';
      addLog(`📄 Fetching offer: ${offerId}`);
      
      const offerDoc = await getDoc(doc(db, 'offers', offerId));
      addLog(`📄 Document exists: ${offerDoc.exists()}`);

      if (offerDoc.exists()) {
        const data = offerDoc.data();
        addLog(`📄 Offer data keys: ${Object.keys(data || {}).join(', ')}`);
        addLog(`📄 Offer amount: ${data?.amount}`);
        addLog(`📄 Offer status: ${data?.status}`);
        setOfferData(data);
      }

      addLog('✅ Test completed successfully');
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      addLog(`❌ Error stack: ${err.stack}`);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Debug Offer Loading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testOfferLoad} className="w-full">
              Test Offer Load
            </Button>

            {logs.length > 0 && (
              <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-2">Debug Logs:</h3>
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-300 p-4 rounded">
                <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {offerData && (
              <div className="bg-green-100 border border-green-300 p-4 rounded">
                <h3 className="font-semibold text-green-800 mb-2">Success! Offer Data:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(offerData, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
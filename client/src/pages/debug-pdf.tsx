import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '../lib/firebase-config';

export default function DebugPDF() {
  const [offerId, setOfferId] = useState('CMvmI8IcUbXme78luUAl'); // Default test ID
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAllPDFs = async () => {
    if (!offerId.trim()) {
      addLog('❌ Please enter an offer ID');
      return;
    }

    setTesting(true);
    setLogs([]);

    try {
      const user = auth?.currentUser;
      if (!user) {
        addLog('❌ No authenticated user found');
        setTesting(false);
        return;
      }

      const token = await user.getIdToken();
      const hostname = window.location.hostname;
      const isProduction = hostname.includes('firebaseapp.com') || 
                          hostname.includes('web.app') || 
                          hostname.includes('crednxt-ef673') ||
                          hostname.includes('crednxt.com');
      
      // Use dynamic Firebase Functions URL generation
      const baseUrl = isProduction 
        ? 'https://api-mzz6re522q-uc.a.run.app'
        : `${window.location.origin}/api`;

      // Test all PDF types
      const pdfTypes = ['contract', 'kfs', 'schedule'];
      
      for (const pdfType of pdfTypes) {
        addLog(`\n🔍 Testing ${pdfType.toUpperCase()} PDF...`);
        
        try {
          const url = `${baseUrl}/offers/${offerId}/pdf/${pdfType}`;
          addLog(`🔗 URL: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/pdf'
            }
          });

          addLog(`📊 ${pdfType} Response: ${response.status}`);
          
          if (response.ok) {
            const blob = await response.blob();
            addLog(`✅ ${pdfType} PDF: ${blob.size} bytes`);
            
            // Download the PDF
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${pdfType}-${offerId}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
          } else {
            const errorText = await response.text();
            addLog(`❌ ${pdfType} Error: ${errorText}`);
          }
        } catch (error: any) {
          addLog(`💥 ${pdfType} Exception: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      addLog('\n🎉 All PDF tests completed!');
    } catch (error: any) {
      addLog(`💥 General Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const testPDFDownload = async () => {
    if (!offerId.trim()) {
      addLog('❌ Please enter an offer ID');
      return;
    }

    setTesting(true);
    setLogs([]);
    
    try {
      addLog('🔍 Starting PDF download test...');
      
      // Check authentication
      const user = auth?.currentUser;
      addLog(`👤 Current user: ${user ? user.uid : 'None'}`);
      addLog(`📧 User email: ${user?.email || 'None'}`);
      
      if (!user) {
        addLog('❌ No authenticated user found');
        return;
      }

      // Get token
      addLog('🔑 Getting authentication token...');
      const token = await user.getIdToken();
      addLog(`✅ Token obtained: ${token.substring(0, 20)}...`);

      // Test the PDF endpoint
      const hostname = window.location.hostname;
      const isProduction = hostname.includes('firebaseapp.com') || 
                          hostname.includes('web.app') || 
                          hostname.includes('crednxt-ef673') ||
                          hostname.includes('crednxt.com');
      
      addLog(`🌐 Hostname: ${hostname}`);
      addLog(`🏭 Is production: ${isProduction}`);
      
      const baseUrl = isProduction 
        ? 'https://api-mzz6re522q-uc.a.run.app'
        : `${window.location.origin}/api`;
      
      const url = `${baseUrl}/offers/${offerId}/pdf/contract`;
      addLog(`🔗 Request URL: ${url}`);

      addLog('📡 Making request...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
          'Origin': window.location.origin
        }
      });

      addLog(`📊 Response status: ${response.status}`);
      addLog(`📋 Response content-type: ${response.headers.get('content-type')}`);
      addLog(`📏 Response content-length: ${response.headers.get('content-length')}`);

      if (!response.ok) {
        const responseText = await response.text();
        addLog(`❌ Error response: ${responseText}`);
        return;
      }

      const blob = await response.blob();
      addLog(`✅ PDF blob received: ${blob.size} bytes`);
      addLog(`📄 Blob type: ${blob.type}`);

      // Check if it's actually a PDF
      if (blob.type === 'application/pdf' || blob.size > 0) {
        addLog('✅ Valid PDF received - triggering download');
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `test-contract-${offerId}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        addLog('🎉 PDF download completed successfully!');
      } else {
        addLog(`❌ Invalid PDF received - type: ${blob.type}, size: ${blob.size}`);
      }

    } catch (error: any) {
      addLog(`💥 Error: ${error.message}`);
      addLog(`🔍 Error details: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>PDF Download Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter Offer ID to test"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button 
                onClick={testPDFDownload} 
                disabled={testing}
                className="flex-1"
              >
                {testing ? 'Testing...' : 'Test Contract PDF'}
              </Button>
              <Button 
                onClick={testAllPDFs} 
                disabled={testing}
                variant="outline"
                className="flex-1"
              >
                {testing ? 'Testing...' : 'Test All PDFs'}
              </Button>
            </div>
          </div>
          
          {logs.length > 0 && (
            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-2">Debug Logs:</h3>
              <div className="font-mono text-sm space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className={`${
                    log.includes('❌') ? 'text-red-600' :
                    log.includes('✅') ? 'text-green-600' :
                    log.includes('🔍') || log.includes('📡') ? 'text-blue-600' :
                    'text-gray-700'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
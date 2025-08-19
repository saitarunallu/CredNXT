import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth } from '@/lib/firebase-config';
import { firebaseAuthService } from '@/lib/firebase-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Debugs Firebase authentication and Firestore connectivity and returns the collected debug information.
 * @example
 * DebugAuth()
 * Returns a React component displaying authentication and database test results.
 * @returns {JSX.Element} A React component rendering the results of authentication and database tests, or a loading message while tests are running.
 */
export default function DebugAuth() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    /**
     * Synchronizes and gathers environment and Firebase information for debugging purposes.
     * @example
     * sync()
     * undefined
     * @returns {Promise<void>} Resolves when the information gathering and setting state has completed.
     */
    const runDebugTests = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        environment: {
          hostname: window.location.hostname,
          isFirebase: window.location.hostname.includes('firebaseapp.com'),
          userAgent: navigator.userAgent,
        },
        localStorage: {
          userData: localStorage.getItem('user_data') ? 'present' : 'missing',
          firebaseToken: localStorage.getItem('firebase_auth_token') ? 'present' : 'missing',
        },
        firebaseAuthService: {
          user: firebaseAuthService.getUser(),
          isAuthenticated: firebaseAuthService.isAuthenticated(),
        }
      };
      
      // Test Firebase auth state
      const authStatePromise = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ timeout: true }), 5000);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve({
            currentUser: user ? {
              uid: user.uid,
              phoneNumber: user.phoneNumber,
              emailVerified: user.emailVerified
            } : null
          });
        });
      });
      
      info.firebaseAuth = await authStatePromise;
      
      // Test Firestore access
      try {
        const db = getFirestore();
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const offersSnapshot = await getDocs(collection(db, 'offers'));
        
        info.firestore = {
          connected: true,
          usersCount: usersSnapshot.size,
          offersCount: offersSnapshot.size,
        };
        
        // If user is authenticated, test user document access
        if (info.firebaseAuth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', info.firebaseAuth.currentUser.uid));
          info.firestore.userDocument = {
            exists: userDoc.exists(),
            data: userDoc.exists() ? userDoc.data() : null
          };
        }
      } catch (error: any) {
        info.firestore = {
          error: error.message,
          code: error.code
        };
      }
      
      setDebugInfo(info);
      setIsLoading(false);
    };
    
    runDebugTests();
  }, []);
  
  const refreshTest = () => {
    setIsLoading(true);
    setDebugInfo({});
    window.location.reload();
  };
  
  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Firebase Authentication Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Running authentication and database tests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Authentication Debug</CardTitle>
          <Button onClick={refreshTest} size="sm">Refresh Test</Button>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
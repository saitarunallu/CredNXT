import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import AuthGuard from "@/components/auth/auth-guard";
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import VerifyOtp from "@/pages/auth/verify-otp";
import CompleteProfile from "@/pages/auth/complete-profile";
import Dashboard from "@/pages/dashboard";

import OffersPage from "@/pages/offers";
import CreateOffer from "@/pages/offers/create";
import ViewOffer from "@/pages/offers/view";
import TestOffersPage from "@/pages/test-offers";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import SMSTestPage from "@/pages/sms-test-page";
import DebugAuth from "@/pages/debug-auth";
import NotFound from "@/pages/not-found";

function Router() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
  console.log('🚦 Router initialized on:', currentPath);
  console.log('🌐 Hostname check:', typeof window !== 'undefined' ? window.location.hostname : 'unknown');
  console.log('🔍 Is production?', typeof window !== 'undefined' && window.location.hostname.includes('firebaseapp.com'));
  
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/verify-otp" component={VerifyOtp} />
      <Route path="/complete-profile" component={CompleteProfile} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>
      
      <Route path="/analytics">
        <AuthGuard>
          <Analytics />
        </AuthGuard>
      </Route>
      
      <Route path="/profile">
        <AuthGuard>
          <Profile />
        </AuthGuard>
      </Route>
      
      <Route path="/offers/create">
        <AuthGuard>
          <CreateOffer />
        </AuthGuard>
      </Route>
      
      <Route path="/offers/:id">
        {(params: { id: string }) => {
          console.log('🔗 Offer route matched:', params.id);
          console.log('🌐 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'unknown');
          console.log('📍 Full URL:', typeof window !== 'undefined' ? window.location.href : 'unknown');
          console.log('🔍 Route params received:', params);
          
          // Ensure we have a valid ID
          if (!params?.id) {
            console.error('❌ No offer ID in route params');
            return <NotFound />;
          }
          
          // Check if we're in production (Firebase hosting OR web.app domain)
          const isProduction = typeof window !== 'undefined' && 
            (window.location.hostname.includes('firebaseapp.com') || 
             window.location.hostname.includes('web.app'));
          console.log('🔍 Is production?', isProduction);
          console.log('🔍 Hostname includes firebaseapp.com?', typeof window !== 'undefined' && window.location.hostname.includes('firebaseapp.com'));
          console.log('🔍 Hostname includes web.app?', typeof window !== 'undefined' && window.location.hostname.includes('web.app'));
          
          if (isProduction) {
            console.log('🔥 Production environment detected, bypassing AuthGuard');
            // In production, ViewOffer handles its own auth via direct Firestore
            return <ViewOffer offerId={params.id} />;
          }
          // In development, use AuthGuard
          console.log('🛡️ Development environment, using AuthGuard');
          return (
            <AuthGuard>
              <ViewOffer offerId={params.id} />
            </AuthGuard>
          );
        }}
      </Route>
      
      <Route path="/offers">
        <AuthGuard>
          <OffersPage />
        </AuthGuard>
      </Route>
      
      <Route path="/test-offers">
        <AuthGuard>
          <TestOffersPage />
        </AuthGuard>
      </Route>
      
      <Route path="/sms-test">
        <AuthGuard>
          <SMSTestPage />
        </AuthGuard>
      </Route>
      
      <Route path="/debug-auth" component={DebugAuth} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Router />
              <Toaster />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

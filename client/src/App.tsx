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
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import SMSTestPage from "@/pages/sms-test-page";
import NotFound from "@/pages/not-found";

function Router() {
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
        {(params: { id: string }) => (
          <AuthGuard>
            <ViewOffer offerId={params.id} />
          </AuthGuard>
        )}
      </Route>
      
      <Route path="/offers">
        <AuthGuard>
          <OffersPage />
        </AuthGuard>
      </Route>
      
      <Route path="/sms-test">
        <AuthGuard>
          <SMSTestPage />
        </AuthGuard>
      </Route>
      
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
            <div className="min-h-screen bg-white text-black">
              <div className="p-8">
                <h1 className="text-2xl font-bold">CredNXT Loading Test</h1>
                <p>Frontend is working properly</p>
                <Router />
              </div>
              <Toaster />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/auth/auth-guard";
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import VerifyOtp from "@/pages/auth/verify-otp";
import CompleteProfile from "@/pages/auth/complete-profile";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import OffersPage from "@/pages/offers";
import CreateOffer from "@/pages/offers/create";
import ViewOffer from "@/pages/offers/view";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
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
      
      <Route path="/contacts">
        <AuthGuard>
          <Contacts />
        </AuthGuard>
      </Route>
      
      <Route path="/offers" nest>
        <AuthGuard>
          <Route path="/" component={OffersPage} />
          <Route path="/create" component={CreateOffer} />
          <Route path="/:id">
            {(params) => <ViewOffer offerId={params.id} />}
          </Route>
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
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

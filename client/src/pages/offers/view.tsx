import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/navbar";
import LoadingScreen from "@/components/ui/loading-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { firebaseBackend } from "@/lib/firebase-backend-service";
import { insertPaymentSchema, type InsertPayment } from "@shared/firestore-schema";
import { 
  ArrowLeft, 
  IndianRupee, 
  Calendar, 
  User, 
  FileText, 
  Download,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  Ban,
  Calculator,
  TrendingUp
} from "lucide-react";

interface ViewOfferProps {
  offerId: string;
}

// Production fallback component with direct Firestore access
function ProductionFallbackView({ offerId, setLocation }: { offerId: string, setLocation: Function }) {
  const [isLoading, setIsLoading] = useState(true);
  const [offerData, setOfferData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOfferDirectly = async () => {
      try {
        console.log('🔍 Production environment detected, loading offer directly...');
        console.log('🔗 Offer ID:', offerId);
        console.log('🌐 Current URL:', window.location.href);
        
        // Import Firebase modules dynamically
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { getAuth } = await import('firebase/auth');
        
        const auth = getAuth();
        console.log('🔐 Production auth state check...');
        console.log('🔐 Auth instance:', !!auth);
        console.log('🔐 Current user immediately:', !!auth.currentUser);
        
        // Wait for auth state to be ready with timeout
        const currentUser = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('⏰ Auth state timeout - proceeding without user');
            resolve(null);
          }, 5000);
          
          const unsubscribe = auth.onAuthStateChanged((user) => {
            clearTimeout(timeout);
            unsubscribe();
            console.log('🔐 Auth state changed:', !!user, user?.uid || 'no-uid');
            resolve(user);
          });
        });
        
        console.log('🔐 Production current user:', currentUser?.uid || 'NO_USER_FOUND');
        
        if (!currentUser) {
          console.log('❌ No authenticated user found in production');
          console.log('🔍 Checking localStorage for user data...');
          
          const userData = localStorage.getItem('user_data');
          console.log('🔍 LocalStorage user_data:', userData ? 'present' : 'not found');
          
          // FOR DEBUGGING: Allow access to test offer without authentication
          if (offerId === 'test-offer-123') {
            console.log('🧪 DEBUG MODE: Allowing access to test offer without authentication');
            
            const db = getFirestore();
            const offerDoc = await getDoc(doc(db, 'offers', offerId));
            
            if (offerDoc.exists()) {
              const offer = offerDoc.data();
              console.log('🧪 Test offer data:', offer);
              
              // Mock user data for test
              const fromUser = { name: 'Test User', phone: '+919876543210' };
              
              setOfferData({
                offer: {
                  ...offer,
                  startDate: offer.startDate?.toDate?.() || new Date(offer.startDate?._seconds * 1000) || new Date(),
                  dueDate: offer.dueDate?.toDate?.() || new Date(offer.dueDate?._seconds * 1000) || new Date(),
                  nextPaymentDueDate: offer.nextPaymentDueDate?.toDate?.() || new Date()
                },
                fromUser,
                toUser: null,
                currentUserRole: 'viewer',
                schedules: [],
                payments: []
              });
              setIsLoading(false);
              return;
            }
          }
          
          if (userData) {
            console.log('⚠️ User data in localStorage but Firebase auth not ready');
            setError('Authentication loading... Please wait a moment and refresh if this persists.');
          } else {
            console.log('⚠️ No user data found in localStorage');
            setError('Please log in to view offer details.');
          }
          
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Authenticated user found:', currentUser.uid);

        const db = getFirestore();
        console.log('📊 Firestore instance:', !!db);
        console.log('📝 Fetching offer document:', offerId);
        
        const offerDoc = await getDoc(doc(db, 'offers', offerId));
        console.log('📄 Offer doc exists:', offerDoc.exists());
        
        if (!offerDoc.exists()) {
          console.log('❌ Offer document not found in Firestore');
          setError('Offer not found');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Offer document found');

        const offer = offerDoc.data();
        
        // Get current user data for authorization
        console.log('👤 Fetching user document for authorization...');
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : null;
        console.log('👤 User document exists:', currentUserDoc.exists());
        console.log('👤 User phone:', currentUserData?.phone || 'no-phone');
        
        // Check authorization with detailed logging
        const isFromUser = offer.fromUserId === currentUser.uid;
        const isToUser = offer.toUserId === currentUser.uid;
        const isPhoneMatch = currentUserData && offer.toUserPhone === currentUserData.phone;
        
        console.log('🔐 Authorization check:');
        console.log('  - Is from user:', isFromUser, '(', offer.fromUserId, '===', currentUser.uid, ')');
        console.log('  - Is to user:', isToUser, '(', offer.toUserId, '===', currentUser.uid, ')');
        console.log('  - Phone match:', isPhoneMatch, '(', offer.toUserPhone, '===', currentUserData?.phone, ')');
        
        const isAuthorized = isFromUser || isToUser || isPhoneMatch;
        
        if (!isAuthorized) {
          console.log('❌ Authorization failed for user', currentUser.uid);
          setError('Unauthorized to view this offer');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ User authorized to view offer');

        // Get the user who created the offer
        let fromUser = null;
        if (offer.fromUserId) {
          const fromUserDoc = await getDoc(doc(db, 'users', offer.fromUserId));
          if (fromUserDoc.exists()) {
            fromUser = fromUserDoc.data();
          }
        }

        setOfferData({
          offer: { id: offerDoc.id, ...offer },
          fromUser,
          payments: [] // Simplified for now
        });
        setIsLoading(false);

      } catch (err: any) {
        console.error('Direct Firestore error:', err);
        console.error('Error details:', err.message, err.code);
        setError(`Failed to load offer details: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadOfferDirectly();
  }, [offerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Offer Details...</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Retrieving offer information directly from database
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Offer</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error || 'Failed to load offer details'}
              </p>
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white mr-2">
                  Try Again
                </Button>
                <Button onClick={() => setLocation('/dashboard')} variant="outline">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render offer details directly
  const { offer, fromUser } = offerData;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
            onClick={() => setLocation('/dashboard')}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Offer Details (Direct Access)
              </CardTitle>
              <Badge 
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}
                data-testid={`badge-status-${offer.status}`}
              >
                {offer.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loan Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid={`text-amount-${offer.amount}`}>
                      ₹{offer.amount?.toLocaleString('en-IN') || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {offer.dueDate ? new Date(offer.dueDate?.toDate?.() || offer.dueDate?._seconds * 1000 || offer.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">From</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-from-user">
                      {fromUser?.name || 'Unknown User'}
                    </p>
                  </div>
                </div>
                
                {offer.notes && (
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                      <p className="text-gray-900 dark:text-gray-100" data-testid="text-notes">
                        {offer.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ This offer is being displayed using direct database access due to backend maintenance. 
                Full functionality will be restored shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ViewOffer({ offerId }: ViewOfferProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCloseLoanDialogOpen, setIsCloseLoanDialogOpen] = useState(false);
  const [closeLoanReason, setCloseLoanReason] = useState("");

  const currentUser = authService.getUser();

  // Helper function to format Firebase timestamps
  const formatFirebaseDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      let date: Date;
      
      // Handle Firebase Timestamp objects with _seconds
      if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
      }
      // Handle Firestore toDate() method
      else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle Date objects
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle ISO strings and epoch timestamps
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      // Fallback - try to convert whatever it is
      else {
        console.warn('Unexpected timestamp format:', typeof timestamp, timestamp);
        date = new Date(timestamp);
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date detected:', timestamp);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
    } catch (error) {
      console.error('Date formatting error:', error, 'for timestamp:', timestamp);
      return 'Invalid Date';
    }
  };

  console.log('🔍 ViewOffer - Environment:', window.location.hostname.includes('firebaseapp.com') || window.location.hostname.includes('web.app') ? 'production' : 'development');
  console.log('🔍 ViewOffer - Offer ID:', offerId);
  console.log('🔍 ViewOffer - Full hostname:', typeof window !== 'undefined' ? window.location.hostname : 'unknown');

  // Use unified data service for all data access
  const { data: offerData, isLoading, error } = useQuery({
    queryKey: ['offer-details', offerId],
    queryFn: async () => {
      const result = await firebaseBackend.getOfferWithDetails(offerId);
      console.log('📊 Firebase offer data:', result);
      return result;
    },
    retry: (failureCount, error) => {
      console.log(`Query failed ${failureCount} times:`, error);
      // Don't retry on 404 or auth errors
      if (error?.message?.includes('404') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    }
  }) as { data: any, isLoading: boolean, error: any };

  const { data: scheduleData } = useQuery({
    queryKey: ['offer-schedule', offerId],
    queryFn: () => firebaseBackend.getOfferSchedule(offerId),
    enabled: !!offerData?.offer
  }) as { data: any };



  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<Omit<InsertPayment, 'offerId'>>({
    resolver: zodResolver(insertPaymentSchema.omit({ offerId: true }))
  });

  const acceptOfferMutation = useMutation({
    mutationFn: () => firebaseBackend.updateOfferStatus(offerId, 'accepted'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-details', offerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'] });
      toast({
        title: "Offer Accepted",
        description: "You have successfully accepted this offer.",
      });
    },
    onError: (error) => {
      console.error('Accept offer error:', error);
      toast({
        title: "Error",
        description: "Failed to accept offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const rejectOfferMutation = useMutation({
    mutationFn: () => firebaseBackend.updateOfferStatus(offerId, 'declined'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-details', offerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'] });
      toast({
        title: "Offer Rejected",
        description: "You have rejected this offer.",
      });
    },
    onError: (error) => {
      console.error('Reject offer error:', error);
      toast({
        title: "Error",
        description: "Failed to reject offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (data: Omit<InsertPayment, 'offerId'>) => {
      const response = await apiRequest('POST', `/api/offers/${offerId}/submit-payment`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId, 'payment-info'] });
      toast({
        title: "Payment Submitted",
        description: "Payment submitted successfully and installment advanced.",
      });
      reset(); // Reset form after successful submission
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest('PATCH', `/api/payments/${paymentId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId, 'payment-status'] });
      toast({
        title: "Payment Approved",
        description: "Payment has been approved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const response = await apiRequest('PATCH', `/api/payments/${paymentId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId, 'payment-status'] });
      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Lender can toggle partial payment allowance
  const togglePartialPaymentMutation = useMutation({
    mutationFn: async (allowPartPayment: boolean) => {
      const response = await apiRequest('PATCH', `/api/offers/${offerId}/allow-partial-payment`, { allowPartPayment });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      toast({
        title: "Payment Settings Updated",
        description: offer.allowPartPayment ? "Partial payments are now allowed" : "Partial payments are now disabled",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment settings.",
        variant: "destructive",
      });
    }
  });

  // Lender can close loan early
  const closeLoanMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest('PATCH', `/api/offers/${offerId}/close-loan`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      setIsCloseLoanDialogOpen(false);
      setCloseLoanReason("");
      toast({
        title: "Loan Closed",
        description: "The loan has been closed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close the loan.",
        variant: "destructive",
      });
    }
  });

  // Form submission handlers
  const onSubmitPayment = (data: Omit<InsertPayment, 'offerId'>) => {
    submitPaymentMutation.mutate(data);
  };

  const downloadContract = async () => {
    try {
      await firebaseBackend.downloadContractPDF(offerId);
      toast({
        title: "Success",
        description: "Contract downloaded successfully.",
      });
    } catch (error) {
      console.error('Download contract error:', error);
      toast({
        title: "Error",
        description: "Failed to download contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadKFS = async () => {
    try {
      await firebaseBackend.downloadKFSPDF(offerId);
      toast({
        title: "Success",
        description: "KFS document downloaded successfully.",
      });
    } catch (error) {
      console.error('Download KFS error:', error);
      toast({
        title: "Error",
        description: "Failed to download KFS document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadRepaymentSchedule = async () => {
    try {
      await firebaseBackend.downloadSchedulePDF(offerId);
      toast({
        title: "Success",
        description: "Repayment schedule downloaded successfully.",
      });
    } catch (error) {
      console.error('Download repayment schedule error:', error);
      toast({
        title: "Error",
        description: "Failed to download repayment schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Removed auto-fill effect - no longer needed for direct payment

  // Direct payment function for simplified flow
  const handleDirectPayment = (amount: number) => {
    submitPaymentMutation.mutate({
      amount: amount,
      paymentMode: "upi", // Default payment mode for direct payments
      refString: undefined,
      status: "pending" // Required status field for payment
    });
  };

  // Add debug logging
  console.log('ViewOffer Debug:', {
    offerId,
    isLoading,
    hasOfferData: !!offerData,
    offerExists: !!offerData?.offer,
    error: error?.message,
    currentUser: currentUser?.id,
    authToken: !!localStorage.getItem('firebase_auth_token')
  });

  if (isLoading) {
    return <LoadingScreen message="Loading offer details..." />;
  }

  if (error) {
    console.error('Offer query error:', error);
    
    // If it's a network error and we're in production, show a helpful message
    if (typeof window !== 'undefined' && window.location.hostname.includes('firebaseapp.com')) {
      return <ProductionFallbackView offerId={offerId} setLocation={setLocation} />;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Offer</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error?.message?.includes('401') ? 
                  'Please log in again to view this offer.' : 
                  `Failed to load offer: ${error?.message}`}
              </p>
              <Button onClick={() => setLocation('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!offerData?.offer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Offer not found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">The offer you're looking for doesn't exist.</p>
              <Button onClick={() => setLocation('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle the nested structure from /api/offers/:id endpoint
  const offer = offerData.offer;
  const fromUser = offerData.fromUser;
  const contact = offerData.contact;
  const payments = offerData.payments || [];
  
  const totalPaid = payments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
  
  const amount = offer.amount ? parseFloat(offer.amount) : 0;
  const totalAmountDue = scheduleData?.schedule?.totalAmount || amount;
  
  // Calculate outstanding amounts using proper banking standards
  let outstanding = 0; // Total remaining loan balance
  let dueAmount = 0; // Amount currently due
  let overDueAmount = 0; // Amount past due
  let outstandingPrincipal = amount; // Remaining principal balance
  
  // Use repayment schedule if available for accurate calculations
  if (scheduleData?.schedule?.schedule) {
    const today = new Date();
    const schedule = scheduleData?.schedule?.schedule || [];
    let remainingPaid = totalPaid;
    let totalPrincipalPaid = 0;
    
    // Process payments in chronological order
    for (const installment of schedule) {
      const paymentDueDate = new Date(installment.dueDate);
      const paidForThisInstallment = Math.min(remainingPaid, installment.totalAmount);
      const remainingForThisInstallment = installment.totalAmount - paidForThisInstallment;
      
      // Track principal payments based on repayment type
      if (paidForThisInstallment > 0) {
        if (offer.repaymentType === 'interest_only') {
          // For interest-only: only final payment reduces principal
          if (installment.principalAmount > 0) {
            const principalPaid = Math.min(
              Math.max(0, paidForThisInstallment - installment.interestAmount),
              installment.principalAmount
            );
            totalPrincipalPaid += principalPaid;
          }
        } else {
          // For EMI/other types: each payment reduces principal
          const principalPaid = Math.min(
            Math.max(0, paidForThisInstallment - installment.interestAmount),
            installment.principalAmount
          );
          totalPrincipalPaid += principalPaid;
        }
      }
      
      // Calculate due and overdue amounts
      if (remainingForThisInstallment > 0.01) {
        if (paymentDueDate <= today) {
          if (paymentDueDate < today) {
            overDueAmount += remainingForThisInstallment;
          } else {
            dueAmount += remainingForThisInstallment;
          }
        }
      }
      
      remainingPaid = Math.max(0, remainingPaid - paidForThisInstallment);
    }
    
    // Outstanding Principal = Original Principal - Actual Principal Paid
    outstandingPrincipal = Math.max(0, amount - totalPrincipalPaid);
    
    // Outstanding = Total loan amount - Total paid (simple and correct)
    outstanding = Math.max(0, totalAmountDue - totalPaid);
    
  } else {
    // Fallback: simple calculation without schedule
    outstandingPrincipal = Math.max(0, amount - totalPaid);
    outstanding = Math.max(0, totalAmountDue - totalPaid);
    
    // For active loans, show minimum payment due
    if (offer.status === 'accepted' && outstanding > 0) {
      if (offer.repaymentType === 'interest_only') {
        dueAmount = Math.round(((amount * parseFloat(offer.interestRate)) / (12 * 100)) * 100) / 100;
      } else {
        dueAmount = Math.min(outstanding, Math.round((outstanding / 12) * 100) / 100);
      }
    }
  }
  
  const isReceiver = offer.toUserId === currentUser?.id;
  const isSender = offer.fromUserId === currentUser?.id;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get the display text from current user's perspective
  const getOfferDisplayText = () => {
    if (isReceiver) {
      // Received offer: flip the perspective
      if (offer.offerType === 'lend') {
        return {
          type: 'Loan Offer',
          description: 'Someone wants to lend money to you',
          acceptText: 'Accept Loan',
          actionContext: 'borrowing'
        };
      } else {
        return {
          type: 'Lending Request', 
          description: 'Someone wants to borrow money from you',
          acceptText: 'Approve Lending',
          actionContext: 'lending'
        };
      }
    } else {
      // Sent offer: show as created
      if (offer.offerType === 'lend') {
        return {
          type: 'Lend Offer',
          description: 'You offered to lend money',
          acceptText: 'Offer Sent',
          actionContext: 'lending'
        };
      } else {
        return {
          type: 'Borrow Request',
          description: 'You requested to borrow money', 
          acceptText: 'Request Sent',
          actionContext: 'borrowing'
        };
      }
    }
  };

  const displayInfo = getOfferDisplayText();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/dashboard')}
            className="mr-4 bg-white border-gray-200 hover:bg-gray-50 shadow-sm rounded-lg h-10 px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offer Details</h1>
            <p className="text-gray-600">View and manage offer information</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Offer Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Offer Information
                  </CardTitle>
                  <Badge className={getStatusColor(offer.status)}>
                    {offer.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <User className="w-4 h-4" />
                      <span>{isReceiver ? 'From' : 'To'}</span>
                    </div>
                    <div className="font-semibold text-lg">
                      {isReceiver ? fromUser?.name : (contact?.name || offer.toUserName || 'Unknown User')}
                    </div>
                    <div className="text-gray-600">
                      {isReceiver ? fromUser?.phone : (contact?.phone || offer.toUserPhone || 'Unknown Phone')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <IndianRupee className="w-4 h-4" />
                      <span>Loan Amount</span>
                    </div>
                    <div className="font-semibold text-2xl text-blue-600">
                      ₹{(amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Interest Rate</div>
                    <div className="font-semibold">{offer.interestRate}% per annum ({offer.interestType})</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {offer.status === 'accepted' && scheduleData?.schedule?.schedule ? 
                          (offer.repaymentType === 'interest_only' ? 
                            `Next Interest Due (${offer.repaymentFrequency || 'monthly'})` : 
                            `Next Payment Due (${offer.repaymentFrequency || 'monthly'})`) :
                          'Final Due Date'
                        }
                      </span>
                    </div>
                    <div className="font-semibold">
                      {offer.status === 'accepted' && scheduleData?.schedule?.schedule ? 
                        formatFirebaseDate(scheduleData.schedule.schedule[0]?.dueDate) :
                        formatFirebaseDate(offer.dueDate)
                      }
                    </div>
                  </div>
                </div>

                {/* Additional Financial Information */}
                {scheduleData?.schedule && (
                  <div className="grid md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Total Interest</div>
                      <div className="font-bold text-lg text-red-600">
                        ₹{(scheduleData?.schedule?.totalInterest || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Total Repayment</div>
                      <div className="font-bold text-lg text-green-600">
                        ₹{(scheduleData?.schedule?.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    
                    {scheduleData?.schedule?.emiAmount && (
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">
                          {offer.repaymentType === 'interest_only' ? 
                            `${offer.repaymentFrequency === 'quarterly' ? 'Quarterly' : 
                              offer.repaymentFrequency === 'half_yearly' ? 'Half-Yearly' :
                              offer.repaymentFrequency === 'yearly' ? 'Yearly' : 'Monthly'} Interest` : 
                            'EMI Amount'}
                        </div>
                        <div className="font-bold text-lg text-blue-600">
                          ₹{(scheduleData?.schedule?.emiAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tenure</div>
                    <div className="font-semibold">{offer.tenureValue} {offer.tenureUnit}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Repayment Type</div>
                    <div className="font-semibold">
                      {offer.repaymentType === 'emi' ? 'Equal Monthly Installments (EMI)' :
                       offer.repaymentType === 'full_payment' ? 'Lump Sum Payment' :
                       offer.repaymentType === 'interest_only' ? 'Interest Only Payments' :
                       offer.repaymentType.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                {offer.purpose && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Purpose</div>
                    <div className="font-semibold">{offer.purpose}</div>
                  </div>
                )}

                {offer.note && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Additional Notes</div>
                    <div className="bg-gray-50 p-3 rounded-lg">{offer.note}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {offer.status === 'pending' && isReceiver && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Respond to Offer</CardTitle>
                  <p className="text-sm text-gray-600">Choose your action for this offer</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      onClick={() => acceptOfferMutation.mutate()}
                      disabled={acceptOfferMutation.isPending || rejectOfferMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white h-12 text-base font-medium"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Accept Offer
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => rejectOfferMutation.mutate()}
                      disabled={acceptOfferMutation.isPending || rejectOfferMutation.isPending}
                      className="h-12 text-base font-medium"
                      size="lg"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Decline Offer
                    </Button>
                  </div>
                  {(acceptOfferMutation.isPending || rejectOfferMutation.isPending) && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">Processing your response...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Repayment Schedule */}
            {offer.status === 'accepted' && scheduleData?.schedule && (
              <Card className="border-2 border-gray-200 shadow-md">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center text-gray-900">
                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                    Repayment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                      <div className="border-r border-blue-200 pr-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Principal Amount</div>
                        <div className="font-bold text-xl text-blue-700">₹{(scheduleData?.schedule?.principal || amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="pl-4">
                        <div className="text-sm text-gray-600 font-medium mb-1">Total Interest</div>
                        <div className="font-bold text-xl text-red-600">₹{(scheduleData?.schedule?.totalInterest || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="border-r border-blue-200 pr-4 pt-4 border-t border-blue-200">
                        <div className="text-sm text-gray-600 font-medium mb-1">Total Repayment</div>
                        <div className="font-bold text-xl text-green-700">₹{(scheduleData?.schedule?.totalAmount || 0).toLocaleString('en-IN')}</div>
                      </div>
                      {scheduleData?.schedule?.emiAmount && (
                        <div className="pl-4 pt-4 border-t border-blue-200">
                          <div className="text-sm text-gray-600 font-medium mb-1">
                            {offer.repaymentType === 'emi' ? 'EMI Amount' : 
                             offer.repaymentType === 'interest_only' ? 
                               `${offer.repaymentFrequency === 'quarterly' ? 'Quarterly' : 
                                 offer.repaymentFrequency === 'half_yearly' ? 'Half-Yearly' :
                                 offer.repaymentFrequency === 'yearly' ? 'Yearly' : 'Monthly'} Interest` : 
                             'Payment Amount'}
                          </div>
                          <div className="font-bold text-xl text-purple-700">₹{(scheduleData?.schedule?.emiAmount || 0).toLocaleString('en-IN')}</div>
                        </div>
                      )}
                    </div>

                    {/* Schedule Details for EMI and Interest-Only */}
                    {(offer.repaymentType === 'emi' || offer.repaymentType === 'interest_only') && scheduleData?.schedule?.schedule && scheduleData.schedule.schedule.length <= 12 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 text-lg">Payment Schedule</h4>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                          {(scheduleData?.schedule?.schedule || []).map((installment: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="font-semibold text-gray-800">
                                  {offer.repaymentType === 'emi' ? `EMI #${installment.installmentNumber}` : 
                                   offer.repaymentType === 'interest_only' ? 
                                     (installment.principalAmount > 0 ? `Principal Payment` : `Interest Payment #${installment.installmentNumber}`) :
                                     `Payment #${installment.installmentNumber}`}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Due: {formatFirebaseDate(installment.dueDate)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {offer.repaymentType === 'interest_only' && installment.principalAmount === 0 ? 
                                    'Interest Only' : 
                                    `Balance: ₹${(installment.remainingBalance || 0).toLocaleString('en-IN')}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-gray-900">₹{(installment.totalAmount || 0).toLocaleString('en-IN')}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Principal: ₹{(installment.principalAmount || 0).toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Interest: ₹{(installment.interestAmount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simple message for large schedules */}
                    {(offer.repaymentType === 'emi' || offer.repaymentType === 'interest_only') && scheduleData?.schedule?.schedule && scheduleData.schedule.schedule.length > 12 && (
                      <div className="text-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <TrendingUp className="w-10 h-10 mx-auto text-blue-600 mb-3" />
                        <p className="text-gray-800 font-semibold text-lg mb-2">
                          {offer.repaymentType === 'interest_only' ? 
                            `${scheduleData?.schedule?.numberOfPayments - 1 || 0} ${offer.repaymentFrequency || 'monthly'} interest payments of ₹${(scheduleData?.schedule?.emiAmount || 0).toLocaleString('en-IN')} + final principal` :
                            `${scheduleData?.schedule?.numberOfPayments || 0} ${offer.repaymentFrequency || 'monthly'} EMI payments of ₹${(scheduleData?.schedule?.emiAmount || 0).toLocaleString('en-IN')} each`
                          }
                        </p>
                        <p className="text-sm text-gray-600">
                          Download the detailed schedule for complete payment breakdown
                        </p>
                      </div>
                    )}

                    {/* Full payment display */}
                    {offer.repaymentType === 'full_payment' && scheduleData?.schedule?.schedule && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 text-lg">Payment Details</h4>
                        <div className="border border-gray-200 rounded-lg">
                          {scheduleData.schedule.schedule.map((payment: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="font-semibold text-gray-800">Lump Sum Payment</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Due: {formatFirebaseDate(payment.dueDate)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg text-gray-900">₹{(payment.totalAmount || 0).toLocaleString('en-IN')}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Principal: ₹{(payment.principalAmount || 0).toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Interest: ₹{(payment.interestAmount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}



            {/* Enhanced Loan Analytics Card */}
            {offer.status === 'accepted' && scheduleData?.schedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Loan Analytics & Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Payment Structure Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Payment Structure</h4>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Interest Type:</span>
                          <span className="font-medium">{offer.interestType === 'fixed' ? 'Fixed' : 'Reducing Balance'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment Method:</span>
                          <span className="font-medium">
                            {offer.repaymentType === 'emi' ? 'Equal Monthly Installments' :
                             offer.repaymentType === 'step_up' ? 'Step-Up Payments' :
                             offer.repaymentType === 'step_down' ? 'Step-Down Payments' :
                             offer.repaymentType === 'balloon' ? 'Balloon Payment' :
                             offer.repaymentType === 'interest_only' ? 'Interest-Only Payments' : 'Lump Sum'}
                          </span>
                        </div>
                        {offer.repaymentFrequency && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment Frequency:</span>
                            <span className="font-medium">
                              {offer.repaymentFrequency === 'monthly' ? 'Monthly' :
                               offer.repaymentFrequency === 'quarterly' ? 'Quarterly' :
                               offer.repaymentFrequency === 'half_yearly' ? 'Half-Yearly' :
                               offer.repaymentFrequency === 'yearly' ? 'Yearly' :
                               offer.repaymentFrequency === 'weekly' ? 'Weekly' :
                               offer.repaymentFrequency === 'bi_weekly' ? 'Bi-Weekly' :
                               offer.repaymentFrequency.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                        {offer.gracePeriodDays > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Grace Period:</span>
                            <span className="font-medium text-blue-600">{offer.gracePeriodDays} days</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fee Structure */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Fee Structure</h4>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        {offer.latePaymentPenalty && parseFloat(offer.latePaymentPenalty) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Late Payment Penalty:</span>
                            <span className="font-medium text-red-600">{offer.latePaymentPenalty}%</span>
                          </div>
                        )}
                        {offer.prepaymentPenalty && parseFloat(offer.prepaymentPenalty) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Prepayment Penalty:</span>
                            <span className="font-medium text-orange-600">{offer.prepaymentPenalty}%</span>
                          </div>
                        )}
                        {offer.compoundingFrequency && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Compounding:</span>
                            <span className="font-medium">{offer.compoundingFrequency}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="col-span-full">
                      <h4 className="font-medium text-gray-900 mb-3">Financial Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="text-xs text-blue-600 mb-1">Principal Amount</div>
                          <div className="font-bold text-blue-900">₹{(parseFloat(offer.amount || '0')).toLocaleString()}</div>
                        </div>
                        {scheduleData.summary?.totalInterest && (
                          <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-orange-600 mb-1">Total Interest</div>
                            <div className="font-bold text-orange-900">₹{(scheduleData.summary?.totalInterest || 0).toLocaleString()}</div>
                          </div>
                        )}
                        {scheduleData.summary?.totalAmount && (
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-green-600 mb-1">Total Repayment</div>
                            <div className="font-bold text-green-900">₹{(scheduleData.summary?.totalAmount || 0).toLocaleString()}</div>
                          </div>
                        )}
                        {scheduleData.summary?.effectiveRate && (
                          <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="text-xs text-purple-600 mb-1">Effective Rate</div>
                            <div className="font-bold text-purple-900">{scheduleData.summary.effectiveRate.toFixed(2)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Management Section - Unified payment system */}
            {offer.status === 'accepted' && isReceiver && (
              <Card className="border-2 border-blue-300 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                  <CardTitle className="flex items-center text-blue-900">
                    <Calendar className="w-6 h-6 mr-2 text-blue-700" />
                    Payment Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Current Payment Status */}
                  <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-blue-900 text-xl mb-2">
                          Current Loan Status
                        </div>
                        <p className="text-blue-700 font-medium">
                          {outstanding > 0 ? (overDueAmount > 0 ? 'Payment Overdue' : 'Active Loan') : 'Loan Completed'}
                        </p>
                      </div>
                      <div className="text-right bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                        <div className="font-black text-blue-900 text-2xl">
                          ₹{(outstanding || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-blue-700 mt-1 font-medium">
                          Outstanding Balance
                        </div>
                        {overDueAmount > 0 && (
                          <div className="text-sm text-red-700 mt-2 font-bold bg-red-50 px-2 py-1 rounded border border-red-200">
                            Overdue: ₹{(overDueAmount || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Action Section */}
                  {outstanding > 0 && (
                    payments.some((p: any) => p.status === 'pending') ? (
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-xl border-2 border-yellow-300 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-yellow-900 font-bold text-lg mb-2">Payment Pending Approval</p>
                            <p className="text-yellow-800 font-medium">
                              Your payment is awaiting lender approval. It will be auto-removed if not approved within 24 hours.
                            </p>
                          </div>
                          <div className="text-yellow-700 bg-white p-3 rounded-full border border-yellow-300">
                            <Clock className="w-7 h-7" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 text-lg">Make Payment</h4>
                        <Button 
                          onClick={() => {
                            // Calculate the exact payment amount due
                            let paymentAmount;
                            if (scheduleData?.schedule?.emiAmount) {
                              // For EMI-based repayment types, use EMI amount
                              paymentAmount = scheduleData.schedule.emiAmount;
                            } else if (dueAmount > 0) {
                              // Use specific due amount if available
                              paymentAmount = dueAmount;
                            } else if (overDueAmount > 0) {
                              // Use overdue amount if available
                              paymentAmount = overDueAmount;
                            } else {
                              // Fallback to full outstanding amount
                              paymentAmount = outstanding;
                            }
                            
                            // Submit payment with default values
                            submitPaymentMutation.mutate({
                              amount: parseFloat(paymentAmount.toString()),
                              status: 'pending' as const,
                              paymentMode: 'upi', // Default payment mode
                              refString: `AUTO-${Date.now()}` // Auto-generated reference
                            });
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 text-xl"
                          disabled={submitPaymentMutation.isPending}
                          data-testid="button-pay-due-amount"
                        >
                          {submitPaymentMutation.isPending ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                              Processing Payment...
                            </div>
                          ) : (
                            (() => {
                              // Calculate display amount for button text
                              let displayAmount;
                              if (scheduleData?.schedule?.emiAmount) {
                                displayAmount = scheduleData.schedule.emiAmount;
                              } else if (dueAmount > 0) {
                                displayAmount = dueAmount;
                              } else if (overDueAmount > 0) {
                                displayAmount = overDueAmount;
                              } else {
                                displayAmount = outstanding;
                              }
                              return `Pay ₹${(displayAmount || 0).toLocaleString()}`;
                            })()
                          )}
                        </Button>
                        <p className="text-sm text-gray-600 text-center">
                          Payment will be submitted with UPI as default method
                        </p>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment: any) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'pending':
                            return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
                          case 'paid':
                            return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
                          case 'rejected':
                            return <Badge className="bg-red-100 text-red-800"><Ban className="w-3 h-3 mr-1" />Rejected</Badge>;
                          default:
                            return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
                        }
                      };

                      return (
                        <div key={payment.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">₹{(parseFloat(payment.amount || '0')).toLocaleString()}</div>
                              <div className="text-sm text-gray-600">
                                {payment.paymentMode} • {payment.paidAt ? formatFirebaseDate(payment.paidAt) : formatFirebaseDate(payment.createdAt)}
                              </div>
                              {payment.refString && (
                                <div className="text-xs text-gray-500">Ref: {payment.refString}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(payment.status)}
                            </div>
                          </div>
                          
                          {/* Approval buttons for lender when payment is pending */}
                          {payment.status === 'pending' && isSender && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => approvePaymentMutation.mutate(payment.id)}
                                disabled={approvePaymentMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectPaymentMutation.mutate({ paymentId: payment.id })}
                                disabled={rejectPaymentMutation.isPending}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600">No payments recorded yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Principal</span>
                  <span className="font-semibold">₹{(amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Principal</span>
                  <span className="font-semibold text-red-600">₹{(outstandingPrincipal || 0).toLocaleString()}</span>
                </div>
                {scheduleData?.schedule && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Interest</span>
                    <span className="font-semibold text-orange-600">₹{(scheduleData.schedule?.totalInterest || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Loan Amount</span>
                  <span className="font-semibold">₹{(totalAmountDue || 0).toLocaleString()}</span>
                </div>
                {dueAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Current Due</span>
                    <span className="font-semibold">₹{(dueAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                {overDueAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Overdue Amount</span>
                    <span className="font-semibold">₹{(overDueAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-semibold text-green-600">₹{(totalPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="text-gray-600">Total Outstanding</span>
                  <span className="font-bold text-red-600">₹{(outstanding || 0).toLocaleString()}</span>
                </div>
                
                {offer.status === 'accepted' && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (totalPaid / totalAmountDue) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-center text-gray-600">
                      {Math.round(Math.min(100, (totalPaid / totalAmountDue) * 100))}% completed
                    </div>
                  </div>
                )}

                {/* Next payment info for EMI */}
                {offer.status === 'accepted' && offer.repaymentType === 'emi' && scheduleData?.schedule?.emiAmount && outstanding > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    {(() => {
                      const emiAmount = scheduleData.schedule.emiAmount;
                      const completedEMIs = Math.floor(totalPaid / emiAmount);
                      const remainingForCurrentEMI = totalPaid % emiAmount;
                      
                      if (remainingForCurrentEMI > 0) {
                        const requiredAmount = emiAmount - remainingForCurrentEMI;
                        return (
                          <>
                            <div className="text-sm font-medium text-blue-800">Complete EMI #{completedEMIs + 1}</div>
                            <div className="text-lg font-bold text-blue-900">₹{(requiredAmount || 0).toLocaleString()}</div>
                            <div className="text-xs text-blue-600">Remaining amount to complete this EMI</div>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <div className="text-sm font-medium text-blue-800">Next EMI #{completedEMIs + 1} Due</div>
                            <div className="text-lg font-bold text-blue-900">₹{(emiAmount || 0).toLocaleString()}</div>
                            <div className="text-xs text-blue-600">EMI payments must be exact amount</div>
                          </>
                        );
                      }
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={downloadContract}
                  data-testid="button-download-contract"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Contract
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                  onClick={downloadKFS}
                  data-testid="button-download-kfs"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download KFS
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                  onClick={downloadRepaymentSchedule}
                  data-testid="button-download-schedule"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Schedule
                </Button>

                {/* Lender Controls */}
                {offer.status === 'accepted' && isSender && (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Allow Partial Payments</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePartialPaymentMutation.mutate(!offer.allowPartPayment)}
                          disabled={togglePartialPaymentMutation.isPending}
                          className={offer.allowPartPayment ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50"}
                        >
                          {offer.allowPartPayment ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {offer.allowPartPayment 
                          ? "Borrower can make partial payments for installments"
                          : "Borrower must pay exact installment amounts"
                        }
                      </p>
                    </div>

                    <Dialog open={isCloseLoanDialogOpen} onOpenChange={setIsCloseLoanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Close Loan Early
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Close Loan Early</DialogTitle>
                          <p className="text-sm text-gray-600">
                            This will mark the loan as completed regardless of remaining balance. 
                            This action cannot be undone.
                          </p>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="closeLoanReason">Reason for Early Closure (Optional)</Label>
                            <Input
                              id="closeLoanReason"
                              value={closeLoanReason}
                              onChange={(e) => setCloseLoanReason(e.target.value)}
                              placeholder="e.g., Borrower paid remaining amount outside platform"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsCloseLoanDialogOpen(false);
                                setCloseLoanReason("");
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => closeLoanMutation.mutate(closeLoanReason)}
                              disabled={closeLoanMutation.isPending}
                              className="flex-1 bg-orange-600 hover:bg-orange-700"
                            >
                              {closeLoanMutation.isPending ? "Closing..." : "Close Loan"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Offer Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span>{formatFirebaseDate(offer.createdAt)}</span>
                  </div>
                  {offer.status !== 'pending' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Updated</span>
                      <span>{formatFirebaseDate(offer.updatedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date</span>
                    <span className={new Date(offer.dueDate._seconds ? offer.dueDate._seconds * 1000 : offer.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                      {formatFirebaseDate(offer.dueDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

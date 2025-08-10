import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/navbar";
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
import { insertPaymentSchema, type InsertPayment } from "@shared/schema";
import { 
  ArrowLeft, 
  IndianRupee, 
  Calendar, 
  User, 
  FileText, 
  Download,
  CheckCircle,
  XCircle,
  Plus
} from "lucide-react";

interface ViewOfferProps {
  offerId: string;
}

export default function ViewOffer({ offerId }: ViewOfferProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("");

  const currentUser = authService.getUser();

  const { data: offerData, isLoading } = useQuery({
    queryKey: ['/api/offers', offerId],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<Omit<InsertPayment, 'offerId'>>({
    resolver: zodResolver(insertPaymentSchema.omit({ offerId: true }))
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const response = await apiRequest('PATCH', `/api/offers/${offerId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      toast({
        title: "Offer Updated",
        description: "The offer status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (data: Omit<InsertPayment, 'offerId'>) => {
      const response = await apiRequest('POST', '/api/payments', {
        ...data,
        offerId,
        status: 'paid',
        paidAt: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      setIsPaymentDialogOpen(false);
      reset();
      setPaymentMode("");
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const downloadContract = async () => {
    try {
      const response = await fetch(`/api/offers/${offerId}/contract`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${offerId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmitPayment = (data: Omit<InsertPayment, 'offerId'>) => {
    addPaymentMutation.mutate({
      ...data,
      paymentMode
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
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

  const { offer, fromUser, contact } = offerData.offer;
  const payments = offerData.payments || [];
  
  const totalPaid = payments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
  
  const amount = parseFloat(offer.amount);
  const outstanding = amount - totalPaid;
  
  const isReceiver = contact?.verifiedUserId === currentUser?.id;
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
                      {isReceiver ? fromUser?.name : contact?.name}
                    </div>
                    <div className="text-gray-600">
                      {isReceiver ? fromUser?.phone : contact?.phone}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <IndianRupee className="w-4 h-4" />
                      <span>Amount</span>
                    </div>
                    <div className="font-semibold text-2xl text-navy-600">
                      ₹{amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Interest Rate</div>
                    <div className="font-semibold">{offer.interestRate}% ({offer.interestType})</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due Date</span>
                    </div>
                    <div className="font-semibold">
                      {new Date(offer.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tenure</div>
                    <div className="font-semibold">{offer.tenureValue} {offer.tenureUnit}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Repayment Type</div>
                    <div className="font-semibold">{offer.repaymentType.replace('_', ' ')}</div>
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
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => updateOfferMutation.mutate({ status: 'accepted' })}
                      disabled={updateOfferMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Offer
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => updateOfferMutation.mutate({ status: 'declined' })}
                      disabled={updateOfferMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline Offer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Payment History</CardTitle>
                  {offer.status === 'accepted' && outstanding > 0 && isReceiver && (
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Payment</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              {...register("amount", { valueAsNumber: true })}
                              placeholder="Enter payment amount"
                            />
                            {errors.amount && (
                              <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                            )}
                          </div>
                          
                          <div>
                            <Label>Payment Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="refString">Reference Number (Optional)</Label>
                            <Input
                              id="refString"
                              {...register("refString")}
                              placeholder="Transaction ID, cheque number, etc."
                            />
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={addPaymentMutation.isPending}
                          >
                            {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-semibold">₹{parseFloat(payment.amount).toLocaleString()}</div>
                          <div className="text-sm text-gray-600">
                            {payment.paymentMode} • {new Date(payment.paidAt).toLocaleDateString()}
                          </div>
                          {payment.refString && (
                            <div className="text-xs text-gray-500">Ref: {payment.refString}</div>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
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
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-semibold text-green-600">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Outstanding</span>
                  <span className="font-bold text-red-600">₹{outstanding.toLocaleString()}</span>
                </div>
                
                {offer.status === 'accepted' && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${(totalPaid / amount) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-center text-gray-600">
                      {Math.round((totalPaid / amount) * 100)}% completed
                    </div>
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
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Contract
                </Button>
                
                {offer.status === 'accepted' && outstanding === 0 && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => updateOfferMutation.mutate({ status: 'completed' })}
                    disabled={updateOfferMutation.isPending || offer.status === 'completed'}
                  >
                    Mark as Completed
                  </Button>
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
                    <span>{new Date(offer.createdAt).toLocaleDateString()}</span>
                  </div>
                  {offer.status !== 'pending' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Updated</span>
                      <span>{new Date(offer.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date</span>
                    <span className={new Date(offer.dueDate) < new Date() ? 'text-red-600 font-semibold' : ''}>
                      {new Date(offer.dueDate).toLocaleDateString()}
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

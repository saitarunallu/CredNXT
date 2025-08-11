import { useState } from "react";
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
  Plus,
  Clock,
  Ban,
  Calculator,
  TrendingUp
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

  const { data: scheduleData } = useQuery({
    queryKey: ['/api/offers', offerId, 'schedule'],
    enabled: !!offerData?.offer,
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
        offerId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', offerId] });
      setIsPaymentDialogOpen(false);
      reset();
      setPaymentMode("");
      toast({
        title: "Payment Submitted",
        description: "Payment has been submitted for approval.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit payment. Please try again.",
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
      toast({
        title: "Payment Approved",
        description: "Payment has been approved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve payment. Please try again.",
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
      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject payment. Please try again.",
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
    // Client-side validation for EMI payments
    if (offer.repaymentType === 'emi' && scheduleData?.schedule?.emiAmount) {
      const emiAmount = scheduleData.schedule.emiAmount;
      const paymentAmount = parseFloat(data.amount);
      const completedEMIs = Math.floor(totalPaid / emiAmount);
      const remainingForCurrentEMI = totalPaid % emiAmount;
      
      // Check if all EMIs are completed
      if (completedEMIs >= scheduleData.schedule.numberOfPayments) {
        toast({
          title: "All EMIs Completed",
          description: "All EMI payments have been completed for this loan",
          variant: "destructive"
        });
        return;
      }
      
      // If there's a partial payment for current EMI, require the remaining amount
      if (remainingForCurrentEMI > 0) {
        const requiredAmount = emiAmount - remainingForCurrentEMI;
        if (Math.abs(paymentAmount - requiredAmount) > 0.01) {
          toast({
            title: "Invalid EMI Amount",
            description: `Need ₹${requiredAmount.toLocaleString()} to complete EMI #${completedEMIs + 1}`,
            variant: "destructive"
          });
          return;
        }
      } else {
        // Require exact EMI amount for next installment
        if (Math.abs(paymentAmount - emiAmount) > 0.01) {
          toast({
            title: "Invalid EMI Amount",
            description: `EMI #${completedEMIs + 1} should be exactly ₹${emiAmount.toLocaleString()}`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    addPaymentMutation.mutate({
      ...data,
      paymentMode
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading offer details..." />;
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
  // Use total amount from schedule if available, otherwise use principal
  const totalAmountDue = scheduleData?.schedule?.totalAmount || amount;
  const outstanding = totalAmountDue - totalPaid;
  
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

            {/* Repayment Schedule */}
            {offer.status === 'accepted' && scheduleData?.schedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Repayment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                        <div className="font-semibold text-lg">₹{scheduleData.schedule.totalAmount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total Interest</div>
                        <div className="font-semibold text-lg text-green-600">₹{scheduleData.schedule.totalInterest.toLocaleString()}</div>
                      </div>
                      {scheduleData.schedule.emiAmount && (
                        <>
                          <div>
                            <div className="text-sm text-gray-600">EMI Amount</div>
                            <div className="font-semibold text-lg text-blue-600">₹{scheduleData.schedule.emiAmount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Number of EMIs</div>
                            <div className="font-semibold text-lg">{scheduleData.schedule.numberOfPayments}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Schedule Details for EMI */}
                    {offer.repaymentType === 'emi' && scheduleData.schedule.schedule.length <= 12 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Payment Schedule</h4>
                        <div className="max-h-60 overflow-y-auto">
                          {scheduleData.schedule.schedule.map((installment: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2 border-b border-gray-100">
                              <div>
                                <div className="font-medium">EMI #{installment.installmentNumber}</div>
                                <div className="text-sm text-gray-600">
                                  Due: {new Date(installment.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{installment.totalAmount.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">
                                  P: ₹{installment.principalAmount.toLocaleString()} | I: ₹{installment.interestAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simple message for large schedules */}
                    {offer.repaymentType === 'emi' && scheduleData.schedule.schedule.length > 12 && (
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <TrendingUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          {scheduleData.schedule.numberOfPayments} EMI payments of ₹{scheduleData.schedule.emiAmount?.toLocaleString()} each
                        </p>
                      </div>
                    )}
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
                          Submit Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Payment</DialogTitle>
                          <p className="text-sm text-gray-600">Submit payment details for lender approval. The payment will be marked as pending until approved.</p>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Amount</Label>
                            {offer.repaymentType === 'emi' && scheduleData?.schedule?.emiAmount && (
                              <div className="text-sm text-blue-600 mb-1">
                                EMI Amount: ₹{scheduleData.schedule.emiAmount.toLocaleString()}
                              </div>
                            )}
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              {...register("amount", { valueAsNumber: true })}
                              placeholder={
                                offer.repaymentType === 'emi' && scheduleData?.schedule?.emiAmount
                                  ? scheduleData.schedule.emiAmount.toString()
                                  : "Enter payment amount"
                              }
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
                            {addPaymentMutation.isPending ? "Submitting..." : "Submit Payment"}
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
                              <div className="font-semibold">₹{parseFloat(payment.amount).toLocaleString()}</div>
                              <div className="text-sm text-gray-600">
                                {payment.paymentMode} • {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
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
                  <span className="text-gray-600">Principal Amount</span>
                  <span className="font-semibold">₹{amount.toLocaleString()}</span>
                </div>
                {scheduleData?.schedule && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Interest</span>
                    <span className="font-semibold text-orange-600">₹{scheduleData.schedule.totalInterest.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total Amount Due</span>
                  <span className="font-semibold">₹{totalAmountDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-semibold text-green-600">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="text-gray-600">Outstanding</span>
                  <span className="font-bold text-red-600">₹{outstanding.toLocaleString()}</span>
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
                            <div className="text-lg font-bold text-blue-900">₹{requiredAmount.toLocaleString()}</div>
                            <div className="text-xs text-blue-600">Remaining amount to complete this EMI</div>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <div className="text-sm font-medium text-blue-800">Next EMI #{completedEMIs + 1} Due</div>
                            <div className="text-lg font-bold text-blue-900">₹{emiAmount.toLocaleString()}</div>
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

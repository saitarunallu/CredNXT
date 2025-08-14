import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, IndianRupee, User, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, HandCoins, Wallet, Download } from "lucide-react";
import { Offer, User as UserType } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";

interface OfferCardProps {
  offer: Offer;
  fromUser?: UserType;
  totalPaid?: string;
  isReceived?: boolean;
}

export default function OfferCard({ 
  offer, 
  fromUser, 
  totalPaid = "0",
  isReceived = false 
}: OfferCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  
  const displayName = isReceived ? fromUser?.name : offer.toUserName;
  const amount = parseFloat(offer.amount);
  const paid = parseFloat(totalPaid);
  const outstanding = amount - paid;

  const updateOfferMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const response = await apiRequest('PATCH', `/api/offers/${offer.id}`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: variables.status === 'accepted' ? "Offer Accepted" : "Offer Declined",
        description: `The offer has been ${variables.status}.`,
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

  const downloadRepaymentSchedule = async () => {
    try {
      const response = await fetch(`/api/offers/${offer.id}/schedule/download`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('PDF Blob size:', blob.size, 'bytes');
        console.log('PDF Blob type:', blob.type);
        
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repayment-schedule-${offer.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Add delay before cleanup to ensure download starts
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        
        toast({
          title: "Success",
          description: `Repayment schedule downloaded successfully (${blob.size} bytes).`,
        });
      } else {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download repayment schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOfferTypeColor = (type: string) => {
    return type === 'lend' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  // Get the offer type from the perspective of the current viewer
  const getDisplayType = () => {
    // If offer is accepted, show it as an active agreement
    if (offer.status === 'accepted') {
      if (isReceived) {
        if (offer.offerType === 'lend') {
          return { label: 'LOAN AGREEMENT', subtitle: 'You borrowed money' };
        } else {
          return { label: 'LENDING AGREEMENT', subtitle: 'You lent money' };
        }
      } else {
        if (offer.offerType === 'lend') {
          return { label: 'LENDING AGREEMENT', subtitle: 'You lent money' };
        } else {
          return { label: 'LOAN AGREEMENT', subtitle: 'You borrowed money' };
        }
      }
    }
    
    // For pending/declined/completed offers, show original intent
    if (isReceived) {
      // Received offers: flip the perspective
      if (offer.offerType === 'lend') {
        return { label: 'LOAN OFFER', subtitle: 'You can borrow money' }; // They want to lend to you = loan offer for you
      } else {
        return { label: 'LENDING REQUEST', subtitle: 'They want to borrow from you' }; // They want to borrow from you = lending request for you
      }
    } else {
      // Sent offers: show as created
      if (offer.offerType === 'lend') {
        return { label: 'LENT OFFER', subtitle: 'You offered to lend money' };
      } else {
        return { label: 'LOAN REQUEST', subtitle: 'You requested to borrow money' };
      }
    }
  };

  const getDisplayTypeColor = () => {
    // Special styling for accepted agreements
    if (offer.status === 'accepted') {
      if (isReceived) {
        return offer.offerType === 'lend' ? 'bg-blue-50 text-blue-900 border-blue-400' : 'bg-green-50 text-green-900 border-green-400';
      } else {
        return offer.offerType === 'lend' ? 'bg-green-50 text-green-900 border-green-400' : 'bg-blue-50 text-blue-900 border-blue-400';
      }
    }
    
    // Original colors for pending/other statuses
    if (isReceived) {
      return offer.offerType === 'lend' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-orange-100 text-orange-800 border-orange-300';
    } else {
      return offer.offerType === 'lend' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  const getTypeIcon = () => {
    // Use checkmark icon for accepted agreements
    if (offer.status === 'accepted') {
      return CheckCircle;
    }
    
    if (isReceived) {
      return offer.offerType === 'lend' ? ArrowDownLeft : ArrowUpRight;
    } else {
      return offer.offerType === 'lend' ? HandCoins : Wallet;
    }
  };

  return (
    <Card className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Gradient Top Bar */}
      <div className={`h-1 w-full ${offer.status === 'accepted' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : offer.status === 'pending' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`} />
      
      <CardHeader className="pb-4 pt-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
              <p className="text-sm text-gray-500 font-medium">
                {isReceived ? fromUser?.phone : offer.toUserPhone}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={`${getStatusColor(offer.status)} text-xs font-bold tracking-wide uppercase`}>
              {offer.status}
            </Badge>
          </div>
        </div>
        
        {/* Offer Type Banner */}
        <div className={`mt-4 px-4 py-2 rounded-lg border-l-4 ${getDisplayTypeColor()}`}>
          <div className="flex items-center space-x-2">
            {(() => {
              const IconComponent = getTypeIcon();
              return <IconComponent className="w-4 h-4" />;
            })()}
            <span className="font-semibold text-sm">{getDisplayType().label}</span>
          </div>
          <p className="text-xs mt-1 opacity-80">{getDisplayType().subtitle}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* Amount and Date Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <IndianRupee className="w-3 h-3" />
              <span className="font-medium uppercase tracking-wide">Amount</span>
            </div>
            <div className="font-bold text-xl text-gray-900">₹{amount.toLocaleString()}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              <span className="font-medium uppercase tracking-wide">
                {offer.status === 'accepted' && offer.nextPaymentDueDate ? 'Next Due' : 'Due Date'}
              </span>
            </div>
            <div className="font-bold text-sm text-gray-900">
              {offer.status === 'accepted' && offer.nextPaymentDueDate 
                ? new Date(offer.nextPaymentDueDate).toLocaleDateString()
                : new Date(offer.dueDate).toLocaleDateString()
              }
            </div>
          </div>
        </div>

        {/* Progress Section for Accepted Offers */}
        {offer.status === 'accepted' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-green-800">Payment Progress</span>
              <span className="text-xs text-green-600 font-medium">{((paid / amount) * 100).toFixed(1)}% Complete</span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Paid</span>
                <span className="font-bold text-green-800">₹{paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Outstanding</span>
                <span className="font-bold text-red-600">₹{outstanding.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="w-full bg-green-200 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${(paid / amount) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Purpose Section */}
        {offer.purpose && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <span className="text-xs text-blue-600 font-medium uppercase tracking-wide block mb-1">Purpose</span>
            <span className="text-sm text-blue-900 font-medium">{offer.purpose}</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {offer.status === 'pending' && isReceived && offer.toUserId === currentUser?.id ? (
          <div className="w-full space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => updateOfferMutation.mutate({ status: 'accepted' })}
                disabled={updateOfferMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-2 h-9"
                size="sm"
                data-testid="button-accept-offer"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button 
                variant="destructive"
                onClick={() => updateOfferMutation.mutate({ status: 'declined' })}
                disabled={updateOfferMutation.isPending}
                className="text-xs px-2 py-2 h-9"
                size="sm"
                data-testid="button-decline-offer"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/offers/${offer.id}`} className="w-full block">
                <Button variant="outline" className="w-full text-xs h-9 border-gray-300" size="sm" data-testid="button-view-details">
                  View Details
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full text-xs h-9 border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                size="sm"
                onClick={downloadRepaymentSchedule}
                data-testid="button-download-schedule-card"
              >
                <Download className="w-3 h-3 mr-1" />
                Schedule
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <Link href={`/offers/${offer.id}`} className="w-full">
              <Button variant="outline" className="w-full" data-testid="button-view-details">
                View Details
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full bg-green-50 border-green-200 hover:bg-green-100 text-green-700 text-sm"
              onClick={downloadRepaymentSchedule}
              data-testid="button-download-schedule-card"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Schedule
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

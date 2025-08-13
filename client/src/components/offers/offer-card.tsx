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
    <Card className="shadow-card hover:shadow-card-hover hover:shadow-glow-sm transition-all duration-300 transform hover:-translate-y-1 border-0 bg-card-enhanced">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-navy rounded-card flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-600">
                {isReceived ? fromUser?.phone : offer.toUserPhone}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getStatusColor(offer.status)}>
              {offer.status}
            </Badge>
            <div className={`px-3 py-1.5 rounded-lg border font-medium text-xs ${getDisplayTypeColor()}`}>
              <div className="flex items-center space-x-1">
                {(() => {
                  const IconComponent = getTypeIcon();
                  return <IconComponent className="w-3 h-3" />;
                })()}
                <span>{getDisplayType().label}</span>
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                {getDisplayType().subtitle}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <IndianRupee className="w-4 h-4" />
              <span>Amount</span>
            </div>
            <div className="font-semibold text-lg">₹{amount.toLocaleString()}</div>
          </div>
          
          <div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{offer.status === 'accepted' && offer.nextPaymentDueDate ? 'Next Payment Due' : 'Due Date'}</span>
            </div>
            <div className="font-medium">
              {offer.status === 'accepted' && offer.nextPaymentDueDate 
                ? new Date(offer.nextPaymentDueDate).toLocaleDateString()
                : new Date(offer.dueDate).toLocaleDateString()
              }
            </div>
          </div>
        </div>

        {offer.status === 'accepted' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid</span>
              <span className="font-medium">₹{paid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Outstanding</span>
              <span className="font-medium text-red-600">₹{outstanding.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(paid / amount) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {offer.purpose && (
          <div>
            <span className="text-sm text-gray-600">Purpose: </span>
            <span className="text-sm">{offer.purpose}</span>
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

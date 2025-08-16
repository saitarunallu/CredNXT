import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, IndianRupee, User, CheckCircle, XCircle, ArrowDownLeft, ArrowUpRight, HandCoins, Wallet, Download } from "lucide-react";
import { Offer, User as UserType } from "@shared/firestore-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { unifiedDataService } from "@/lib/unified-data-service";

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
  
  const displayName = isReceived 
    ? (fromUser?.name || offer.toUserName || "Unknown User")
    : (offer.toUserName || "Unknown User");
  const amount = parseFloat(String(offer.amount));
  const paid = parseFloat(totalPaid);
  const outstanding = amount - paid;

  const acceptOfferMutation = useMutation({
    mutationFn: () => unifiedDataService.acceptOffer(offer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'] });
      toast({
        title: "Offer Accepted",
        description: "You have successfully accepted this offer.",
      });
    },
    onError: (error) => {
      console.error('Accept offer error in card:', error);
      toast({
        title: "Error",
        description: "Failed to accept offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const rejectOfferMutation = useMutation({
    mutationFn: () => unifiedDataService.rejectOffer(offer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-offers'] });
      toast({
        title: "Offer Declined",
        description: "You have declined this offer.",
      });
    },
    onError: (error) => {
      console.error('Reject offer error in card:', error);
      toast({
        title: "Error",
        description: "Failed to decline offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const downloadRepaymentSchedule = async () => {
    try {
      const blob = await unifiedDataService.downloadRepaymentSchedule(offer.id);
      
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

  // Get initials from name
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusBadge = () => {
    if (offer.status === 'pending') {
      return <span className="text-yellow-600 font-semibold text-sm">Pending</span>;
    } else if (offer.status === 'accepted') {
      return <span className="text-green-600 font-semibold text-sm">Active</span>;
    } else if (offer.status === 'overdue') {
      return <span className="text-red-600 font-semibold text-sm">Overdue</span>;
    } else if (offer.status === 'completed') {
      return <span className="text-black font-semibold text-sm">Closed</span>;
    }
    // For other statuses, show in orange as "due in days"
    return <span className="text-orange-600 font-semibold text-sm capitalize">{offer.status}</span>;
  };

  return (
    <Link href={`/offers/${offer.id}`} className="block" data-testid={`link-offer-${offer.id}`}>
      <Card className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
        <div className="flex items-center justify-between">
          {/* Left side - Avatar and Info */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{getInitials(displayName)}</span>
              </div>
              {/* Direction indicator */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                isReceived 
                  ? 'bg-orange-500' // Money you owe (debt)
                  : 'bg-green-500' // Money you own/lent (earning)
              }`}>
                {isReceived ? (
                  <ArrowDownLeft className="w-3 h-3 text-white" />
                ) : (
                  <ArrowUpRight className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  isReceived 
                    ? 'bg-orange-100 text-orange-700' // Money you owe
                    : 'bg-green-100 text-green-700' // Money you own/lent
                }`}>
                  {isReceived ? 'Borrowing' : 'Lending'}
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                Due: {offer.status === 'accepted' && offer.nextPaymentDueDate 
                  ? (offer.nextPaymentDueDate?.toDate ? offer.nextPaymentDueDate.toDate() : new Date(offer.nextPaymentDueDate as any)).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : (offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any)).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                }
              </p>
            </div>
          </div>

          {/* Right side - Amount and Status */}
          <div className="text-right">
            <div className="font-bold text-xl text-gray-900">₹{amount.toLocaleString()}</div>
            {getStatusBadge()}
          </div>
        </div>
      
        {/* Optional: Show action buttons for pending offers */}
        {offer.status === 'pending' && isReceived && offer.toUserId === currentUser?.id && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex space-x-2">
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                acceptOfferMutation.mutate();
              }}
              disabled={acceptOfferMutation.isPending || rejectOfferMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-8 flex-1"
              size="sm"
              data-testid="button-accept-offer"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button 
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                rejectOfferMutation.mutate();
              }}
              disabled={acceptOfferMutation.isPending || rejectOfferMutation.isPending}
              className="text-xs px-3 py-1.5 h-8 flex-1"
              size="sm"
              data-testid="button-decline-offer"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Decline
            </Button>
          </div>
        )}
      </Card>
    </Link>
  );
}

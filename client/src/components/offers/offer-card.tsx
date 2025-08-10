import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, IndianRupee, User } from "lucide-react";
import { Offer, Contact, User as UserType } from "@shared/schema";

interface OfferCardProps {
  offer: Offer;
  contact?: Contact;
  fromUser?: UserType;
  totalPaid?: string;
  isReceived?: boolean;
}

export default function OfferCard({ 
  offer, 
  contact, 
  fromUser, 
  totalPaid = "0",
  isReceived = false 
}: OfferCardProps) {
  const displayName = isReceived ? fromUser?.name : contact?.name;
  const amount = parseFloat(offer.amount);
  const paid = parseFloat(totalPaid);
  const outstanding = amount - paid;

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

  const getOfferTypeColor = (type: string) => {
    return type === 'lend' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-600">
                {isReceived ? fromUser?.phone : contact?.phone}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={getStatusColor(offer.status)}>
              {offer.status}
            </Badge>
            <Badge className={getOfferTypeColor(offer.offerType)}>
              {offer.offerType}
            </Badge>
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
              <span>Due Date</span>
            </div>
            <div className="font-medium">
              {new Date(offer.dueDate).toLocaleDateString()}
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
        <Link href={`/offers/${offer.id}`}>
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

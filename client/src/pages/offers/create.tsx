import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertOfferSchema, type InsertOffer } from "@shared/schema";
import { ArrowLeft, FileText } from "lucide-react";

export default function CreateOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedContact, setSelectedContact] = useState("");
  const [offerType, setOfferType] = useState("");
  const [interestType, setInterestType] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [tenureUnit, setTenureUnit] = useState("");
  const [allowPartPayment, setAllowPartPayment] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ['/api/contacts'],
  });

  const contacts = contactsData?.contacts || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<Omit<InsertOffer, 'fromUserId'>>({
    resolver: zodResolver(insertOfferSchema.omit({ fromUserId: true }))
  });

  const tenureValue = watch('tenureValue');

  const createOfferMutation = useMutation({
    mutationFn: async (data: Omit<InsertOffer, 'fromUserId'>) => {
      const response = await apiRequest('POST', '/api/offers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setLocation('/dashboard');
      toast({
        title: "Offer Created",
        description: "Your offer has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate due date based on tenure
  const calculateDueDate = () => {
    if (!tenureValue || !tenureUnit) return new Date();
    
    const now = new Date();
    const value = parseInt(tenureValue.toString());
    
    switch (tenureUnit) {
      case 'days':
        return new Date(now.getTime() + (value * 24 * 60 * 60 * 1000));
      case 'weeks':
        return new Date(now.getTime() + (value * 7 * 24 * 60 * 60 * 1000));
      case 'months':
        const newDate = new Date(now);
        newDate.setMonth(newDate.getMonth() + value);
        return newDate;
      default:
        return now;
    }
  };

  const onSubmit = (data: Omit<InsertOffer, 'fromUserId'>) => {
    const dueDate = calculateDueDate();
    const formData = {
      ...data,
      toContactId: selectedContact,
      offerType: offerType as any,
      interestType: interestType as any,
      repaymentType: repaymentType as any,
      tenureUnit: tenureUnit as any,
      allowPartPayment,
      dueDate: dueDate.toISOString(),
    };
    
    createOfferMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Offer</h1>
            <p className="text-gray-600">Create a lending or borrowing agreement</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Offer Details
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Offer Type */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Offer Type</Label>
                  <Select value={offerType} onValueChange={setOfferType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select offer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lend">I want to lend money</SelectItem>
                      <SelectItem value="borrow">I want to borrow money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contact</Label>
                  <Select value={selectedContact} onValueChange={setSelectedContact}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact: any) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} ({contact.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount and Interest */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    placeholder="Enter amount"
                    className="mt-1"
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    {...register("interestRate", { valueAsNumber: true })}
                    placeholder="Enter interest rate"
                    className="mt-1"
                  />
                  {errors.interestRate && (
                    <p className="text-sm text-red-600 mt-1">{errors.interestRate.message}</p>
                  )}
                </div>
              </div>

              {/* Interest Type and Repayment Type */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Interest Type</Label>
                  <Select value={interestType} onValueChange={setInterestType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select interest type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Interest</SelectItem>
                      <SelectItem value="reducing">Reducing Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Repayment Type</Label>
                  <Select value={repaymentType} onValueChange={setRepaymentType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select repayment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emi">EMI (Equal Monthly Installments)</SelectItem>
                      <SelectItem value="interest_only">Interest Only</SelectItem>
                      <SelectItem value="full_payment">Full Payment at End</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tenure */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="tenureValue">Tenure Duration</Label>
                  <Input
                    id="tenureValue"
                    type="number"
                    {...register("tenureValue", { valueAsNumber: true })}
                    placeholder="Enter duration"
                    className="mt-1"
                  />
                  {errors.tenureValue && (
                    <p className="text-sm text-red-600 mt-1">{errors.tenureValue.message}</p>
                  )}
                </div>

                <div>
                  <Label>Tenure Unit</Label>
                  <Select value={tenureUnit} onValueChange={setTenureUnit}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select tenure unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Purpose and Note */}
              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  {...register("purpose")}
                  placeholder="What is this money for?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="note">Additional Notes</Label>
                <Textarea
                  id="note"
                  {...register("note")}
                  placeholder="Any additional terms or conditions..."
                  className="mt-1"
                />
              </div>

              {/* Part Payment Option */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="allowPartPayment"
                  checked={allowPartPayment}
                  onCheckedChange={setAllowPartPayment}
                />
                <Label htmlFor="allowPartPayment">Allow partial payments</Label>
              </div>

              {/* Due Date Preview */}
              {tenureValue && tenureUnit && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Due Date Preview</h4>
                  <p className="text-blue-800">
                    This offer will be due on: {calculateDueDate().toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending || !selectedContact || !offerType}
                  className="bg-navy-600 hover:bg-navy-700"
                >
                  {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { firebaseBackend } from "@/lib/firebase-backend-service";
import { insertOfferSchema, type InsertOffer } from "@shared/firestore-schema";
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Percent, Clock, Info, Phone, Contact as ContactIcon, DollarSign } from "lucide-react";

export default function CreateOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentUser = firebaseAuthService.getUser();
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [isContactFound, setIsContactFound] = useState(false);
  const [isCheckingContact, setIsCheckingContact] = useState(false);
  const [offerType, setOfferType] = useState("");
  const [interestType, setInterestType] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [tenureUnit, setTenureUnit] = useState("");
  const [repaymentFrequency, setRepaymentFrequency] = useState("");
  const [allowPartPayment, setAllowPartPayment] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      amount: "",
      interestRate: "",
      tenure: "",
      purpose: "",
      collateral: ""
    }
  });

  // Watch form values to calculate due date
  const amount = watch("amount");
  const tenure = watch("tenure");

  const checkContact = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setContactName("");
      setIsContactFound(false);
      return;
    }

    setIsCheckingContact(true);
    
    try {
      const data = await firebaseBackend.checkPhone(phoneNumber);
      
      if (data.exists && data.user?.name) {
        console.log('Found user:', { name: data.user.name, phone: data.user.phone });
        setContactName(data.user.name);
        setIsContactFound(true);
        toast({
          title: "Contact Found",
          description: `Found registered user: ${data.user.name}`,
        });
      } else {
        setContactName("");
        setIsContactFound(false);
        toast({
          title: "Contact Not Found",
          description: "This phone number is not registered. You can still create an offer.",
        });
      }
    } catch (error) {
      console.log('Phone check failed:', error);
      setContactName("");
      setIsContactFound(false);
      toast({
        title: "Contact Not Found",
        description: "This phone number is not registered. You can still create an offer.",
      });
    } finally {
      setIsCheckingContact(false);
    }
  };

  const createOfferMutation = useMutation({
    mutationFn: async (offerData: any) => {
      return await firebaseBackend.createOffer(offerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setLocation('/dashboard');
      toast({
        title: "Offer Created",
        description: "Your offer has been sent successfully.",
      });
    },
    onError: (error) => {
      console.error('Create offer error:', error);
      toast({
        title: "Error",
        description: "Failed to create offer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: any) => {
    // Calculate due date based on tenure and tenure unit
    const dueDate = new Date(startDate);
    if (tenureUnit === 'days') {
      dueDate.setDate(dueDate.getDate() + parseInt(data.tenure));
    } else if (tenureUnit === 'months') {
      dueDate.setMonth(dueDate.getMonth() + parseInt(data.tenure));
    } else if (tenureUnit === 'years') {
      dueDate.setFullYear(dueDate.getFullYear() + parseInt(data.tenure));
    }

    const offerData = {
      toUserPhone: contactPhone,
      toUserName: contactName,
      amount: parseFloat(data.amount),
      interestRate: parseFloat(data.interestRate),
      tenure: parseInt(data.tenure),
      tenureUnit,
      purpose: data.purpose,
      collateral: data.collateral,
      frequency: repaymentFrequency,
      offerType,
      interestType,
      repaymentType,
      allowPartPayment,
      startDate,
      dueDate: dueDate.toISOString()
    };

    createOfferMutation.mutate(offerData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/dashboard')}
              className="mr-3"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Offer</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ContactIcon className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contactPhone">Recipient Phone Number</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      checkContact(e.target.value);
                    }}
                    data-testid="input-contact-phone"
                  />
                  {isCheckingContact && (
                    <p className="text-sm text-gray-500 mt-1">Checking contact...</p>
                  )}
                  {isContactFound && contactName && (
                    <Badge variant="secondary" className="mt-2">
                      Found: {contactName}
                    </Badge>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    placeholder="Enter contact name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    data-testid="input-contact-name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Offer Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Offer Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={offerType === 'lend' ? 'default' : 'outline'}
                    onClick={() => setOfferType('lend')}
                    className="h-20 flex flex-col"
                    data-testid="button-offer-type-lend"
                  >
                    <IndianRupee className="w-6 h-6 mb-2" />
                    I Want to Lend
                  </Button>
                  <Button
                    type="button"
                    variant={offerType === 'borrow' ? 'default' : 'outline'}
                    onClick={() => setOfferType('borrow')}
                    className="h-20 flex flex-col"
                    data-testid="button-offer-type-borrow"
                  >
                    <IndianRupee className="w-6 h-6 mb-2" />
                    I Want to Borrow
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Amount and Interest */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    {...register("amount", { required: "Amount is required" })}
                    data-testid="input-amount"
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <Label>Interest Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={interestType === 'simple' ? 'default' : 'outline'}
                      onClick={() => setInterestType('simple')}
                      size="sm"
                      data-testid="button-interest-simple"
                    >
                      Simple Interest
                    </Button>
                    <Button
                      type="button"
                      variant={interestType === 'compound' ? 'default' : 'outline'}
                      onClick={() => setInterestType('compound')}
                      size="sm"
                      data-testid="button-interest-compound"
                    >
                      Compound Interest
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (% per annum)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    placeholder="Enter interest rate"
                    {...register("interestRate", { required: "Interest rate is required" })}
                    data-testid="input-interest-rate"
                  />
                  {errors.interestRate && (
                    <p className="text-sm text-red-500 mt-1">{errors.interestRate.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tenure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Repayment Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tenure">Tenure</Label>
                    <Input
                      id="tenure"
                      type="number"
                      placeholder="Enter tenure"
                      {...register("tenure", { required: "Tenure is required" })}
                      data-testid="input-tenure"
                    />
                    {errors.tenure && (
                      <p className="text-sm text-red-500 mt-1">{errors.tenure.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Tenure Unit</Label>
                    <Select value={tenureUnit} onValueChange={setTenureUnit}>
                      <SelectTrigger data-testid="select-tenure-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Repayment Frequency</Label>
                  <Select value={repaymentFrequency} onValueChange={setRepaymentFrequency}>
                    <SelectTrigger data-testid="select-repayment-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="lumpsum">Lump Sum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    placeholder="Describe the purpose of this loan"
                    {...register("purpose")}
                    data-testid="input-purpose"
                  />
                </div>

                <div>
                  <Label htmlFor="collateral">Collateral (Optional)</Label>
                  <Textarea
                    id="collateral"
                    placeholder="Describe any collateral or security"
                    {...register("collateral")}
                    data-testid="input-collateral"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowPartPayment"
                    checked={allowPartPayment}
                    onCheckedChange={setAllowPartPayment}
                    data-testid="checkbox-allow-part-payment"
                  />
                  <Label htmlFor="allowPartPayment">Allow partial payments</Label>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOfferMutation.isPending || !offerType || !tenureUnit || !repaymentFrequency}
                  data-testid="button-create-offer"
                >
                  {createOfferMutation.isPending ? 'Creating Offer...' : 'Create Offer'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
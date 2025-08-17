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
  const [phoneError, setPhoneError] = useState("");

  // Debug current user data
  console.log('Current user data:', currentUser);

  // Helper function to normalize phone numbers for comparison
  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, ''); // Remove non-digits
  };
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
    // Clear previous errors
    setPhoneError("");
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setContactName("");
      setIsContactFound(false);
      return;
    }

    // Check if user is trying to enter their own phone number
    if (currentUser?.phone) {
      const currentUserPhone = normalizePhone(currentUser.phone);
      const enteredPhone = normalizePhone(phoneNumber);
      
      console.log('Phone validation:', {
        currentUserPhone,
        enteredPhone,
        currentUserFullPhone: currentUser.phone,
        enteredFullPhone: phoneNumber,
        match: currentUserPhone === enteredPhone
      });
      
      if (currentUserPhone === enteredPhone) {
        setPhoneError("You cannot create an offer for yourself");
        setContactName("");
        setIsContactFound(false);
        return;
      }
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
    // Validate contact information
    if (phoneError) {
      toast({
        title: "Invalid Phone Number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    if (!contactPhone || !contactName) {
      toast({
        title: "Missing Contact Information",
        description: "Please provide both phone number and contact name.",
        variant: "destructive",
      });
      return;
    }

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
                    className={phoneError ? "border-red-500" : ""}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                  )}
                  {isCheckingContact && (
                    <p className="text-sm text-gray-500 mt-1">Checking contact...</p>
                  )}
                  {isContactFound && contactName && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">User Found</p>
                          <p className="text-sm text-green-600">{contactName}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="contactName">
                    Contact Name
                    {isContactFound && <span className="text-sm text-green-600 ml-2">(Auto-filled)</span>}
                  </Label>
                  <Input
                    id="contactName"
                    placeholder={isContactFound ? "Name auto-filled from registered user" : "Enter contact name"}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    data-testid="input-contact-name"
                    readOnly={isContactFound}
                    className={isContactFound ? "bg-green-50 border-green-200 cursor-not-allowed text-green-800" : ""}
                  />
                  {!isContactFound && contactPhone && (
                    <p className="text-sm text-gray-500 mt-1">
                      Phone number not registered. Please enter the recipient's name.
                    </p>
                  )}
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
                    className="h-12 flex items-center justify-center"
                    data-testid="button-offer-type-lend"
                  >
                    <IndianRupee className="w-4 h-4 mr-2" />
                    I Want to Lend
                  </Button>
                  <Button
                    type="button"
                    variant={offerType === 'borrow' ? 'default' : 'outline'}
                    onClick={() => setOfferType('borrow')}
                    className="h-12 flex items-center justify-center"
                    data-testid="button-offer-type-borrow"
                  >
                    <IndianRupee className="w-4 h-4 mr-2" />
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
                      variant={interestType === 'fixed' ? 'default' : 'outline'}
                      onClick={() => setInterestType('fixed')}
                      size="sm"
                      data-testid="button-interest-fixed"
                    >
                      Fixed
                    </Button>
                    <Button
                      type="button"
                      variant={interestType === 'reducing' ? 'default' : 'outline'}
                      onClick={() => setInterestType('reducing')}
                      size="sm"
                      data-testid="button-interest-reducing"
                    >
                      Reducing
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
                  <Label>Repayment Type</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={repaymentType === 'interest-only' ? 'default' : 'outline'}
                      onClick={() => setRepaymentType('interest-only')}
                      size="sm"
                      data-testid="button-repayment-interest-only"
                    >
                      Interest Only
                    </Button>
                    <Button
                      type="button"
                      variant={repaymentType === 'emi' ? 'default' : 'outline'}
                      onClick={() => setRepaymentType('emi')}
                      size="sm"
                      data-testid="button-repayment-emi"
                    >
                      EMI
                    </Button>
                    <Button
                      type="button"
                      variant={repaymentType === 'lumpsum' ? 'default' : 'outline'}
                      onClick={() => setRepaymentType('lumpsum')}
                      size="sm"
                      data-testid="button-repayment-lumpsum"
                    >
                      Lump Sum
                    </Button>
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
                    onCheckedChange={(checked) => setAllowPartPayment(checked === true)}
                    className="h-4 w-4"
                    data-testid="checkbox-allow-part-payment"
                  />
                  <Label htmlFor="allowPartPayment" className="text-sm">Allow partial payments</Label>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOfferMutation.isPending || !offerType || !tenureUnit || !repaymentType || !repaymentFrequency || !interestType || !!phoneError || !contactPhone || !contactName}
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
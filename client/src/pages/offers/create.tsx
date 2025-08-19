import { useState, useEffect } from "react";
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
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Percent, Clock, Info, Phone, Contact as ContactIcon, Users } from "lucide-react";

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
    // Remove all non-digits and strip country code if present
    const cleaned = phone.replace(/\D/g, '');
    // If starts with 91 (India country code), remove it
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned.substring(2);
    }
    return cleaned;
  };

  // Helper function to ensure phone number has +91 prefix for storage
  const formatPhoneForStorage = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    
    // If already has +91 or 91 prefix, just ensure it starts with +91
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    // If it's a 10-digit number, add +91
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    // Return as is if format is unclear
    return phone.startsWith('+') ? phone : '+91' + cleaned;
  };
  const [offerType, setOfferType] = useState("");
  const [interestType, setInterestType] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [tenureUnit, setTenureUnit] = useState("");
  const [repaymentFrequency, setRepaymentFrequency] = useState("");
  const [allowPartPayment, setAllowPartPayment] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
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

  // Watch form values to calculate due date and check if all required fields are filled
  const amount = watch("amount");
  const tenure = watch("tenure");
  const interestRate = watch("interestRate");
  const purpose = watch("purpose");
  const collateral = watch("collateral");

  // Check if all required fields are filled
  const allRequiredFieldsFilled = () => {
    return (
      offerType &&
      amount &&
      Number(amount) > 0 &&
      interestRate &&
      Number(interestRate) >= 0 &&
      tenure &&
      Number(tenure) > 0 &&
      tenureUnit &&
      repaymentType &&
      (repaymentType === 'lumpsum' || repaymentFrequency) &&
      interestType &&
      contactPhone &&
      contactName &&
      !phoneError
    );
  };

  // Calculate due date
  const calculateDueDate = () => {
    if (!startDate || !tenure || !tenureUnit) return null;
    
    const start = new Date(startDate);
    let dueDate = new Date(start);
    
    const tenureNum = Number(tenure);
    switch (tenureUnit) {
      case 'days':
        dueDate.setDate(start.getDate() + tenureNum);
        break;
      case 'weeks':
        dueDate.setDate(start.getDate() + (tenureNum * 7));
        break;
      case 'months':
        dueDate.setMonth(start.getMonth() + tenureNum);
        break;
      case 'years':
        dueDate.setFullYear(start.getFullYear() + tenureNum);
        break;
    }
    
    return dueDate;
  };

  // Format repayment method display
  const getRepaymentMethodDisplay = () => {
    if (repaymentType === 'lumpsum') {
      return 'Lump Sum';
    }
    if (repaymentFrequency) {
      return `${repaymentFrequency.charAt(0).toUpperCase() + repaymentFrequency.slice(1)} Payments`;
    }
    return '';
  };

  // Check if summary should be shown
  useEffect(() => {
    setShowSummary(!!allRequiredFieldsFilled());
  }, [offerType, amount, interestRate, tenure, tenureUnit, repaymentType, repaymentFrequency, interestType, contactPhone, contactName, phoneError]);

  // Store recipient user data for submission
  const [recipientUserId, setRecipientUserId] = useState<string>("");

  const checkContact = async (phoneNumber: string) => {
    // Clear previous errors
    setPhoneError("");
    setRecipientUserId("");
    
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
        console.log('Found user:', { name: data.user.name, phone: data.user.phone, id: data.user.id });
        setContactName(data.user.name);
        setRecipientUserId(data.user.id || "pending");
        setIsContactFound(true);
        toast({
          title: "Contact Found",
          description: `Found registered user: ${data.user.name}`,
        });
      } else {
        setContactName("");
        setRecipientUserId("pending");
        setIsContactFound(false);
        toast({
          title: "Contact Not Found",
          description: "This phone number is not registered. You can still create an offer.",
        });
      }
    } catch (error) {
      console.log('Phone check failed:', error);
      setContactName("");
      setRecipientUserId("pending");
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

    // Validate all required fields according to specification
    const requiredFields = {
      offerType,
      amount: data.amount,
      interestType,
      interestRate: data.interestRate,
      tenure: data.tenure,
      tenureUnit,
      repaymentType,
      startDate,
      purpose: data.purpose
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    // Also check repayment frequency if not lump sum
    if (repaymentType !== 'lumpsum' && !repaymentFrequency) {
      missingFields.push('repaymentFrequency');
    }

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Ensure current user is available
    if (!currentUser || !currentUser.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to create an offer.",
        variant: "destructive",
      });
      return;
    }

    // Format phones to ensure +91 prefix
    const formattedRecipientPhone = formatPhoneForStorage(contactPhone);
    const formattedSenderPhone = formatPhoneForStorage(currentUser.phone || '');

    // Calculate due date based on tenure and tenure unit
    const dueDate = new Date(startDate);
    if (tenureUnit === 'days') {
      dueDate.setDate(dueDate.getDate() + parseInt(data.tenure));
    } else if (tenureUnit === 'months') {
      dueDate.setMonth(dueDate.getMonth() + parseInt(data.tenure));
    } else if (tenureUnit === 'years') {
      dueDate.setFullYear(dueDate.getFullYear() + parseInt(data.tenure));
    }

    // Map the new field structure to the existing backend schema fields
    const offerData = {
      // Map sender details to existing schema
      fromUserId: currentUser.id,
      
      // Map recipient details to existing schema  
      toUserPhone: formattedRecipientPhone,
      toUserName: contactName,
      toUserId: recipientUserId || null,

      // Map offer details to existing schema
      offerType: offerType as 'lend' | 'borrow', // Keep lowercase for existing schema
      amount: parseFloat(data.amount),
      interestType: interestType as 'fixed' | 'reducing', // Keep lowercase for existing schema
      interestRate: parseFloat(data.interestRate),

      // Map tenure to existing schema
      tenureValue: parseInt(data.tenure),
      tenureUnit: tenureUnit as 'months' | 'years',

      // Map repayment details to existing schema
      repaymentType: repaymentType === 'lumpsum' ? 'full_payment' : 
                    repaymentType === 'emi' ? 'emi' : 'interest_only',
      repaymentFrequency: repaymentType === 'lumpsum' ? undefined : repaymentFrequency,
      allowPartPayment: allowPartPayment,

      // Map dates to existing schema
      startDate,
      dueDate: dueDate.toISOString(),

      // Map additional details to existing schema
      purpose: data.purpose,
      note: data.collateral || '',

      // Map status to existing schema
      status: "pending" as const,

      // Default values for required fields in existing schema
      gracePeriodDays: 0,
      prepaymentPenalty: 0,
      latePaymentPenalty: 0,
      currentInstallmentNumber: 1
    };

    console.log('Submitting offer data:', offerData);
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
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
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
                      className={`pl-10 ${phoneError ? "border-red-500" : ""}`}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                  )}
                  {isCheckingContact && (
                    <p className="text-sm text-gray-500 mt-1">Checking contact...</p>
                  )}

                </div>
                
                <div>
                  <Label htmlFor="contactName">Recipient Name</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                      <User className={`w-4 h-4 ${isContactFound ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    <Input
                      id="contactName"
                      placeholder="Enter recipient name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      data-testid="input-contact-name"
                      readOnly={isContactFound}
                      className={`pl-10 ${isContactFound ? 'bg-green-50 border-green-200 cursor-not-allowed text-gray-500' : ''}`}
                    />
                    {isContactFound && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isContactFound && contactPhone && (
                    <p className="text-sm text-gray-500 mt-1">
                      Phone number not registered. Please enter the recipient's name.
                    </p>
                  )}
                  {isContactFound && contactName && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <Users className="w-4 h-4 mr-2 text-green-600" />
                            <span className="text-sm font-medium text-gray-800">Registered User</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-600" />
                            {contactName} - 
                            <Phone className="w-4 h-4 ml-2 mr-1 text-gray-600" />
                            {contactPhone}
                          </div>
                          <div className="text-xs text-green-600">
                            This user is already registered with CredNXT
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offer Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2" />
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
                      Instalments
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
                  <Select 
                    value={repaymentType === 'lumpsum' ? 'end-of-tenure' : repaymentFrequency} 
                    onValueChange={repaymentType === 'lumpsum' ? () => {} : setRepaymentFrequency}
                    disabled={repaymentType === 'lumpsum'}
                  >
                    <SelectTrigger 
                      data-testid="select-repayment-frequency"
                      className={repaymentType === 'lumpsum' ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
                    >
                      <SelectValue 
                        placeholder={repaymentType === 'lumpsum' ? 'End of tenure' : 'Select frequency'} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  {repaymentType === 'lumpsum' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Payment will be made at the end of the tenure period
                    </p>
                  )}
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

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="allowPartPayment"
                    checked={allowPartPayment}
                    onCheckedChange={(checked) => setAllowPartPayment(checked === true)}
                    className="h-4 w-4 rounded border border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    data-testid="checkbox-allow-part-payment"
                  />
                  <Label htmlFor="allowPartPayment" className="text-sm font-medium cursor-pointer">Allow partial payments</Label>
                </div>
              </CardContent>
            </Card>

            {/* Loan Summary - shown when all required fields are filled */}
            {showSummary && (
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-green-800">
                    <IndianRupee className="w-5 h-5 mr-2" />
                    Loan Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 space-y-4">
                    {/* Principal Amount and Interest Rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Principal Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₹{Number(amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Interest Rate</p>
                        <p className="text-xl font-bold text-gray-900">
                          {interestRate}%
                        </p>
                        <p className="text-xs text-green-600 capitalize">{interestType}</p>
                      </div>
                    </div>

                    {/* Loan Duration */}
                    <div className="text-center border-t pt-3">
                      <p className="text-sm text-gray-600">Loan Duration</p>
                      <p className="text-lg font-bold text-gray-900">
                        {tenure} {tenureUnit}
                      </p>
                      {calculateDueDate() && (
                        <p className="text-sm text-green-600">
                          Due: {calculateDueDate()?.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>

                    {/* Repayment Method */}
                    <div className="text-center border-t pt-3">
                      <p className="text-sm text-gray-600">Repayment Method</p>
                      <p className="text-lg font-bold text-gray-900">
                        {getRepaymentMethodDisplay()}
                      </p>
                      {repaymentType !== 'lumpsum' && repaymentFrequency && (
                        <p className="text-xs text-green-600">
                          {repaymentFrequency} payments
                        </p>
                      )}
                    </div>

                    {/* Recipient */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-600 text-center">
                        {offerType === 'lend' ? 'Lending to' : 'Borrowing from'}
                      </p>
                      <p className="text-lg font-bold text-blue-900 text-center">
                        {contactName}
                      </p>
                      <p className="text-sm text-blue-700 text-center">
                        {contactPhone}
                      </p>
                    </div>

                    {/* Additional Details - Only show if provided */}
                    {(purpose || collateral || allowPartPayment) && (
                      <div className="border-t pt-3 space-y-2">
                        {purpose && (
                          <div>
                            <p className="text-xs text-gray-600">Purpose</p>
                            <p className="text-sm text-gray-800">{purpose}</p>
                          </div>
                        )}
                        {collateral && (
                          <div>
                            <p className="text-xs text-gray-600">Collateral</p>
                            <p className="text-sm text-gray-800">{collateral}</p>
                          </div>
                        )}
                        {allowPartPayment && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <p className="text-sm text-gray-800">Partial payments allowed</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowSummary(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={createOfferMutation.isPending || !allRequiredFieldsFilled()}
                    >
                      {createOfferMutation.isPending ? 'Creating Offer...' : 'Create Offer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button - shown when summary is not displayed */}
            {!showSummary && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createOfferMutation.isPending || !offerType || !tenureUnit || !repaymentType || (repaymentType !== 'lumpsum' && !repaymentFrequency) || !interestType || !!phoneError || !contactPhone || !contactName}
                    data-testid="button-create-offer"
                  >
                    {createOfferMutation.isPending ? 'Creating Offer...' : 'Create Offer'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </form>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
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
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { insertOfferSchema, type InsertOffer } from "@shared/schema";
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Percent, Clock, Info, Phone, Contact as ContactIcon, DollarSign } from "lucide-react";

export default function CreateOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentUser = authService.getUser();
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
      tenureValue: "",
      purpose: "",
      note: ""
    }
  });

  const tenureValue = watch('tenureValue');

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
    setContactPhone(phoneNumber);
    
    // Clear previous state
    setIsContactFound(false);
    setContactName("");
    
    // Check if user entered their own phone number (after they finish typing)
    if (currentUser?.phone && phoneNumber === currentUser.phone) {
      toast({
        title: "Invalid Phone Number",
        description: "You cannot create an offer to yourself. Please enter a different phone number.",
        variant: "destructive",
      });
      return;
    }
    
    // Only check if phone number looks complete (at least 10 digits)
    if (phoneNumber.length >= 10) {
      setIsCheckingContact(true);
      
      try {
        // Check if user is registered with this phone number
        const response = await apiRequest('GET', `/api/users/check-phone?phone=${encodeURIComponent(phoneNumber)}`);
        const data = await response.json();
        
        if (data.exists && data.user) {
          setContactName(data.user.name);
          setIsContactFound(true);
        }
      } catch (error) {
        // User not registered - allow manual name entry
        console.log('User not found or error checking:', error);
      } finally {
        setIsCheckingContact(false);
      }
    }
  };

  const createOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('API request starting with data:', data);
      const response = await apiRequest('POST', '/api/offers', data);
      const result = await response.json();
      console.log('API response received:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Mutation success with data:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setLocation('/dashboard');
      toast({
        title: "Offer Created",
        description: "Your offer has been sent successfully.",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
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
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + value);
        return monthDate;
      case 'years':
        const yearDate = new Date(now);
        yearDate.setFullYear(yearDate.getFullYear() + value);
        return yearDate;
      default:
        return now;
    }
  };

  const onSubmit = async (data: any) => {
    console.log('Form submit triggered with data:', data);
    
    // Validate required fields
    if (!contactName || !contactPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!offerType) {
      toast({
        title: "Missing Information",
        description: "Please select offer type (lend or borrow).",
        variant: "destructive",
      });
      return;
    }

    if (!interestType) {
      toast({
        title: "Missing Information", 
        description: "Please select interest type.",
        variant: "destructive",
      });
      return;
    }

    if (!repaymentType) {
      toast({
        title: "Missing Information",
        description: "Please select repayment type.",
        variant: "destructive",
      });
      return;
    }

    if (!tenureUnit) {
      toast({
        title: "Missing Information",
        description: "Please select tenure unit.",
        variant: "destructive",
      });
      return;
    }
    
    // Double-check self-phone validation
    if (currentUser?.phone && contactPhone === currentUser.phone) {
      toast({
        title: "Invalid Recipient",
        description: "You cannot create an offer to yourself.",
        variant: "destructive",
      });
      return;
    }
    
    const dueDate = calculateDueDate();
    
    const formData = {
      toUserPhone: contactPhone,
      toUserName: contactName,
      offerType: offerType as "lend" | "borrow",
      amount: (parseFloat(data.amount) || 0).toString(),
      interestRate: (parseFloat(data.interestRate) || 0).toString(),
      interestType: interestType as "fixed" | "reducing",
      tenureValue: parseInt(data.tenureValue) || 1,
      tenureUnit: tenureUnit as "days" | "weeks" | "months" | "years",
      repaymentType: repaymentType as "emi" | "interest_only" | "full_payment",
      repaymentFrequency: (repaymentFrequency as "weekly" | "monthly" | "yearly") || null,
      allowPartPayment,
      dueDate: dueDate,
      purpose: data.purpose || null,
      note: data.note || null
    };
    
    console.log('Submitting offer with data:', formData);
    createOfferMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/dashboard')}
            className="mr-4 bg-white border-gray-200 hover:bg-gray-50 shadow-sm rounded-lg h-10 px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Create New Offer</h1>
            <p className="text-gray-600 text-sm">Set up a secure lending or borrowing agreement</p>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 pb-4 pt-5 px-6">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              Offer Details
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={(e) => {
                    console.log('Form submit event triggered', e);
                    console.log('Form data before submit:', {
                      contactName,
                      contactPhone,
                      offerType,
                      formValues: watch()
                    });
                    handleSubmit(onSubmit)(e);
                  }} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-5">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
                </div>
                
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-sm">Offer Type</Label>
                    <Select value={offerType} onValueChange={setOfferType}>
                      <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                        <SelectValue placeholder="What do you want to do?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lend">💰 I want to lend money</SelectItem>
                        <SelectItem value="borrow">🏦 I want to borrow money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium text-sm">Contact Information</Label>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          type="tel"
                          value={contactPhone}
                          onChange={handlePhoneChange}
                          placeholder="Enter mobile number (e.g., +91XXXXXXXXXX)"
                          className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                        />
                        {isCheckingContact && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder={isContactFound ? "Name found from registered users" : "Enter recipient name"}
                          disabled={isContactFound}
                          className={`pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base ${isContactFound ? 'bg-green-50 border-green-200' : ''}`}
                        />
                        {isContactFound && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {contactName && contactPhone && (
                        <div className={`border rounded-lg p-3 ${isContactFound ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className={`flex items-center ${isContactFound ? 'text-green-800' : 'text-blue-800'}`}>
                            <ContactIcon className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">
                              {isContactFound ? 'Registered User' : 'Recipient Details'}
                            </span>
                          </div>
                          <div className={`text-sm mt-1 ${isContactFound ? 'text-green-700' : 'text-blue-700'}`}>
                            {contactName} - {contactPhone}
                          </div>
                          {isContactFound && (
                            <div className="text-xs text-green-600 mt-1">
                              This user is already registered with CredNXT
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-5">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <IndianRupee className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Financial Details</h3>
                </div>
                
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-700 font-medium text-sm">Amount (₹)</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...register("amount", { valueAsNumber: true })}
                        placeholder="Enter amount"
                        className="pl-10 bg-white border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        {errors.amount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate" className="text-gray-700 font-medium text-sm">Interest Rate (%)</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Percent className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.01"
                        {...register("interestRate", { valueAsNumber: true })}
                        placeholder="Enter rate"
                        className="pl-10 bg-white border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                      />
                    </div>
                    {errors.interestRate && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        {errors.interestRate.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms & Timeline Section */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-5">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Terms & Timeline</h3>
                </div>
                
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-sm">Interest Type</Label>
                    <Select value={interestType} onValueChange={setInterestType}>
                      <SelectTrigger className="bg-white border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                        <SelectValue placeholder="Choose interest calculation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">📊 Fixed Interest</SelectItem>
                        <SelectItem value="reducing">📉 Reducing Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-sm">Repayment Type</Label>
                    <Select value={repaymentType} onValueChange={setRepaymentType}>
                      <SelectTrigger className="bg-white border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                        <SelectValue placeholder="Choose repayment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emi">📅 EMI (Equal Monthly Installments)</SelectItem>
                        <SelectItem value="interest_only">💰 Interest Only</SelectItem>
                        <SelectItem value="full_payment">🎯 Full Payment at End</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenureValue" className="text-gray-700 font-medium text-sm">Tenure Duration</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="tenureValue"
                        type="number"
                        {...register("tenureValue", { valueAsNumber: true })}
                        placeholder="Enter duration"
                        className="pl-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                      />
                    </div>
                    {errors.tenureValue && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        {errors.tenureValue.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-sm">Tenure Unit</Label>
                    <Select value={tenureUnit} onValueChange={setTenureUnit}>
                      <SelectTrigger className="bg-white border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                        <SelectValue placeholder="Select time unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">📅 Days</SelectItem>
                        <SelectItem value="weeks">🗓️ Weeks</SelectItem>
                        <SelectItem value="months">📆 Months</SelectItem>
                        <SelectItem value="years">🗓️ Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Repayment Frequency - Only show for EMI and Interest Only */}
                  {(repaymentType === 'emi' || repaymentType === 'interest_only') && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium text-sm">
                        {repaymentType === 'emi' ? 'EMI Frequency' : 'Interest Payment Frequency'}
                      </Label>
                      <Select value={repaymentFrequency} onValueChange={setRepaymentFrequency}>
                        <SelectTrigger className="bg-white border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                          <SelectValue placeholder="Select payment frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">📅 Weekly</SelectItem>
                          <SelectItem value="monthly">📆 Monthly</SelectItem>
                          <SelectItem value="yearly">🗓️ Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {repaymentType === 'emi' 
                          ? 'How often should EMI payments be made?' 
                          : 'How often should interest payments be made?'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-5">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Additional Details</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-gray-700 font-medium text-sm">Purpose</Label>
                    <Input
                      id="purpose"
                      {...register("purpose")}
                      placeholder="What is this money for? (e.g., Business expansion, Emergency, etc.)"
                      className="bg-white border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-300 h-11 rounded-lg shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-gray-700 font-medium text-sm">Additional Notes</Label>
                    <Textarea
                      id="note"
                      {...register("note")}
                      placeholder="Any additional terms, conditions, or special arrangements..."
                      className="bg-white border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-300 rounded-lg shadow-sm min-h-[80px]"
                    />
                  </div>

                  {/* Part Payment Option */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="allowPartPayment"
                        checked={allowPartPayment}
                        onCheckedChange={(checked) => setAllowPartPayment(checked === true)}
                        className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                      />
                      <div>
                        <Label htmlFor="allowPartPayment" className="text-gray-900 font-medium cursor-pointer text-sm">
                          Allow partial payments
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow the borrower to make partial repayments before the due date
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Summary */}
              {((watch('amount') !== '' && watch('amount') !== undefined) || 
                (watch('interestRate') !== '' && watch('interestRate') !== undefined) || 
                (watch('tenureValue') !== '' && watch('tenureValue') !== undefined)) && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <IndianRupee className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-green-900">Loan Summary</h4>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {watch('amount') !== undefined && watch('amount') !== '' && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 font-medium">Principal Amount</p>
                          <p className="text-lg font-bold text-gray-900">₹{watch('amount') || '0'}</p>
                        </div>
                      )}
                      {watch('interestRate') !== undefined && watch('interestRate') !== '' && (
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 font-medium">Interest Rate</p>
                          <p className="text-lg font-bold text-gray-900">{watch('interestRate') || '0'}%</p>
                          {interestType && <p className="text-xs text-green-600 mt-1">{interestType === 'fixed' ? 'Fixed' : 'Reducing'}</p>}
                        </div>
                      )}
                    </div>
                    
                    {watch('tenureValue') && tenureUnit && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 font-medium">Loan Duration</p>
                        <p className="text-lg font-bold text-gray-900">{watch('tenureValue')} {tenureUnit}</p>
                        <p className="text-xs text-green-600 mt-1">
                          Due: {calculateDueDate().toLocaleDateString('en-IN', { 
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    {repaymentType && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 font-medium">Repayment Method</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {repaymentType === 'emi' ? 'EMI Payments' : 
                           repaymentType === 'interest_only' ? 'Interest Only' : 
                           'Full Payment at End'}
                        </p>
                        {repaymentFrequency && (repaymentType === 'emi' || repaymentType === 'interest_only') && (
                          <p className="text-xs text-green-600 mt-1">
                            {repaymentFrequency.charAt(0).toUpperCase() + repaymentFrequency.slice(1)} payments
                          </p>
                        )}
                      </div>
                    )}

                    {contactName && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-500 font-medium">
                          {offerType === 'lend' ? 'Lending to' : 'Borrowing from'}
                        </p>
                        <p className="text-sm font-semibold text-blue-900">{contactName}</p>
                        {contactPhone && (
                          <p className="text-xs text-blue-600 mt-1">{contactPhone}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                  className="h-10 px-6 rounded-lg border-gray-300 hover:bg-gray-50 transition-all duration-300"
                >
                  Cancel
                </Button>
                
                {/* Debug info */}
                {(!contactName || !contactPhone || !offerType) && (
                  <div className="text-xs text-red-500 mb-2 p-2 bg-red-50 rounded">
                    Form validation status: 
                    <br />• Contact name: {contactName || 'Missing'}
                    <br />• Contact phone: {contactPhone || 'Missing'}  
                    <br />• Offer type: {offerType || 'Missing'}
                    <br />• Interest type: {interestType || 'Missing'}
                    <br />• Repayment type: {repaymentType || 'Missing'}
                    <br />• Tenure unit: {tenureUnit || 'Missing'}
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  onClick={(e) => {
                    console.log('Button clicked! Event:', e);
                    console.log('Button current state:', {
                      contactName,
                      contactPhone,
                      offerType,
                      interestType,
                      repaymentType,
                      tenureUnit,
                      formData: watch()
                    });
                  }}
                >
                  {createOfferMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Create Offer</span>
                    </div>
                  )}
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

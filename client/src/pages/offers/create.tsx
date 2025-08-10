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
import { insertOfferSchema, type InsertOffer } from "@shared/schema";
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Percent, Clock, Info, Phone, Contact as ContactIcon } from "lucide-react";

export default function CreateOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [isContactFound, setIsContactFound] = useState(false);
  const [isCheckingContact, setIsCheckingContact] = useState(false);
  const [offerType, setOfferType] = useState("");
  const [interestType, setInterestType] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [tenureUnit, setTenureUnit] = useState("");
  const [allowPartPayment, setAllowPartPayment] = useState(false);



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

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
    setContactPhone(phoneNumber);
    
    // Clear previous state
    setIsContactFound(false);
    setContactName("");
    
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

  const onSubmit = async (data: Omit<InsertOffer, 'fromUserId'>) => {
    const dueDate = calculateDueDate();
    
    if (!contactName || !contactPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and phone number.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = {
      ...data,
      toUserPhone: contactPhone,
      toUserName: contactName,
      offerType: offerType as any,
      interestType: interestType as any,
      repaymentType: repaymentType as any,
      tenureUnit: tenureUnit as any,
      allowPartPayment,
      dueDate,
    };
    
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      </SelectContent>
                    </Select>
                  </div>
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

              {/* Due Date Preview */}
              {tenureValue && tenureUnit && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-blue-900">Due Date Preview</h4>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-blue-800 font-medium text-sm">
                      📅 This offer will be due on: <span className="font-bold">{calculateDueDate().toLocaleDateString('en-IN', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      Duration: {tenureValue} {tenureUnit}
                    </p>
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
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending || !contactName || !contactPhone || !offerType}
                  className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
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

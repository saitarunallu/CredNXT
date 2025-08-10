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
import { insertOfferSchema, type InsertOffer, type Contact } from "@shared/schema";
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Percent, Clock, Info, Phone, Contact as ContactIcon } from "lucide-react";

export default function CreateOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedContact, setSelectedContact] = useState("");
  const [contactInputMode, setContactInputMode] = useState<"select" | "manual">("select");
  const [manualContactName, setManualContactName] = useState("");
  const [manualContactPhone, setManualContactPhone] = useState("");
  const [offerType, setOfferType] = useState("");
  const [interestType, setInterestType] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [tenureUnit, setTenureUnit] = useState("");
  const [allowPartPayment, setAllowPartPayment] = useState(false);

  const { data: contactsData } = useQuery<{ contacts: Contact[] }>({
    queryKey: ['/api/contacts'],
  });

  const contacts: Contact[] = contactsData?.contacts || [];

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

  const onSubmit = async (data: Omit<InsertOffer, 'fromUserId'>) => {
    const dueDate = calculateDueDate();
    
    // Handle manual contact creation
    if (contactInputMode === "manual" && manualContactName && manualContactPhone) {
      try {
        // First create the contact
        const contactResponse = await apiRequest('POST', '/api/contacts', {
          name: manualContactName,
          phone: manualContactPhone
        });
        const contactData = await contactResponse.json();
        
        const formData = {
          ...data,
          toContactId: contactData.contact.id,
          offerType: offerType as any,
          interestType: interestType as any,
          repaymentType: repaymentType as any,
          tenureUnit: tenureUnit as any,
          allowPartPayment,
          dueDate,
        };
        
        createOfferMutation.mutate(formData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create contact. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      const formData = {
        ...data,
        toContactId: selectedContact,
        offerType: offerType as any,
        interestType: interestType as any,
        repaymentType: repaymentType as any,
        tenureUnit: tenureUnit as any,
        allowPartPayment,
        dueDate,
      };
      
      createOfferMutation.mutate(formData);
    }
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
                    
                    {/* Toggle buttons for contact input mode */}
                    <div className="flex space-x-2 mb-3">
                      <Button
                        type="button"
                        variant={contactInputMode === "select" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setContactInputMode("select")}
                        className="h-8 px-3 text-xs"
                      >
                        <ContactIcon className="w-3 h-3 mr-1" />
                        Select from Contacts
                      </Button>
                      <Button
                        type="button"
                        variant={contactInputMode === "manual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setContactInputMode("manual")}
                        className="h-8 px-3 text-xs"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Enter Manually
                      </Button>
                    </div>

                    {contactInputMode === "select" ? (
                      <Select value={selectedContact} onValueChange={setSelectedContact}>
                        <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm">
                          <SelectValue placeholder="Choose a contact from your list" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.length === 0 ? (
                            <SelectItem value="no-contacts" disabled>
                              <div className="text-gray-500 text-sm py-2">
                                No contacts found. Add contacts first or enter manually.
                              </div>
                            </SelectItem>
                          ) : (
                            contacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                <div className="flex items-center">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                    <User className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{contact.name}</div>
                                    <div className="text-xs text-gray-500">{contact.phone}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                          <Input
                            type="text"
                            value={manualContactName}
                            onChange={(e) => setManualContactName(e.target.value)}
                            placeholder="Enter contact name"
                            className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-4 w-4 text-gray-400" />
                          </div>
                          <Input
                            type="tel"
                            value={manualContactPhone}
                            onChange={(e) => setManualContactPhone(e.target.value)}
                            placeholder="Enter phone number (e.g., +91XXXXXXXXXX)"
                            className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-11 rounded-lg shadow-sm text-base"
                          />
                        </div>
                        {manualContactName && manualContactPhone && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center text-blue-800">
                              <Info className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">New Contact</span>
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                              {manualContactName} - {manualContactPhone}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              This contact will be added to your contact list
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                  disabled={createOfferMutation.isPending || 
                    (contactInputMode === "select" && !selectedContact) || 
                    (contactInputMode === "manual" && (!manualContactName || !manualContactPhone)) || 
                    !offerType}
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

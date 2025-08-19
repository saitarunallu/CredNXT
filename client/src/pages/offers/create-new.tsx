import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { firebaseBackend } from "@/lib/firebase-backend-service";
import { insertOfferSchema, type InsertOffer } from "@shared/firestore-schema";
import { ArrowLeft, FileText, IndianRupee, Calendar, User, Phone, ContactIcon } from "lucide-react";

export default function CreateNewOffer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = firebaseAuthService.getUser();
  
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientFound, setRecipientFound] = useState(false);

  // Get today's date for default start date
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<InsertOffer>({
    resolver: zodResolver(insertOfferSchema),
    defaultValues: {
      senderUserId: currentUser?.id || "",
      senderName: currentUser?.name || "",
      senderPhone: currentUser?.phone || "",
      recipientPhoneNumber: "",
      recipientName: "",
      recipientUserId: "pending",
      offerType: undefined,
      amount: 0,
      interestType: undefined,
      interestRate: 0,
      tenure: 0,
      tenureUnit: undefined,
      repaymentType: undefined,
      repaymentFrequency: undefined,
      startDate: today,
      purpose: "",
      collateral: "",
      allowPartialPayments: false,
      status: "pending"
    }
  });

  // Watch form values for validation
  const watchedValues = watch();

  // Normalize phone number to +91 format
  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    return cleaned.length >= 10 ? `+${cleaned}` : phone;
  };

  // Check if recipient exists and get their details
  const checkRecipient = async (phone: string) => {
    if (!phone || phone.length < 10) {
      setRecipientFound(false);
      setValue("recipientUserId", "pending");
      return;
    }

    setIsCheckingRecipient(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Validate phone format
      if (!normalizedPhone.match(/^\+91[6-9]\d{9}$/)) {
        setValue("recipientUserId", "pending");
        setRecipientFound(false);
        setIsCheckingRecipient(false);
        return;
      }

      // Check if user exists
      const userData = await firebaseBackend.checkPhone(normalizedPhone);
      
      if (userData.exists && userData.user) {
        setValue("recipientName", userData.user.name || "Unknown User");
        setValue("recipientUserId", userData.user.id);
        setValue("recipientPhoneNumber", normalizedPhone);
        setRecipientFound(true);
        toast({
          title: "Recipient Found",
          description: `Found registered user: ${userData.user.name}`,
        });
      } else {
        setValue("recipientUserId", "pending");
        setValue("recipientPhoneNumber", normalizedPhone);
        setRecipientFound(false);
      }
    } catch (error) {
      console.error('Error checking recipient:', error);
      setValue("recipientUserId", "pending");
      setRecipientFound(false);
    } finally {
      setIsCheckingRecipient(false);
    }
  };

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (offerData: InsertOffer) => {
      return await firebaseBackend.createOffer(offerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Offer Created",
        description: "Your offer has been sent successfully.",
      });
      setLocation('/dashboard');
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

  // Form submission
  const onSubmit = (data: InsertOffer) => {
    console.log('Submitting offer data:', data);
    
    // Ensure all required fields are populated
    const completeOfferData: InsertOffer = {
      ...data,
      senderUserId: currentUser?.id || "",
      senderName: currentUser?.name || "",
      senderPhone: currentUser?.phone || "",
      recipientPhoneNumber: normalizePhoneNumber(data.recipientPhoneNumber),
      status: "pending"
    };
    
    createOfferMutation.mutate(completeOfferData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/dashboard')}
            className="mr-3"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Offer</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Recipient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ContactIcon className="w-5 h-5 mr-2" />
                Recipient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipientPhoneNumber">Recipient Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="recipientPhoneNumber"
                    {...register("recipientPhoneNumber")}
                    placeholder="Enter phone number (+91XXXXXXXXXX)"
                    className="pl-10"
                    onChange={(e) => {
                      setValue("recipientPhoneNumber", e.target.value);
                      checkRecipient(e.target.value);
                    }}
                  />
                </div>
                {errors.recipientPhoneNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.recipientPhoneNumber.message}</p>
                )}
                {isCheckingRecipient && (
                  <p className="text-sm text-gray-500 mt-1">Checking recipient...</p>
                )}
              </div>

              <div>
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="recipientName"
                    {...register("recipientName")}
                    placeholder="Enter recipient name"
                    className="pl-10"
                    readOnly={recipientFound}
                  />
                </div>
                {errors.recipientName && (
                  <p className="text-sm text-red-500 mt-1">{errors.recipientName.message}</p>
                )}
                {recipientFound && (
                  <p className="text-sm text-green-600 mt-1">✓ Registered user found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Offer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <IndianRupee className="w-5 h-5 mr-2" />
                Offer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Offer Type *</Label>
                <Select onValueChange={(value: "Lend" | "Borrow") => setValue("offerType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select offer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lend">I want to Lend</SelectItem>
                    <SelectItem value="Borrow">I want to Borrow</SelectItem>
                  </SelectContent>
                </Select>
                {errors.offerType && (
                  <p className="text-sm text-red-500 mt-1">{errors.offerType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    {...register("amount", { valueAsNumber: true })}
                    placeholder="Enter amount"
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (% per annum) *</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    {...register("interestRate", { valueAsNumber: true })}
                    placeholder="Enter interest rate"
                  />
                  {errors.interestRate && (
                    <p className="text-sm text-red-500 mt-1">{errors.interestRate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Interest Type *</Label>
                <Select onValueChange={(value: "Fixed" | "Reducing") => setValue("interestType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interest type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="Reducing">Reducing</SelectItem>
                  </SelectContent>
                </Select>
                {errors.interestType && (
                  <p className="text-sm text-red-500 mt-1">{errors.interestType.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenure and Repayment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Tenure & Repayment Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenure">Tenure *</Label>
                  <Input
                    id="tenure"
                    type="number"
                    {...register("tenure", { valueAsNumber: true })}
                    placeholder="Enter tenure"
                  />
                  {errors.tenure && (
                    <p className="text-sm text-red-500 mt-1">{errors.tenure.message}</p>
                  )}
                </div>

                <div>
                  <Label>Tenure Unit *</Label>
                  <Select onValueChange={(value: "days" | "months" | "years") => setValue("tenureUnit", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tenureUnit && (
                    <p className="text-sm text-red-500 mt-1">{errors.tenureUnit.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Repayment Type *</Label>
                <Select onValueChange={(value: "Interest Only" | "Instalments" | "Lump Sum") => setValue("repaymentType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select repayment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interest Only">Interest Only</SelectItem>
                    <SelectItem value="Instalments">Instalments</SelectItem>
                    <SelectItem value="Lump Sum">Lump Sum</SelectItem>
                  </SelectContent>
                </Select>
                {errors.repaymentType && (
                  <p className="text-sm text-red-500 mt-1">{errors.repaymentType.message}</p>
                )}
              </div>

              <div>
                <Label>Repayment Frequency *</Label>
                <Select onValueChange={(value: "weekly" | "monthly" | "quarterly" | "yearly") => setValue("repaymentFrequency", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.repaymentFrequency && (
                  <p className="text-sm text-red-500 mt-1">{errors.repaymentFrequency.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                  min={today}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
                )}
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
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  {...register("purpose")}
                  placeholder="Describe the purpose of this loan"
                  rows={3}
                />
                {errors.purpose && (
                  <p className="text-sm text-red-500 mt-1">{errors.purpose.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="collateral">Collateral (Optional)</Label>
                <Textarea
                  id="collateral"
                  {...register("collateral")}
                  placeholder="Describe any collateral or security"
                  rows={2}
                />
                {errors.collateral && (
                  <p className="text-sm text-red-500 mt-1">{errors.collateral.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowPartialPayments"
                  onCheckedChange={(checked) => setValue("allowPartialPayments", checked === true)}
                />
                <Label htmlFor="allowPartialPayments">Allow partial payments</Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
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
              disabled={createOfferMutation.isPending}
              className="min-w-[120px]"
            >
              {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
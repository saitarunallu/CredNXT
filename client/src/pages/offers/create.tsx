import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertOfferSchema, type InsertOffer } from "@shared/schema";
import { ArrowLeft, FileText, AlertCircle, Calculator } from "lucide-react";

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
    control,
    formState: { errors, isValid, touchedFields },
    watch,
    setValue
  } = useForm<Omit<InsertOffer, 'fromUserId'>>({
    resolver: zodResolver(insertOfferSchema.omit({ fromUserId: true })),
    mode: "onChange",
    defaultValues: {
      amount: 0,
      interestRate: 0,
      tenureValue: 1,
      purpose: "",
      note: ""
    }
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
    <div className="min-h-screen bg-background dark:bg-background pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/offers')}
            className="mr-4 shrink-0"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Offer</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create a lending or borrowing agreement</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-foreground">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Offer Details
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Validation Summary */}
              {Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please fix the errors below to continue.
                  </AlertDescription>
                </Alert>
              )}
              {/* Offer Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Offer Type <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="offerType"
                    control={control}
                    render={() => (
                      <Select value={offerType} onValueChange={setOfferType} required>
                        <SelectTrigger className={`${!offerType && touchedFields.offerType ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select offer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lend">🏦 I want to lend money</SelectItem>
                          <SelectItem value="borrow">🤝 I want to borrow money</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {!offerType && touchedFields.offerType && (
                    <p className="text-sm text-destructive">Please select an offer type</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Contact <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedContact} onValueChange={setSelectedContact} required>
                    <SelectTrigger className={`${!selectedContact && touchedFields.toContactId ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.length === 0 ? (
                        <SelectItem value="" disabled>No contacts available</SelectItem>
                      ) : (
                        contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} ({contact.phone})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!selectedContact && touchedFields.toContactId && (
                    <p className="text-sm text-destructive">Please select a contact</p>
                  )}
                </div>
              </div>

              {/* Amount and Interest */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                    Amount (₹) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      {...register("amount", { valueAsNumber: true })}
                      placeholder="Enter amount"
                      className={`${errors.amount ? 'border-destructive' : ''}`}
                    />
                    <Calculator className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRate" className="text-sm font-medium text-foreground">
                    Interest Rate (%) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("interestRate", { valueAsNumber: true })}
                      placeholder="Enter interest rate"
                      className={`${errors.interestRate ? 'border-destructive' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  {errors.interestRate && (
                    <p className="text-sm text-destructive">{errors.interestRate.message}</p>
                  )}
                </div>
              </div>

              {/* Interest Type and Repayment Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Interest Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={interestType} onValueChange={setInterestType} required>
                    <SelectTrigger className={`${!interestType && touchedFields.interestType ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select interest type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">📊 Fixed Interest</SelectItem>
                      <SelectItem value="reducing">📉 Reducing Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  {!interestType && touchedFields.interestType && (
                    <p className="text-sm text-destructive">Please select an interest type</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Repayment Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={repaymentType} onValueChange={setRepaymentType} required>
                    <SelectTrigger className={`${!repaymentType && touchedFields.repaymentType ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select repayment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emi">📅 EMI (Equal Monthly Installments)</SelectItem>
                      <SelectItem value="interest_only">💰 Interest Only</SelectItem>
                      <SelectItem value="full_payment">🎯 Full Payment at End</SelectItem>
                    </SelectContent>
                  </Select>
                  {!repaymentType && touchedFields.repaymentType && (
                    <p className="text-sm text-destructive">Please select a repayment type</p>
                  )}
                </div>
              </div>

              {/* Tenure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tenureValue" className="text-sm font-medium text-foreground">
                    Tenure Duration <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tenureValue"
                    type="number"
                    min="1"
                    {...register("tenureValue", { valueAsNumber: true })}
                    placeholder="Enter duration"
                    className={`${errors.tenureValue ? 'border-destructive' : ''}`}
                  />
                  {errors.tenureValue && (
                    <p className="text-sm text-destructive">{errors.tenureValue.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Tenure Unit <span className="text-destructive">*</span>
                  </Label>
                  <Select value={tenureUnit} onValueChange={setTenureUnit} required>
                    <SelectTrigger className={`${!tenureUnit && touchedFields.tenureUnit ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select tenure unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">📅 Days</SelectItem>
                      <SelectItem value="weeks">📊 Weeks</SelectItem>
                      <SelectItem value="months">🗓️ Months</SelectItem>
                    </SelectContent>
                  </Select>
                  {!tenureUnit && touchedFields.tenureUnit && (
                    <p className="text-sm text-destructive">Please select a tenure unit</p>
                  )}
                </div>
              </div>

              {/* Purpose and Note */}
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-sm font-medium text-foreground">
                  Purpose
                </Label>
                <Input
                  id="purpose"
                  {...register("purpose")}
                  placeholder="What is this money for? (e.g., Business, Education, Medical)"
                  className={`${errors.purpose ? 'border-destructive' : ''}`}
                />
                {errors.purpose && (
                  <p className="text-sm text-destructive">{errors.purpose.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-medium text-foreground">
                  Additional Notes
                </Label>
                <Textarea
                  id="note"
                  {...register("note")}
                  placeholder="Any additional terms, conditions, or special arrangements..."
                  className={`min-h-[100px] ${errors.note ? 'border-destructive' : ''}`}
                />
                {errors.note && (
                  <p className="text-sm text-destructive">{errors.note.message}</p>
                )}
              </div>

              {/* Part Payment Option */}
              <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg">
                <Checkbox 
                  id="allowPartPayment"
                  checked={allowPartPayment}
                  onCheckedChange={setAllowPartPayment}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="allowPartPayment" className="text-sm font-medium text-foreground cursor-pointer">
                    Allow partial payments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable the borrower to make partial payments before the due date
                  </p>
                </div>
              </div>

              {/* Due Date Preview */}
              {tenureValue && tenureUnit && (
                <Alert className="border-primary/20 bg-primary/5">
                  <Calculator className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-primary">Due Date Preview</p>
                      <p className="text-sm text-foreground">
                        This offer will be due on: <strong>{calculateDueDate().toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</strong>
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/offers')}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending || !selectedContact || !offerType || !interestType || !repaymentType || !tenureUnit}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  {createOfferMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Offer
                    </>
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

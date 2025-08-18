import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { verifyOtpSchema, type VerifyOtpRequest } from "@shared/firestore-schema";
import { Shield, IndianRupee } from "lucide-react";

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pendingPhone, setPendingPhone] = useState("");

  useEffect(() => {
    const phone = localStorage.getItem('pending_phone');
    if (!phone) {
      toast({
        title: "Session Expired",
        description: "Please start the login process again.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }
    setPendingPhone(phone);
  }, [setLocation, toast]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<VerifyOtpRequest>({
    resolver: zodResolver(verifyOtpSchema)
  });

  useEffect(() => {
    if (pendingPhone) {
      setValue('phone', pendingPhone);
    }
  }, [pendingPhone, setValue]);

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyOtpRequest) => firebaseAuthService.verifyOTP(data.code),
    onSuccess: (result) => {
      if (result.success) {
        localStorage.removeItem('pending_phone');
        
        // Debug logging
        console.log('OTP verification result:', result);
        console.log('User data:', result.user);
        console.log('Needs profile?', result.needsProfile);
        console.log('User name:', result.user?.name);
        
        if (result.needsProfile) {
          console.log('Redirecting to complete-profile');
          setLocation('/complete-profile');
        } else {
          console.log('Redirecting to dashboard');
          setLocation('/dashboard');
        }
        toast({
          title: "Success",
          description: "Phone number verified successfully!",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid or expired OTP. Please try again.",
          variant: "destructive",
        });
        
        // If session expired, redirect back to login
        if (result.error?.includes('session expired') || result.error?.includes('start over')) {
          localStorage.removeItem('pending_phone');
          setLocation('/login');
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Invalid or expired OTP. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: VerifyOtpRequest) => {
    verifyMutation.mutate(data);
  };

  const handleResendOtp = async () => {
    if (pendingPhone) {
      // Clean the phone number before resending
      const cleanedPhone = pendingPhone.replace(/\D/g, '');
      const result = await firebaseAuthService.sendOTP(cleanedPhone);
      if (result.success) {
        toast({
          title: "OTP Sent",
          description: "A new OTP has been sent to your phone.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to resend OTP. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Phone number not found. Please go back to login.",
        variant: "destructive",
      });
      setLocation('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white border-0 shadow-2xl animate-scale-in rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-6 pt-10 px-8">
            <div className="flex items-center justify-center mb-8 space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl relative">
                <Shield className="w-8 h-8 text-white" />
                <IndianRupee className="w-4 h-4 text-white absolute" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900">CredNXT</h1>
                <p className="text-sm text-gray-500">Secure Lending</p>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Verify Your Phone</CardTitle>
            <p className="text-gray-600 text-base leading-relaxed px-4">Enter the 6-digit OTP sent to</p>
            <p className="text-blue-600 font-semibold text-lg">+91 {pendingPhone}</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <input type="hidden" {...register("phone")} />
              
              <div className="space-y-3">
                <Label htmlFor="code" className="text-gray-700 font-semibold text-sm">6-Digit OTP Code</Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 transition-all duration-300 h-16 text-center text-2xl tracking-[0.8em] font-mono rounded-xl shadow-sm"
                />
                {errors.code && (
                  <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl mt-8 h-14 text-base border-0 rounded-xl transition-all duration-300"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center space-y-4">
              <button
                onClick={handleResendOtp}
                className="text-blue-600 hover:text-blue-700 transition-colors font-medium underline underline-offset-4"
              >
                Didn't receive OTP? Resend Code
              </button>
              <p className="text-sm text-gray-500 leading-relaxed flex items-center justify-center space-x-2">
                <span>🔐</span>
                <span>Your phone number will be securely verified</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

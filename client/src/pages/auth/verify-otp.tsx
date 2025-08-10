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
import { authService } from "@/lib/auth";
import { verifyOtpSchema, type VerifyOtpRequest } from "@shared/schema";
import { Shield } from "lucide-react";

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pendingPhone, setPendingPhone] = useState("");

  useEffect(() => {
    const phone = localStorage.getItem('pending_phone');
    if (!phone) {
      setLocation('/login');
      return;
    }
    setPendingPhone(phone);
  }, [setLocation]);

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
    mutationFn: authService.verifyOtp.bind(authService),
    onSuccess: (result) => {
      if (result.success) {
        localStorage.removeItem('pending_phone');
        if (result.requiresProfile) {
          setLocation('/complete-profile');
        } else {
          setLocation('/dashboard');
        }
        toast({
          title: "Success",
          description: "Phone number verified successfully!",
        });
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
      try {
        await authService.login({ phone: pendingPhone });
        toast({
          title: "OTP Sent",
          description: "A new OTP has been sent to your phone.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to resend OTP. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="bg-glass border-0 shadow-2xl shadow-glow">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl animate-float">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Verify Your Phone</CardTitle>
            <p className="text-blue-100 text-lg">Enter the 6-digit OTP sent to {pendingPhone}</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <input type="hidden" {...register("phone")} />
              
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white font-medium">6-Digit OTP Code</Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="123456"
                  maxLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20 focus:border-white/40 transition-all h-16 text-center text-3xl tracking-[0.5em] font-mono"
                />
                {errors.code && (
                  <p className="text-sm text-red-300 mt-1">{errors.code.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mt-8"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={handleResendOtp}
                className="text-blue-200 hover:text-white transition-colors font-medium underline underline-offset-4"
              >
                Didn't receive OTP? Resend Code
              </button>
              <p className="text-sm text-blue-100 mt-4">
                🔐 Your phone number will be securely verified
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

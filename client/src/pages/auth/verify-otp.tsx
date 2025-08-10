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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-navy rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Verify Your Phone</CardTitle>
          <p className="text-gray-600">Enter the 6-digit OTP sent to {pendingPhone}</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register("phone")} />
            
            <div>
              <Label htmlFor="code">OTP Code</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="123456"
                maxLength={6}
                className="mt-1 text-center text-2xl tracking-widest"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify OTP"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResendOtp}
              className="text-sm text-navy-600 hover:text-navy-800 font-medium"
            >
              Didn't receive OTP? Resend
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

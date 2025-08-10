import { useState } from "react";
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
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Shield, IndianRupee } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema)
  });

  const loginMutation = useMutation({
    mutationFn: authService.login.bind(authService),
    onSuccess: (result) => {
      if (result.success) {
        const phone = document.querySelector<HTMLInputElement>('input[name="phone"]')?.value;
        localStorage.setItem('pending_phone', phone || '');
        setLocation('/verify-otp');
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="bg-glass border-0 shadow-2xl shadow-glow">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl animate-float relative">
                <Shield className="w-10 h-10 text-white" />
                <IndianRupee className="w-5 h-5 text-white absolute" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Welcome to CredNXT</CardTitle>
            <p className="text-blue-100 text-lg">Enter your phone number to get started with secure lending</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+91 98765 43210"
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20 focus:border-white/40 transition-all h-12 text-lg"
                />
                {errors.phone && (
                  <p className="text-sm text-red-300 mt-1">{errors.phone.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mt-8"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  "Send OTP & Get Started"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-blue-100 leading-relaxed">
                📱 New to CredNXT? Create your account after phone verification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

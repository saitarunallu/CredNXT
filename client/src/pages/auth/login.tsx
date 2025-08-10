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
    onSuccess: (result: any) => {
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
            <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Welcome Back</CardTitle>
            <p className="text-gray-600 text-base leading-relaxed px-4">Enter your phone number to get started</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-gray-700 font-semibold text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+91 98765 43210"
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 h-14 text-base rounded-xl shadow-sm"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl mt-8 h-14 text-base border-0 rounded-xl transition-all duration-300"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  "Send OTP & Get Started"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center px-4">
              <p className="text-sm text-gray-500 leading-relaxed flex items-center justify-center space-x-2">
                <span>📱</span>
                <span>New to CredNXT? Create your account after phone verification</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

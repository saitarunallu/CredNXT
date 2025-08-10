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
import { Shield } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-navy rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to CredNXT</CardTitle>
          <p className="text-gray-600">Enter your phone number to get started</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+91 98765 43210"
                className="mt-1"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Sending OTP..." : "Send OTP"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to CredNXT? You'll be able to create an account after verifying your phone number.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

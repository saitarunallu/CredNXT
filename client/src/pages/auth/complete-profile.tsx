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
import { completeProfileSchema, type CompleteProfileRequest } from "@shared/schema";
import { Shield, IndianRupee } from "lucide-react";

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileRequest>({
    resolver: zodResolver(completeProfileSchema)
  });

  const profileMutation = useMutation({
    mutationFn: authService.completeProfile.bind(authService),
    onSuccess: (result: any) => {
      if (result.success) {
        setLocation('/dashboard');
        toast({
          title: "Welcome to CredNXT!",
          description: "Your profile has been completed successfully.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CompleteProfileRequest) => {
    profileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="bg-glass-strong border-0 shadow-card-hover shadow-glow animate-scale-in">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl animate-float relative">
                <Shield className="w-10 h-10 text-white" />
                <IndianRupee className="w-5 h-5 text-white absolute" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Complete Your Profile</CardTitle>
            <p className="text-blue-100 text-lg">Tell us a bit about yourself to get started with CredNXT</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-medium">Full Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter your full name"
                  className="bg-glass-strong border-white/30 text-white placeholder:text-blue-200 focus:bg-glass-strong focus:border-white/50 transition-all duration-300 h-12 text-lg rounded-input"
                />
                {errors.name && (
                  <p className="text-sm text-red-300 mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="your@email.com"
                  className="bg-glass-strong border-white/30 text-white placeholder:text-blue-200 focus:bg-glass-strong focus:border-white/50 transition-all duration-300 h-12 text-lg rounded-input"
                />
                {errors.email && (
                  <p className="text-sm text-red-300 mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-card hover:shadow-card-hover mt-8"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Completing...</span>
                  </div>
                ) : (
                  "Complete Profile & Get Started"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-blue-100 leading-relaxed">
                🔒 Your information is secure and encrypted. We use bank-level security to protect your data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

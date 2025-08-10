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
import { Shield } from "lucide-react";

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
    onSuccess: (result) => {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-navy rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Complete Your Profile</CardTitle>
          <p className="text-gray-600">Tell us a bit about yourself to get started</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter your full name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="your@email.com"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-navy-600 hover:bg-navy-700"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Completing..." : "Complete Profile"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Your information is secure and will only be used for account verification and communication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

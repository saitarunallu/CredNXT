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
import { completeProfileSchema, type CompleteProfileRequest } from "@shared/firestore-schema";
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
    mutationFn: async (data: CompleteProfileRequest) => {
      console.log('Profile form data:', data);
      return await firebaseAuthService.completeProfile(data.name, data.email || '');
    },
    onSuccess: (result: any) => {
      if (result.success) {
        setLocation('/dashboard');
        toast({
          title: "Welcome to CredNXT!",
          description: "Your profile has been completed successfully.",
        });
      } else {
        toast({
          title: "Profile Setup Failed",
          description: result.error || "Failed to complete profile. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Profile completion error:', error);
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CompleteProfileRequest) => {
    console.log('Submitting profile form:', data);
    
    // Validate required fields
    if (!data.name || data.name.trim().length < 2) {
      toast({
        title: "Validation Error",
        description: "Please enter your full name (at least 2 characters).",
        variant: "destructive",
      });
      return;
    }
    
    profileMutation.mutate(data);
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
            <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Complete Your Profile</CardTitle>
            <p className="text-gray-600 text-base leading-relaxed px-4">Tell us a bit about yourself to get started</p>
          </CardHeader>
        
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-gray-700 font-semibold text-sm">Full Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter your full name"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 transition-all duration-300 h-14 text-base rounded-xl shadow-sm"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="your@email.com"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 transition-all duration-300 h-14 text-base rounded-xl shadow-sm"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl mt-8 h-14 text-base border-0 rounded-xl transition-all duration-300"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Completing...</span>
                  </div>
                ) : (
                  "Complete Profile & Get Started"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center px-4">
              <p className="text-sm text-gray-500 leading-relaxed flex items-center justify-center space-x-2">
                <span>🔒</span>
                <span>Your information is secure and encrypted. We use bank-level security to protect your data.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

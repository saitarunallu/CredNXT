import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { demoRequestSchema, type DemoRequest } from "@shared/firestore-schema";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactSection() {
  const { toast } = useToast();
  const [selectedInterest, setSelectedInterest] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<DemoRequest>({
    resolver: zodResolver(demoRequestSchema)
  });

  const demoMutation = useMutation({
    mutationFn: async (data: DemoRequest) => {
      const response = await apiRequest('POST', '/api/demo-request', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Demo Request Submitted",
        description: "We'll contact you soon to schedule your demo.",
      });
      reset();
      setSelectedInterest("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit demo request. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: DemoRequest) => {
    demoMutation.mutate({ ...data, interest: selectedInterest as any });
  };

  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
              Ready to Transform Lending?
            </h2>
            <p className="text-xl text-gray-600">
              Join the CredNXT revolution. Request a demo or get started today.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Request a Demo</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Your full name"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="your@email.com"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+91 98765 43210"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="organization" className="text-gray-700 font-medium">Organization</Label>
                  <Input
                    id="organization"
                    {...register("organization")}
                    placeholder="Your company name"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="interest" className="text-gray-700 font-medium">Interest</Label>
                  <Select value={selectedInterest} onValueChange={setSelectedInterest}>
                    <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0">
                      <SelectValue placeholder="Select your interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal Use">Personal Use</SelectItem>
                      <SelectItem value="Investment Opportunity">Investment Opportunity</SelectItem>
                      <SelectItem value="Partnership Inquiry">Partnership Inquiry</SelectItem>
                      <SelectItem value="Enterprise Solution">Enterprise Solution</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.interest && (
                    <p className="text-sm text-red-600 mt-1">{errors.interest.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-navy-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-navy-700 transition-colors"
                  disabled={demoMutation.isPending}
                >
                  {demoMutation.isPending ? "Submitting..." : "Request Demo"}
                </Button>
              </form>
            </div>

            <div className="bg-navy-900 text-white p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start space-x-4">
                  <Mail className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-blue-200">hello@crednxt.com</p>
                    <p className="text-blue-200">partnerships@crednxt.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Office</h4>
                    <p className="text-blue-200">Bangalore, India</p>
                    <p className="text-blue-200">Remote-first company</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Phone className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-blue-200">+91 98765 43210</p>
                    <p className="text-blue-200">24/7 Support Available</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <h4 className="font-semibold mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                    <span className="text-sm font-semibold">Li</span>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                    <span className="text-sm font-semibold">Tw</span>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                    <span className="text-sm font-semibold">Ig</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

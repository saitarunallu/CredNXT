import { Shield, IndianRupee } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-navy rounded-xl flex items-center justify-center relative shadow-lg">
            <Shield className="w-12 h-12 text-white" />
            <IndianRupee className="w-6 h-6 text-white absolute" />
          </div>
        </div>
        
        {/* Brand Name */}
        <h1 className="text-3xl font-bold text-navy-900 mb-6">CredNXT</h1>
        
        {/* Loading Animation */}
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        
        {/* Loading Message */}
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}
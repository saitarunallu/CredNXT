import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * Renders a 404 "Page Not Found" component to inform the user that the requested page does not exist.
 * @example
 * NotFound()
 * // Renders a 404 error component with user-friendly message and debug info.
 * @returns {JSX.Element} Returns a React component that displays a custom 404 error message with additional debugging information.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Debug info: {window.location.pathname} on {window.location.hostname}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

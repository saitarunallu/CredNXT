import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Renders a fallback UI when an error occurs in the application.
 * @example
 * ErrorFallback({ error: new Error('Sample error'), resetError: () => {} })
 * <div>This component will display when an error is caught in the application.</div>
 * @param {Object} props - The component props.
 * @param {Error} props.error - An error object containing the error message.
 * @param {function} props.resetError - A callback function to reset the error boundary's state.
 * @returns {JSX.Element} A React component displaying the error message and options to retry, refresh, or go home.
 */
export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = import.meta.env.DEV;

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="error-fallback">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Don't worry, your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-2">
            <Button 
              onClick={resetError} 
              className="w-full"
              data-testid="button-retry"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              className="w-full"
              data-testid="button-refresh"
            >
              Refresh Page
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleGoHome}
              className="w-full"
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            If the problem persists, please contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
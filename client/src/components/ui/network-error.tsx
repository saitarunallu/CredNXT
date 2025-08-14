import { AlertCircle, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NetworkErrorProps {
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export default function NetworkError({ 
  onRetry, 
  title = "Connection Problem",
  description = "We're having trouble connecting to our servers. Please check your internet connection and try again."
}: NetworkErrorProps) {
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center p-4" data-testid="network-error">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Wifi className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-sm">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleRetry}
            className="w-full"
            data-testid="button-retry-network"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeleton for network requests
export function NetworkLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8" data-testid="network-loading">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Empty state for when no data is returned
export function EmptyState({ 
  title = "No data available",
  description = "There's nothing to show here yet.",
  action
}: { 
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center p-8" data-testid="empty-state">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
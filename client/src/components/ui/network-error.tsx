import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface NetworkErrorProps {
  onRetry: () => void | Promise<void>;
  message?: string;
  showNetworkStatus?: boolean;
}

/**
 * Renders a network error message with an optional retry button.
 * @example
 * NetworkError({ onRetry: retryFunction, message: "Custom error message", showNetworkStatus: true })
 * React element displaying network error UI
 * @param {Object} { onRetry, message, showNetworkStatus } - Destructured props for the network error component.
 * @param {Function} onRetry - Callback function to execute on retry.
 * @param {string} [message] - Custom error message to display. Defaults to a standard message.
 * @param {boolean} [showNetworkStatus] - Flag to display current network status. Defaults to false.
 * @returns {JSX.Element} React element containing the network error interface.
 */
export function NetworkError({ 
  onRetry, 
  message = "Please check your internet connection and try again.",
  showNetworkStatus = false 
}: NetworkErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const networkStatus = useNetworkStatus();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      role="alert"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <WifiOff className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Network Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {message}
          </p>

          {showNetworkStatus && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Network Status</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connection:</span>
                <Badge variant={networkStatus.isOnline ? "default" : "destructive"}>
                  <Wifi className="mr-1 h-3 w-3" />
                  {networkStatus.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full"
            data-testid="button-retry-network"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
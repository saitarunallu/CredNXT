import { SkipToContent } from "@/components/ui/accessibility";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function MainLayout({ children, className = "" }: MainLayoutProps) {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <>
      <SkipToContent />
      
      {/* Network status indicator */}
      {!isOnline && (
        <Alert className="rounded-none border-x-0 border-t-0 border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Some features may not work properly.
          </AlertDescription>
        </Alert>
      )}
      
      {wasOffline && isOnline && (
        <Alert className="rounded-none border-x-0 border-t-0 border-green-200 bg-green-50">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            Connection restored. You're back online.
          </AlertDescription>
        </Alert>
      )}

      <main 
        id="main-content" 
        className={`min-h-screen bg-background ${className}`}
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>
    </>
  );
}
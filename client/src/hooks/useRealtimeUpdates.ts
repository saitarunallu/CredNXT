import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '@/lib/websocket';

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    // Handle offer-related updates
    const handleOfferUpdate = (data: any) => {
      // Real-time offer update received
      
      // Immediately invalidate and refetch all related data
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // If specific offer ID is provided, invalidate that offer's query
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
      
      // Force immediate refetch with no delay - track timeout for cleanup
      const timeout = setTimeout(async () => {
        try {
          const results = await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: ['/api/offers'] }),
            queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] }),
            queryClient.refetchQueries({ queryKey: ['/api/notifications'] })
          ]);
          
          // Check for any rejected promises and log them specifically
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const queryNames = ['/api/offers', '/api/dashboard/stats', '/api/notifications'];
              console.error(`Failed to refetch ${queryNames[index]}:`, result.reason);
            }
          });
        } catch (error) {
          console.error('Error refetching queries:', error);
        }
      }, 100); // 100ms delay to ensure WebSocket processing is complete
      timeouts.push(timeout);
    };

    // Handle payment updates
    const handlePaymentUpdate = (data: any) => {
      // Real-time payment update received
      
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
      
      // Force immediate refetch - track timeout for cleanup
      const timeout = setTimeout(async () => {
        try {
          const results = await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: ['/api/offers'] }),
            queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] }),
            queryClient.refetchQueries({ queryKey: ['/api/notifications'] })
          ]);
          
          // Check for any rejected promises and log them specifically
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const queryNames = ['/api/offers', '/api/dashboard/stats', '/api/notifications'];
              console.error(`Failed to refetch ${queryNames[index]}:`, result.reason);
            }
          });
        } catch (error) {
          console.error('Error refetching queries:', error);
        }
      }, 100);
      timeouts.push(timeout);
    };

    // Handle notification updates
    const handleNotificationUpdate = (data: any) => {
      // Real-time notification update received
      
      // Invalidate notifications and related data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Force immediate refetch - track timeout for cleanup
      const timeout = setTimeout(async () => {
        try {
          const results = await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: ['/api/notifications'] }),
            queryClient.refetchQueries({ queryKey: ['/api/offers'] }),
            queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] })
          ]);
          
          // Check for any rejected promises and log them specifically
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const queryNames = ['/api/notifications', '/api/offers', '/api/dashboard/stats'];
              console.error(`Failed to refetch ${queryNames[index]}:`, result.reason);
            }
          });
        } catch (error) {
          console.error('Error refetching queries:', error);
        }
      }, 100);
      timeouts.push(timeout);
    };

    // Register event listeners for all relevant events
    wsService.on('offer_accepted', handleOfferUpdate);
    wsService.on('offer_declined', handleOfferUpdate);
    wsService.on('offer_created', handleOfferUpdate);
    wsService.on('offer_received', handleOfferUpdate);
    wsService.on('payment_received', handlePaymentUpdate);
    wsService.on('notification_created', handleNotificationUpdate);

    // Cleanup listeners and timeouts on unmount
    return () => {
      // Clear all pending timeouts to prevent memory leaks and unhandled promises
      timeouts.forEach(timeout => clearTimeout(timeout));
      
      wsService.off('offer_accepted', handleOfferUpdate);
      wsService.off('offer_declined', handleOfferUpdate);
      wsService.off('offer_created', handleOfferUpdate);
      wsService.off('offer_received', handleOfferUpdate);
      wsService.off('payment_received', handlePaymentUpdate);
      wsService.off('notification_created', handleNotificationUpdate);
    };
  }, [queryClient]);
}
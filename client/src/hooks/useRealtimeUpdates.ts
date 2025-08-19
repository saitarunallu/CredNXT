import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '@/lib/websocket';

/**
 * Sets up real-time updates using WebSocket service to keep related data up to date.
 * @example
 * useRealtimeUpdates()
 * // Automatically invalidates and refetches relevant queries based on WebSocket events
 * @param {none} - This function takes no parameters.
 * @returns {void} No return value, sets up side effects for real-time updates.
 */
export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Skip if WebSocket service is not available
    if (!wsService) {
      console.log('WebSocket service not available - skipping real-time updates');
      return;
    }
    const timeouts: NodeJS.Timeout[] = [];

    // Handle offer-related updates
    /**
     * Handles real-time offer updates by invalidating and refetching related data.
     * @example
     * handleOfferUpdate({ offerId: 123 })
     * No return value
     * @param {Object} data - The data related to the real-time update.
     * @param {number} [data.offerId] - Optional ID of the specific offer to invalidate.
     * @returns {void} Does not return a value.
    **/
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
    /**
     * Handles real-time updates for payment-related queries and refetches data immediately.
     * @example
     * handleRealtimeUpdate(data)
     * undefined
     * @param {Object} data - The data object containing update information.
     * @param {string} [data.offerId] - The optional offer ID related to the update.
     * @returns {void} Does not return a value.
     */
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
    /**
     * Handles real-time notification updates by invalidating and refetching relevant queries.
     * @example
     * useRealtimeUpdates(data)
     * // Updates relevant data without returning a value
     * @param {any} data - Data received from a real-time update event.
     * @returns {void} Does not return anything.
     */
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

    // Register event listeners for all relevant events with error handling
    try {
      wsService.on('offer_accepted', handleOfferUpdate);
      wsService.on('offer_declined', handleOfferUpdate);
      wsService.on('offer_created', handleOfferUpdate);
      wsService.on('offer_received', handleOfferUpdate);
      wsService.on('payment_received', handlePaymentUpdate);
      wsService.on('notification_created', handleNotificationUpdate);
    } catch (error) {
      console.log('WebSocket registration failed:', error);
      return; // Exit early if registration fails
    }

    // Cleanup listeners and timeouts on unmount
    return () => {
      // Clear all pending timeouts to prevent memory leaks and unhandled promises
      timeouts.forEach(timeout => clearTimeout(timeout));
      
      // Safely remove event listeners
      try {
        wsService.off('offer_accepted', handleOfferUpdate);
        wsService.off('offer_declined', handleOfferUpdate);
        wsService.off('offer_created', handleOfferUpdate);
        wsService.off('offer_received', handleOfferUpdate);
        wsService.off('payment_received', handlePaymentUpdate);
        wsService.off('notification_created', handleNotificationUpdate);
      } catch (error) {
        console.log('Error cleaning up WebSocket listeners:', error);
      }
    };
  }, [queryClient]);
}
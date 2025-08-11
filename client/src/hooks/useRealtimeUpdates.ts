import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '@/lib/websocket';

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Handle offer-related updates
    const handleOfferUpdate = (data: any) => {
      console.log('Offer update received:', data);
      
      // Immediately invalidate and refetch all related data
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // If specific offer ID is provided, invalidate that offer's query
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
      
      // Force immediate refetch with no delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/offers'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.refetchQueries({ queryKey: ['/api/notifications'] });
      }, 100); // 100ms delay to ensure WebSocket processing is complete
    };

    // Handle payment updates
    const handlePaymentUpdate = (data: any) => {
      console.log('Payment update received:', data);
      
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/offers'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.refetchQueries({ queryKey: ['/api/notifications'] });
      }, 100);
    };

    // Handle notification updates
    const handleNotificationUpdate = (data: any) => {
      console.log('Notification update received:', data);
      
      // Invalidate notifications and related data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/notifications'] });
        queryClient.refetchQueries({ queryKey: ['/api/offers'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
      }, 100);
    };

    // Register event listeners for all relevant events
    wsService.on('offer_accepted', handleOfferUpdate);
    wsService.on('offer_declined', handleOfferUpdate);
    wsService.on('offer_created', handleOfferUpdate);
    wsService.on('offer_received', handleOfferUpdate);
    wsService.on('payment_received', handlePaymentUpdate);
    wsService.on('notification_created', handleNotificationUpdate);

    // Cleanup listeners on unmount
    return () => {
      wsService.off('offer_accepted', handleOfferUpdate);
      wsService.off('offer_declined', handleOfferUpdate);
      wsService.off('offer_created', handleOfferUpdate);
      wsService.off('offer_received', handleOfferUpdate);
      wsService.off('payment_received', handlePaymentUpdate);
      wsService.off('notification_created', handleNotificationUpdate);
    };
  }, [queryClient]);
}
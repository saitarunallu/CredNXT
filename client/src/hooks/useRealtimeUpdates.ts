import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '@/lib/websocket';

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Handle offer-related updates
    const handleOfferUpdate = (data: any) => {
      console.log('Offer update received:', data);
      
      // Force immediate refresh of all related data
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // If specific offer ID is provided, invalidate that offer's query
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['/api/offers'] });
      queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
    };

    // Handle payment updates
    const handlePaymentUpdate = (data: any) => {
      console.log('Payment update received:', data);
      
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      if (data.offerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/offers', data.offerId] });
      }
    };

    // Handle notification updates
    const handleNotificationUpdate = (data: any) => {
      console.log('Notification update received:', data);
      
      // Invalidate notifications
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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
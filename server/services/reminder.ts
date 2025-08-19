import { storage } from "../storage";
import { notificationService } from "./notification";

export class ReminderService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    // Run every hour
    this.intervalId = setInterval(() => {
      this.processReminders().catch(error => {
        console.error('Reminder processing error:', error);
      });
    }, 60 * 60 * 1000);

    console.log('Reminder service started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async processReminders(): Promise<void> {
    try {
      // Get offers due in 7, 3, 1 days and overdue
      const dueDays = [7, 3, 1];
      
      // Process all due days concurrently for better performance
      await Promise.all(dueDays.map(async (days) => {
        const offers = await storage.getUpcomingDueOffers(days);
        
        // Process all offers for this due day concurrently
        await Promise.all(offers.map(async ({ offer, fromUser }) => {
          if (offer.toUserId) {
            const message = `Reminder: Your payment of ₹${offer.amount} is due in ${days} day(s).`;
            
            // Create notification with required properties
            await storage.createNotification({
              userId: offer.toUserId,
              offerId: offer.id,
              type: 'payment_reminder',
              title: `Payment Due in ${days} Day(s)`,
              message,
              priority: 'medium',
              isRead: false
            });
          }
        }));
      }));

      // Handle overdue payments concurrently
      const overdueOffers = await storage.getOffersWithOverduePayments();
      
      await Promise.all(overdueOffers.map(async (offer) => {
        if (offer.toUserId) {
          const message = `URGENT: Your payment of ₹${offer.amount} is overdue. Please pay immediately to avoid additional charges.`;
          
          // Create notification with required properties
          await storage.createNotification({
            userId: offer.toUserId,
            offerId: offer.id,
            type: 'payment_overdue',
            title: 'Payment Overdue',
            message,
            priority: 'high',
            isRead: false
          });
        }
      }));

      // Clean up expired OTPs
      await storage.deleteExpiredOtps();

    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }
}

export const reminderService = new ReminderService();

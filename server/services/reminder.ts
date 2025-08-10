import { storage } from "../storage";
import { notificationService } from "./notification";

export class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    // Run every hour
    this.intervalId = setInterval(() => {
      this.processReminders();
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
      
      for (const days of dueDays) {
        const offers = await storage.getUpcomingDueOffers(days);
        
        for (const { offer, fromUser, contact } of offers) {
          if (contact?.verifiedUserId) {
            const message = `Reminder: Your payment of ₹${offer.amount} is due in ${days} day(s).`;
            
            // Create notification
            await storage.createNotification({
              userId: contact.verifiedUserId,
              offerId: offer.id,
              type: 'payment_reminder',
              title: `Payment Due in ${days} Day(s)`,
              message
            });

            // Send email/SMS
            if (contact.email) {
              await notificationService.sendEmail(
                contact.email,
                'Payment Reminder - CredNXT',
                message
              );
            }

            if (contact.phone) {
              await notificationService.sendSms(contact.phone, message);
            }
          }
        }
      }

      // Handle overdue offers (past due date)
      const overdueOffers = await storage.getUpcomingDueOffers(-1);
      
      for (const { offer, fromUser, contact } of overdueOffers) {
        // Update offer status to overdue
        await storage.updateOffer(offer.id, { status: 'overdue' });

        if (contact?.verifiedUserId) {
          const message = `OVERDUE: Your payment of ₹${offer.amount} was due on ${offer.dueDate.toLocaleDateString()}.`;
          
          await storage.createNotification({
            userId: contact.verifiedUserId,
            offerId: offer.id,
            type: 'payment_reminder',
            title: 'Payment Overdue',
            message
          });

          // Send urgent reminders
          if (contact.email) {
            await notificationService.sendEmail(
              contact.email,
              'URGENT: Payment Overdue - CredNXT',
              message
            );
          }

          if (contact.phone) {
            await notificationService.sendSms(contact.phone, `URGENT: ${message}`);
          }
        }
      }

      // Clean up expired OTPs
      await storage.deleteExpiredOtps();

    } catch (error) {
      console.error('Reminder processing failed:', error);
    }
  }
}

export const reminderService = new ReminderService();

import { storage } from '../storage';
import { notificationService } from './notification';
import { AdvancedNotificationService } from './advanced-notification';

interface OfferDeliveryResult {
  success: boolean;
  deliveryChannels: string[];
  failedChannels: string[];
  errors: string[];
}

interface DeliveryOptions {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  retryAttempts?: number;
  channels?: string[];
  metadata?: Record<string, any>;
}

export class OfferDeliveryService {
  private advancedNotification = new AdvancedNotificationService();

  /**
   * Deliver offer notifications with comprehensive error handling
   */
  async deliverOfferNotification(
    offerId: string,
    recipientUserId: string | null,
    recipientPhone: string,
    offerType: string,
    amount: string,
    fromUserName: string,
    options: DeliveryOptions = { priority: 'high' }
  ): Promise<OfferDeliveryResult> {
    const result: OfferDeliveryResult = {
      success: false,
      deliveryChannels: [],
      failedChannels: [],
      errors: []
    };

    try {
      // Step 1: Deliver to registered user if they exist
      if (recipientUserId) {
        const registeredUserResult = await this.deliverToRegisteredUser(
          recipientUserId,
          offerId,
          offerType,
          amount,
          fromUserName,
          options
        );
        
        result.deliveryChannels.push(...registeredUserResult.deliveryChannels);
        result.failedChannels.push(...registeredUserResult.failedChannels);
        result.errors.push(...registeredUserResult.errors);
      }

      // Step 2: Store for future delivery when user registers (if not already registered)
      if (!recipientUserId) {
        await this.storeForFutureDelivery(
          offerId,
          recipientPhone,
          offerType,
          amount,
          fromUserName,
          options
        );
        result.deliveryChannels.push('future_delivery');
      }

      // SMS delivery removed - only in-app notifications are used
      console.log('SMS delivery disabled - offers delivered via in-app notifications only');

      result.success = result.deliveryChannels.length > 0;
      
      // Log delivery results for monitoring
      console.log(`Offer delivery completed for offer ${offerId}:`, {
        success: result.success,
        channels: result.deliveryChannels,
        failed: result.failedChannels,
        recipientPhone: recipientPhone.substring(0, 3) + '***'
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown delivery error';
      result.errors.push(errorMessage);
      console.error(`Offer delivery failed for offer ${offerId}:`, error);
      return result;
    }
  }

  /**
   * Deliver notification to registered user through multiple channels
   */
  private async deliverToRegisteredUser(
    userId: string,
    offerId: string,
    offerType: string,
    amount: string,
    fromUserName: string,
    options: DeliveryOptions
  ): Promise<OfferDeliveryResult> {
    const result: OfferDeliveryResult = {
      success: false,
      deliveryChannels: [],
      failedChannels: [],
      errors: []
    };

    try {
      // Use advanced notification service for multi-channel delivery
      const notificationId = await this.advancedNotification.createSmartNotification({
        userId,
        offerId,
        type: 'offer_received',
        priority: options.priority,
        title: 'New Offer Received',
        message: `You have received a new ${offerType} offer for ₹${amount} from ${fromUserName}`,
        metadata: {
          offerType,
          amount,
          fromUserName,
          ...options.metadata
        }
      });

      if (notificationId) {
        result.deliveryChannels.push('app', 'notification_system');
        result.success = true;
      }

      // Create traditional notification as backup
      await storage.createNotification({
        userId,
        offerId,
        type: 'offer_received',
        title: 'New Offer Received',
        message: `You have received a new ${offerType} offer for ₹${amount} from ${fromUserName}`,
        priority: options.priority,
        isRead: false
      });

      result.deliveryChannels.push('app_notification');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Registered user delivery failed: ${errorMessage}`);
      result.failedChannels.push('app');
    }

    return result;
  }

  /**
   * Store offer notification for future delivery when user registers
   */
  private async storeForFutureDelivery(
    offerId: string,
    recipientPhone: string,
    offerType: string,
    amount: string,
    fromUserName: string,
    options: DeliveryOptions
  ): Promise<void> {
    try {
      // Store in a pending notifications collection for unregistered users
      await storage.createPendingOfferNotification({
        offerId,
        recipientPhone,
        offerType,
        amount,
        fromUserName,
        priority: options.priority,
        metadata: options.metadata || {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      console.log(`Stored offer notification for future delivery to ${recipientPhone.substring(0, 3)}***`);
    } catch (error) {
      console.error('Failed to store offer for future delivery:', error);
      throw error;
    }
  }

  /**
   * SMS delivery removed - notifications are delivered via in-app only
   * SMS is only used for OTP during login/signup
   */

  /**
   * Deliver pending notifications when user registers
   */
  async deliverPendingNotifications(userId: string, userPhone: string): Promise<void> {
    try {
      const pendingNotifications = await storage.getPendingOfferNotificationsByPhone(userPhone);
      
      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(`Delivering ${pendingNotifications.length} pending notifications to newly registered user`);

      for (const pending of pendingNotifications) {
        try {
          // Create actual notification for the user
          await storage.createNotification({
            userId,
            offerId: pending.offerId,
            type: 'offer_received',
            title: 'Offer Received (While Unregistered)',
            message: `You received a ${pending.offerType} offer for ₹${pending.amount} from ${pending.fromUserName}`,
            priority: pending.priority as any,
            isRead: false,
            metadata: pending.metadata
          });

          // Mark as delivered
          await storage.markPendingOfferNotificationAsDelivered(pending.id);
          
        } catch (error) {
          console.error(`Failed to deliver pending notification ${pending.id}:`, error);
        }
      }

      console.log(`Successfully delivered pending notifications to user ${userId}`);
      
    } catch (error) {
      console.error('Failed to deliver pending notifications:', error);
    }
  }

  /**
   * Retry failed offer deliveries
   */
  async retryFailedDeliveries(offerId: string, maxRetries: number = 3): Promise<OfferDeliveryResult> {
    const result: OfferDeliveryResult = {
      success: false,
      deliveryChannels: [],
      failedChannels: [],
      errors: []
    };

    try {
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        result.errors.push('Offer not found');
        return result;
      }

      // Get offer sender name
      const fromUser = await storage.getUser(offer.fromUserId);
      const fromUserName = fromUser?.name || 'Unknown';

      // Retry delivery with increased priority
      const retryResult = await this.deliverOfferNotification(
        offerId,
        offer.toUserId || null,
        offer.toUserPhone,
        offer.offerType,
        offer.amount.toString(),
        fromUserName,
        { priority: 'urgent', retryAttempts: maxRetries }
      );

      return retryResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      result.errors.push(errorMessage);
      return result;
    }
  }
}

export const offerDeliveryService = new OfferDeliveryService();
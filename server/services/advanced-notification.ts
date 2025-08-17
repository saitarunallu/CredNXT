import { storage } from '../storage';
import { notificationService } from './notification';
import { Notification, User } from '@shared/firestore-schema';

interface NotificationPreferences {
  type: string;
  channels: string[];
  enabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  batchingEnabled: boolean;
  maxDailyNotifications: number;
}

interface SmartNotificationData {
  userId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  offerId?: string;
  metadata?: any;
  scheduledFor?: Date;
  expiresAt?: Date;
  channels?: string[];
}

interface BatchConfiguration {
  type: string;
  title: string;
  maxNotifications: number;
  batchIntervalHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class AdvancedNotificationService {
  private batchConfigurations: Map<string, BatchConfiguration> = new Map([
    ['payment_reminder', {
      type: 'payment_reminders',
      title: 'Payment Reminders',
      maxNotifications: 5,
      batchIntervalHours: 2,
      priority: 'high'
    }],
    ['account_update', {
      type: 'daily_digest',
      title: 'Daily Account Summary',
      maxNotifications: 10,
      batchIntervalHours: 24,
      priority: 'low'
    }],
    ['security_alert', {
      type: 'security_alerts',
      title: 'Security Alerts',
      maxNotifications: 3,
      batchIntervalHours: 1,
      priority: 'urgent'
    }]
  ]);

  private deliveryCosts = new Map([
    ['sms', 0.05], // ₹0.05 per SMS
    ['email', 0.01], // ₹0.01 per email
    ['whatsapp', 0.03], // ₹0.03 per WhatsApp message
    ['push', 0.001], // ₹0.001 per push notification
    ['app', 0] // Free in-app notifications
  ]);

  /**
   * Smart notification creation with intelligent routing and batching
   */
  async createSmartNotification(data: SmartNotificationData): Promise<string> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(data.userId, data.type);
      
      // Check if user has exceeded daily notification limit
      if (await this.hasExceededDailyLimit(data.userId, preferences.maxDailyNotifications)) {
        return this.handleExceededLimit(data);
      }

      // Check quiet hours
      if (this.isQuietHours(preferences) && data.priority !== 'urgent') {
        data.scheduledFor = this.getNextAvailableTime(preferences);
      }

      // Determine if notification should be batched
      if (preferences.batchingEnabled && this.shouldBatch(data.type, data.priority)) {
        return this.addToBatch(data, preferences);
      }

      // Create immediate notification
      return this.createImmediateNotification(data, preferences);
    } catch (error) {
      throw new Error(`Smart notification creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get or create user notification preferences with intelligent defaults
   */
  private async getUserPreferences(userId: string, type: string): Promise<NotificationPreferences> {
    try {
      const existing = await storage.getUserNotificationPreferences(userId, type);
      if (existing) {
        return existing;
      }

      // Create smart defaults based on notification type
      const smartDefaults = this.getSmartDefaults(type);
      const newPreferences = {
        userId,
        ...smartDefaults
      };
      await storage.createUserNotificationPreferences(newPreferences);

      return smartDefaults;
    } catch (error) {
      // Return safe defaults if database operation fails
      return this.getSmartDefaults(type);
    }
  }

  /**
   * Generate intelligent defaults based on notification type and user behavior
   */
  private getSmartDefaults(type: string): NotificationPreferences {
    const baseDefaults = {
      enabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'Asia/Kolkata',
      batchingEnabled: true,
      maxDailyNotifications: 10
    };

    switch (type) {
      case 'payment_reminder':
        return {
          ...baseDefaults,
          channels: ['app', 'sms'],
          maxDailyNotifications: 5,
          type
        };
      case 'security_alert':
        return {
          ...baseDefaults,
          channels: ['app', 'sms', 'email'],
          batchingEnabled: false, // Security alerts should be immediate
          maxDailyNotifications: 20,
          type
        };
      case 'offer_received':
        return {
          ...baseDefaults,
          channels: ['app', 'sms'],
          maxDailyNotifications: 3,
          type
        };
      case 'payment_approved':
      case 'payment_rejected':
        return {
          ...baseDefaults,
          channels: ['app', 'sms'],
          batchingEnabled: false, // Payment status should be immediate
          type
        };
      default:
        return {
          ...baseDefaults,
          channels: ['app'],
          type
        };
    }
  }

  /**
   * Check if user has exceeded their daily notification limit
   */
  private async hasExceededDailyLimit(userId: string, limit: number): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const count = await storage.getTodayNotificationCount(userId, today);
      return count >= limit;
    } catch (error) {
      return false; // On error, allow notification to proceed
    }
  }

  /**
   * Handle notifications when daily limit is exceeded
   */
  private async handleExceededLimit(data: SmartNotificationData): Promise<string> {
    if (data.priority === 'urgent') {
      // Allow urgent notifications to bypass limits
      const preferences = await this.getUserPreferences(data.userId, data.type);
      return this.createImmediateNotification(data, preferences);
    }

    // Queue for next day or batch
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0); // Schedule for 9 AM next day

    data.scheduledFor = nextDay;
    return this.scheduleNotification(data);
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: preferences.timezone
    });

    const startTime = preferences.quietHoursStart;
    const endTime = preferences.quietHoursEnd;

    if (startTime > endTime) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Quiet hours within same day
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Get next available time outside quiet hours
   */
  private getNextAvailableTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const endTime = preferences.quietHoursEnd;
    const [hour, minute] = endTime.split(':').map(Number);

    const nextAvailable = new Date(now);
    nextAvailable.setHours(hour, minute, 0, 0);

    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return nextAvailable;
  }

  /**
   * Determine if notification should be batched based on type and priority
   */
  private shouldBatch(type: string, priority: string): boolean {
    if (priority === 'urgent') return false;
    
    const config = this.batchConfigurations.get(type);
    return config ? true : false;
  }

  /**
   * Add notification to batch for later delivery
   */
  private async addToBatch(data: SmartNotificationData, preferences: NotificationPreferences): Promise<string> {
    const config = this.batchConfigurations.get(data.type);
    if (!config) {
      return this.createImmediateNotification(data, preferences);
    }

    // Create notification with batch reference
    const notification = await storage.createNotification({
      userId: data.userId,
      offerId: data.offerId || null,
      type: data.type as any,
      priority: data.priority as any,
      title: data.title,
      message: data.message,
      scheduledFor: data.scheduledFor || new Date(),
      expiresAt: data.expiresAt,
      metadata: JSON.stringify(data.metadata || {})
    });

    // Process batch if ready
    await this.processBatchIfReady(data.userId, config);

    return notification.id;
  }

  /**
   * Process batch if it's ready for delivery
   */
  private async processBatchIfReady(userId: string, config: BatchConfiguration): Promise<void> {
    const pendingNotifications = await storage.getPendingBatchNotifications(userId, config.type);
    
    if (pendingNotifications.length >= config.maxNotifications) {
      await this.deliverBatch(userId, config, pendingNotifications);
    }
  }

  /**
   * Deliver a batch of notifications
   */
  private async deliverBatch(userId: string, config: BatchConfiguration, notifications: any[]): Promise<void> {
    // Create batch record
    const batch = await storage.createNotificationBatch({
      userId,
      batchType: config.type as any,
      title: config.title,
      summary: this.generateBatchSummary(notifications),
      notificationCount: notifications.length,
      scheduledFor: new Date(),
      metadata: JSON.stringify({ notifications: notifications.map(n => n.id) })
    });

    // Update notifications with batch ID
    for (const notification of notifications) {
      await storage.updateNotification(notification.id, { batchId: batch.id });
    }

    // Send batch notification
    await this.sendBatchNotification(userId, batch, notifications);
  }

  /**
   * Generate intelligent batch summary
   */
  private generateBatchSummary(notifications: any[]): string {
    const types = new Map();
    
    notifications.forEach(n => {
      types.set(n.type, (types.get(n.type) || 0) + 1);
    });

    const summaryParts = [];
    for (const [type, count] of Array.from(types.entries())) {
      const readableType = this.getReadableNotificationType(type);
      summaryParts.push(`${count} ${readableType}${count > 1 ? 's' : ''}`);
    }

    return `You have ${summaryParts.join(', ')} to review.`;
  }

  /**
   * Convert notification type to readable format
   */
  private getReadableNotificationType(type: string): string {
    const typeMap: Record<string, string> = {
      payment_reminder: 'payment reminder',
      offer_received: 'new offer',
      payment_approved: 'payment confirmation',
      account_update: 'account update',
      security_alert: 'security alert'
    };
    
    return typeMap[type] || type.replace('_', ' ');
  }

  /**
   * Create immediate notification with multi-channel delivery
   */
  private async createImmediateNotification(data: SmartNotificationData, preferences: NotificationPreferences): Promise<string> {
    // Create notification record
    const notification = await storage.createNotification({
      userId: data.userId,
      offerId: data.offerId || null,
      type: data.type as any,
      priority: data.priority as any,
      title: data.title,
      message: data.message,
      scheduledFor: data.scheduledFor || new Date(),
      expiresAt: data.expiresAt,
      metadata: JSON.stringify(data.metadata || {})
    });

    // Deliver across preferred channels
    await this.deliverToChannels(notification, preferences.channels);

    return notification.id;
  }

  /**
   * Deliver notification across multiple channels with cost tracking
   */
  private async deliverToChannels(notification: any, channels: string[]): Promise<void> {
    const user = await storage.getUser(notification.userId);
    if (!user) return;

    const deliveryPromises = channels.map(channel => 
      this.deliverToChannel(notification, user, channel)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver to specific channel with retry logic and cost tracking
   */
  private async deliverToChannel(notification: any, user: User, channel: string): Promise<void> {
    const delivery = await storage.createNotificationDelivery({
      notificationId: notification.id,
      channel: channel as any,
      status: 'pending',
      attempts: 0,
      cost: this.deliveryCosts.get(channel)?.toString() || '0'
    });

    try {
      let delivered = false;
      let externalId = '';

      switch (channel) {
        case 'sms':
          // SMS disabled for general notifications (OTP only)
          console.log(`SMS notification disabled for user ${user.id}: ${notification.message} (Use in-app notifications)`);
          delivered = false; // SMS disabled for general notifications
          break;
        case 'email':
          if (user.email) {
            await notificationService.sendEmail(user.email, notification.title, notification.message);
            delivered = true;
          }
          break;
        case 'app':
          // In-app notifications are always delivered immediately
          delivered = true;
          break;
        case 'whatsapp':
          // TODO: Implement WhatsApp Business API integration
          delivered = false;
          break;
        case 'push':
          // TODO: Implement push notification service
          delivered = false;
          break;
      }

      if (delivered) {
        await storage.updateNotificationDelivery(delivery.id, {
          status: 'delivered',
          deliveredAt: new Date(),
          externalId
        });
      } else {
        await storage.updateNotificationDelivery(delivery.id, {
          status: 'failed',
          failureReason: 'Channel not available or user contact missing'
        });
      }
    } catch (error) {
      await storage.updateNotificationDelivery(delivery.id, {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        attempts: delivery.attempts + 1
      });

      // Retry logic for critical notifications
      if (notification.priority === 'urgent' && delivery.attempts < 3) {
        setTimeout(() => {
          this.deliverToChannel(notification, user, channel);
        }, Math.pow(2, delivery.attempts) * 1000); // Exponential backoff
      }
    }
  }

  /**
   * Schedule notification for future delivery
   */
  private async scheduleNotification(data: SmartNotificationData): Promise<string> {
    return storage.createNotification({
      userId: data.userId,
      offerId: data.offerId || null,
      type: data.type as any,
      priority: data.priority as any,
      title: data.title,
      message: data.message,
      scheduledFor: data.scheduledFor || new Date(),
      expiresAt: data.expiresAt,
      metadata: JSON.stringify(data.metadata || {})
    }).then(n => n.id);
  }

  /**
   * Send batch notification with intelligent summary
   */
  private async sendBatchNotification(userId: string, batch: any, notifications: any[]): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    const batchMessage = this.createBatchMessage(batch, notifications);
    
    // Send batch notification via preferred channels
    const preferences = await this.getUserPreferences(userId, 'batch_summary');
    
    // Create meta-notification for the batch
    const batchNotification = await storage.createNotification({
      userId,
      type: 'batch_summary',
      priority: 'medium',
      title: batch.title,
      message: batchMessage,
      batchId: batch.id,
      metadata: JSON.stringify({
        originalNotifications: notifications.length,
        batchType: batch.batchType
      })
    });

    await this.deliverToChannels(batchNotification, preferences.channels);
  }

  /**
   * Create intelligent batch message
   */
  private createBatchMessage(batch: any, notifications: any[]): string {
    const typeGroups = new Map();
    notifications.forEach((n: any) => {
      const key = n.type;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key).push(n);
    });

    let message = `${batch.summary}\n\n`;
    
    for (const [notificationType, typeNotifications] of Array.from(typeGroups.entries())) {
      const readableType = this.getReadableNotificationType(notificationType);
      message += `📋 ${typeNotifications.length} ${readableType}${typeNotifications.length > 1 ? 's' : ''}\n`;
      
      // Show top 2 most important for preview
      typeNotifications.slice(0, 2).forEach((n: any) => {
        message += `  • ${n.title}\n`;
      });
      
      if (typeNotifications.length > 2) {
        message += `  • +${typeNotifications.length - 2} more...\n`;
      }
      message += '\n';
    }

    message += `Open the app to view all ${notifications.length} notifications.`;
    
    return message;
  }

  /**
   * Process scheduled notifications (to be called by cron job)
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const scheduledNotifications = await storage.getScheduledNotifications(now);
      
      for (const notification of scheduledNotifications) {
        const user = await storage.getUser(notification.userId);
        if (!user) continue;

        const preferences = await this.getUserPreferences(notification.userId, notification.type);
        await this.deliverToChannels(notification, preferences.channels);
      }
    } catch (error) {
      throw new Error(`Scheduled notification processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get notification analytics for optimization
   */
  async getNotificationAnalytics(userId: string, days: number = 30): Promise<any> {
    try {
      const analytics = await storage.getNotificationAnalytics(userId, days);
      
      return {
        totalSent: analytics.totalSent || 0,
        deliveryRate: analytics.deliveryRate || 0,
        readRate: analytics.readRate || 0,
        channelPerformance: analytics.channelPerformance || {},
        costAnalysis: analytics.costAnalysis || {},
        batchEfficiency: analytics.batchEfficiency || 0,
        recommendations: this.generateOptimizationRecommendations(analytics)
      };
    } catch (error) {
      return {
        totalSent: 0,
        deliveryRate: 0,
        readRate: 0,
        channelPerformance: {},
        costAnalysis: {},
        batchEfficiency: 0,
        recommendations: []
      };
    }
  }

  /**
   * Generate optimization recommendations based on analytics
   */
  private generateOptimizationRecommendations(analytics: any): string[] {
    const recommendations = [];
    
    if (analytics.readRate < 0.3) {
      recommendations.push("Consider adjusting notification timing or content to improve engagement");
    }
    
    if (analytics.deliveryRate < 0.9) {
      recommendations.push("Some notifications are failing to deliver. Check contact information");
    }
    
    if (analytics.batchEfficiency > 0.8) {
      recommendations.push("Batching is working well. Consider enabling it for more notification types");
    }
    
    return recommendations;
  }
}

export const advancedNotificationService = new AdvancedNotificationService();
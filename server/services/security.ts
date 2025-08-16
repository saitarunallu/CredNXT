import crypto from "crypto";
import { Request } from "express";

/**
 * Security Service for Banking Compliance
 * Implements security measures, fraud detection, and threat monitoring
 */

export interface SecurityAlert {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  clientIp: string;
  userId?: string;
  details: Record<string, any>;
  resolved: boolean;
}

export interface RateLimitEntry {
  ip: string;
  userId?: string;
  endpoint: string;
  count: number;
  windowStart: number;
}

export class SecurityService {
  private alerts: SecurityAlert[] = [];
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private blacklistedIPs: Set<string> = new Set();
  private suspiciousPatterns: RegExp[] = [
    /(?:union|select|insert|delete|drop|create|alter|exec|script)/i,
    /(?:<script|javascript:|vbscript:|onload=|onerror=)/i,
    /<iframe|<object|<embed/i
  ];

  /**
   * Rate limiting check
   */
  checkRateLimit(ip: string, endpoint: string, userId?: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
    const key = `${ip}:${endpoint}:${userId || 'anonymous'}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const entriesToDelete: string[] = [];
    this.rateLimitStore.forEach((entry, entryKey) => {
      if (entry.windowStart < windowStart) {
        entriesToDelete.push(entryKey);
      }
    });
    entriesToDelete.forEach(key => this.rateLimitStore.delete(key));

    const current = this.rateLimitStore.get(key);
    
    if (!current) {
      this.rateLimitStore.set(key, {
        ip,
        userId,
        endpoint,
        count: 1,
        windowStart: now
      });
      return true;
    }

    if (current.windowStart < windowStart) {
      // Reset window
      current.count = 1;
      current.windowStart = now;
      return true;
    }

    current.count++;
    
    if (current.count > limit) {
      this.createAlert({
        level: 'high',
        type: 'RATE_LIMIT_EXCEEDED',
        description: `Rate limit exceeded for ${endpoint}`,
        clientIp: ip,
        userId,
        details: { endpoint, count: current.count, limit }
      });
      return false;
    }

    return true;
  }

  /**
   * Input validation and sanitization
   */
  validateInput(input: any, fieldName: string): { isValid: boolean; sanitized: any; alerts: string[] } {
    const alerts: string[] = [];
    let sanitized = input;
    let isValid = true;

    if (typeof input === 'string') {
      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(input)) {
          alerts.push(`Suspicious pattern detected in ${fieldName}`);
          isValid = false;
        }
      }

      // Sanitize HTML entities
      sanitized = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      // Check for excessive length
      if (input.length > 10000) {
        alerts.push(`Excessive input length in ${fieldName}`);
        isValid = false;
      }
    }

    return { isValid, sanitized, alerts };
  }

  /**
   * Detect suspicious activity patterns
   */
  analyzeRequestPattern(req: Request, userId?: string): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Check for blacklisted IPs
    if (this.blacklistedIPs.has(ip)) {
      alerts.push(this.createAlert({
        level: 'critical',
        type: 'BLACKLISTED_IP',
        description: 'Request from blacklisted IP address',
        clientIp: ip,
        userId,
        details: { userAgent, path: req.path }
      }));
    }

    // Check for suspicious user agents
    const suspiciousAgents = [
      'sqlmap', 'nikto', 'burpsuite', 'zaproxy', 'nessus', 'nmap',
      'curl', 'wget', 'python-requests', 'postman'
    ];
    
    if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      alerts.push(this.createAlert({
        level: 'medium',
        type: 'SUSPICIOUS_USER_AGENT',
        description: 'Suspicious user agent detected',
        clientIp: ip,
        userId,
        details: { userAgent, path: req.path }
      }));
    }

    // Check for unusual request patterns
    if (req.path.includes('..') || req.path.includes('/etc/') || req.path.includes('/var/')) {
      alerts.push(this.createAlert({
        level: 'high',
        type: 'PATH_TRAVERSAL_ATTEMPT',
        description: 'Potential path traversal attack',
        clientIp: ip,
        userId,
        details: { path: req.path, userAgent }
      }));
    }

    return alerts;
  }

  /**
   * Validate financial transaction
   */
  validateTransaction(amount: number, fromUserId: string, toUserId?: string, clientIp?: string): { isValid: boolean; alerts: string[] } {
    const alerts: string[] = [];
    let isValid = true;

    // Amount validation
    if (amount <= 0) {
      alerts.push('Transaction amount must be positive');
      isValid = false;
    }

    if (amount > 1000000) {
      alerts.push('Transaction amount exceeds maximum limit');
      isValid = false;
    }

    // Self-transaction check
    if (fromUserId === toUserId) {
      alerts.push('Self-transactions are not allowed');
      isValid = false;
    }

    // Large transaction alert
    if (amount > 100000) {
      this.createAlert({
        level: 'medium',
        type: 'LARGE_TRANSACTION',
        description: `Large transaction amount: ₹${amount.toLocaleString()}`,
        clientIp: clientIp || 'unknown',
        userId: fromUserId,
        details: { amount, fromUserId, toUserId }
      });
    }

    return { isValid, alerts };
  }

  /**
   * Create security alert
   */
  createAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): SecurityAlert {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Log critical alerts immediately
    if (alert.level === 'critical') {
      console.error('CRITICAL_SECURITY_ALERT:', JSON.stringify(alert));
    }

    return alert;
  }

  /**
   * Get security alerts
   */
  getAlerts(level?: string, resolved?: boolean): SecurityAlert[] {
    return this.alerts.filter(alert => {
      if (level && alert.level !== level) return false;
      if (resolved !== undefined && alert.resolved !== resolved) return false;
      return true;
    });
  }

  /**
   * Resolve security alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Blacklist IP address
   */
  blacklistIP(ip: string, reason: string): void {
    this.blacklistedIPs.add(ip);
    this.createAlert({
      level: 'high',
      type: 'IP_BLACKLISTED',
      description: `IP address blacklisted: ${reason}`,
      clientIp: ip,
      details: { reason }
    });
  }

  /**
   * Generate security hash for sensitive data
   */
  generateSecurityHash(data: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(data, usedSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: usedSalt };
  }

  /**
   * Verify security hash
   */
  verifySecurityHash(data: string, hash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Security monitoring report
   */
  generateSecurityReport(fromDate?: Date, toDate?: Date): any {
    let filteredAlerts = this.alerts;

    if (fromDate || toDate) {
      filteredAlerts = filteredAlerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        if (fromDate && alertDate < fromDate) return false;
        if (toDate && alertDate > toDate) return false;
        return true;
      });
    }

    return {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: {
        from: fromDate?.toISOString() || 'inception',
        to: toDate?.toISOString() || 'current'
      },
      summary: {
        totalAlerts: filteredAlerts.length,
        critical: filteredAlerts.filter(a => a.level === 'critical').length,
        high: filteredAlerts.filter(a => a.level === 'high').length,
        medium: filteredAlerts.filter(a => a.level === 'medium').length,
        low: filteredAlerts.filter(a => a.level === 'low').length,
        resolved: filteredAlerts.filter(a => a.resolved).length,
        pending: filteredAlerts.filter(a => !a.resolved).length
      },
      alertsByType: this.groupAlertsByType(filteredAlerts),
      topIPs: this.getTopAlertIPs(filteredAlerts),
      alerts: filteredAlerts
    };
  }

  private groupAlertsByType(alerts: SecurityAlert[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const alert of alerts) {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    }
    return grouped;
  }

  private getTopAlertIPs(alerts: SecurityAlert[]): Array<{ ip: string; count: number }> {
    const ipCounts: Record<string, number> = {};
    for (const alert of alerts) {
      ipCounts[alert.clientIp] = (ipCounts[alert.clientIp] || 0) + 1;
    }

    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

export const securityService = new SecurityService();
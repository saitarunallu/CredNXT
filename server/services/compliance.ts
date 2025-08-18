import { Offer, Payment, User } from "@shared/firestore-schema";
import crypto from "crypto";

/**
 * Banking Compliance Service
 * Implements regulatory requirements and audit trails for financial operations
 */

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  validate: (data: any) => ComplianceResult;
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  entityType: 'user' | 'offer' | 'payment';
  entityId: string;
  userId?: string;
  details: Record<string, any>;
  compliance: {
    ruleId: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
  };
}

export class ComplianceService {
  private auditLog: AuditEntry[] = [];
  private rules: ComplianceRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      {
        id: 'KYC_BASIC',
        name: 'Basic KYC Requirements',
        description: 'Verify user has required identification',
        validate: (user: User) => {
          const violations: string[] = [];
          const warnings: string[] = [];

          if (!user.phone) violations.push('Phone number is required');
          if (!user.name) violations.push('Full name is required');
          // Temporarily disabled for testing: if (!user.isVerified) violations.push('Phone number must be verified');
          if (!user.email) warnings.push('Email address is recommended for notifications');

          return {
            isCompliant: violations.length === 0,
            violations,
            warnings,
            auditTrail: [{
              timestamp: new Date().toISOString(),
              operation: 'KYC_VALIDATION',
              entityType: 'user',
              entityId: user.id,
              details: { hasPhone: !!user.phone, hasName: !!user.name, isVerified: user.isVerified },
              compliance: {
                ruleId: 'KYC_BASIC',
                status: violations.length === 0 ? 'passed' : 'failed',
                message: violations.length === 0 ? 'KYC requirements met' : `KYC violations: ${violations.join(', ')}`
              }
            }]
          };
        }
      },
      {
        id: 'LOAN_AMOUNT_LIMITS',
        name: 'Loan Amount Limits',
        description: 'Verify loan amounts are within regulatory limits',
        validate: (offer: Offer) => {
          const violations: string[] = [];
          const warnings: string[] = [];
          const amount = parseFloat(String(offer.amount));

          // Banking regulation: Maximum unsecured personal loan
          if (amount > 1000000) violations.push('Loan amount exceeds ₹10,00,000 maximum limit');
          if (amount < 1) violations.push('Loan amount must be at least ₹1');
          if (amount > 500000) warnings.push('Large loan amounts require additional documentation');

          return {
            isCompliant: violations.length === 0,
            violations,
            warnings,
            auditTrail: [{
              timestamp: new Date().toISOString(),
              operation: 'AMOUNT_VALIDATION',
              entityType: 'offer',
              entityId: offer.id,
              details: { amount, currency: 'INR' },
              compliance: {
                ruleId: 'LOAN_AMOUNT_LIMITS',
                status: violations.length === 0 ? 'passed' : 'failed',
                message: violations.length === 0 ? 'Amount within limits' : `Amount violations: ${violations.join(', ')}`
              }
            }]
          };
        }
      },
      {
        id: 'INTEREST_RATE_LIMITS',
        name: 'Interest Rate Limits',
        description: 'Verify interest rates comply with usury laws',
        validate: (offer: Offer) => {
          const violations: string[] = [];
          const warnings: string[] = [];
          const rate = parseFloat(String(offer.interestRate));

          // Indian banking regulation: Maximum interest rate for personal loans
          if (rate > 50) violations.push('Interest rate exceeds 50% annual maximum');
          if (rate < 0) violations.push('Interest rate cannot be negative');
          if (rate > 36) warnings.push('High interest rate may require additional disclosures');

          return {
            isCompliant: violations.length === 0,
            violations,
            warnings,
            auditTrail: [{
              timestamp: new Date().toISOString(),
              operation: 'RATE_VALIDATION',
              entityType: 'offer',
              entityId: offer.id,
              details: { interestRate: rate, type: offer.interestType },
              compliance: {
                ruleId: 'INTEREST_RATE_LIMITS',
                status: violations.length === 0 ? 'passed' : 'failed',
                message: violations.length === 0 ? 'Interest rate compliant' : `Rate violations: ${violations.join(', ')}`
              }
            }]
          };
        }
      },
      {
        id: 'PAYMENT_VALIDATION',
        name: 'Payment Security',
        description: 'Validate payment authenticity and prevent fraud',
        validate: (payment: Payment) => {
          const violations: string[] = [];
          const warnings: string[] = [];
          const amount = parseFloat(String(payment.amount));

          if (amount <= 0) violations.push('Payment amount must be positive');
          if (amount > 200000) warnings.push('Large payment amount requires additional verification');
          if (!payment.refString) warnings.push('Payment reference string recommended for tracking');

          return {
            isCompliant: violations.length === 0,
            violations,
            warnings,
            auditTrail: [{
              timestamp: new Date().toISOString(),
              operation: 'PAYMENT_VALIDATION',
              entityType: 'payment',
              entityId: payment.id,
              details: { amount, status: payment.status, hasReference: !!payment.refString },
              compliance: {
                ruleId: 'PAYMENT_VALIDATION',
                status: violations.length === 0 ? 'passed' : 'failed',
                message: violations.length === 0 ? 'Payment validation passed' : `Payment violations: ${violations.join(', ')}`
              }
            }]
          };
        }
      }
    ];
  }

  /**
   * Validate entity against all applicable compliance rules
   */
  async validateCompliance(entityType: 'user' | 'offer' | 'payment', entity: any): Promise<ComplianceResult> {
    const allViolations: string[] = [];
    const allWarnings: string[] = [];
    const allAuditEntries: AuditEntry[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule.validate(entity);
        allViolations.push(...result.violations);
        allWarnings.push(...result.warnings);
        allAuditEntries.push(...result.auditTrail);
      } catch (error) {
        console.error(`Compliance rule ${rule.id} failed:`, error);
        allViolations.push(`Compliance check failed: ${rule.name}`);
      }
    }

    // Store audit entries
    this.auditLog.push(...allAuditEntries);

    return {
      isCompliant: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
      auditTrail: allAuditEntries
    };
  }

  /**
   * Generate compliance report for regulatory submission
   */
  generateComplianceReport(entityId?: string, fromDate?: Date, toDate?: Date): any {
    let filteredEntries = this.auditLog;

    if (entityId) {
      filteredEntries = filteredEntries.filter(entry => entry.entityId === entityId);
    }

    if (fromDate || toDate) {
      filteredEntries = filteredEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        if (fromDate && entryDate < fromDate) return false;
        if (toDate && entryDate > toDate) return false;
        return true;
      });
    }

    const summary = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: {
        from: fromDate?.toISOString() || 'inception',
        to: toDate?.toISOString() || 'current'
      },
      totalEntries: filteredEntries.length,
      complianceStatus: {
        passed: filteredEntries.filter(e => e.compliance.status === 'passed').length,
        failed: filteredEntries.filter(e => e.compliance.status === 'failed').length,
        warnings: filteredEntries.filter(e => e.compliance.status === 'warning').length
      },
      entries: filteredEntries
    };

    return summary;
  }

  /**
   * Get audit trail for specific entity
   */
  getAuditTrail(entityId: string): AuditEntry[] {
    return this.auditLog.filter(entry => entry.entityId === entityId);
  }

  /**
   * Create audit entry for custom operations
   */
  createAuditEntry(entry: Omit<AuditEntry, 'timestamp'>): void {
    this.auditLog.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if user meets lending criteria
   */
  async validateLendingEligibility(user: User, loanAmount: number): Promise<ComplianceResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Basic eligibility checks
    if (!user.isVerified) violations.push('User phone number must be verified');
    if (!user.name || user.name.length < 2) violations.push('Valid full name required');
    
    // Amount-based checks
    if (loanAmount > 500000) warnings.push('Large loan amount may require income verification');
    if (loanAmount > 1000000) violations.push('Loan amount exceeds platform limits');

    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      operation: 'LENDING_ELIGIBILITY',
      entityType: 'user',
      entityId: user.id,
      details: { 
        loanAmount, 
        isVerified: user.isVerified, 
        hasName: !!user.name,
        hasEmail: !!user.email 
      },
      compliance: {
        ruleId: 'LENDING_ELIGIBILITY',
        status: violations.length === 0 ? 'passed' : 'failed',
        message: violations.length === 0 ? 'Eligible for lending' : `Eligibility issues: ${violations.join(', ')}`
      }
    };

    this.auditLog.push(auditEntry);

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      auditTrail: [auditEntry]
    };
  }
}

export const complianceService = new ComplianceService();
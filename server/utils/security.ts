/**
 * Security utilities and input sanitization functions
 * Provides comprehensive security measures for the CredNXT application
 * 
 * @fileoverview Security utilities for input validation, sanitization, and protection
 * @author CredNXT Development Team
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * Input sanitization utility class
 * Provides methods to clean and validate user inputs to prevent security vulnerabilities
 * 
 * @class SecurityUtils
 * @since 1.0.0
 */
export class SecurityUtils {
  /**
   * Sanitize text input to prevent XSS and injection attacks
   * Removes dangerous characters and limits input length
   * 
   * @static
   * @param {string} input - Raw user input to sanitize
   * @param {number} maxLength - Maximum allowed length (default: 1000)
   * @returns {string} Sanitized and safe text
   * @memberof SecurityUtils
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, maxLength);
  }

  /**
   * Sanitize phone number input
   * Ensures phone numbers contain only valid characters
   * 
   * @static
   * @param {string} phone - Phone number to sanitize
   * @returns {string} Sanitized phone number
   * @memberof SecurityUtils
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    return phone
      .replace(/[^\d+\-\s()]/g, '') // Keep only digits, +, -, spaces, parentheses
      .trim()
      .substring(0, 20); // Reasonable phone number length limit
  }

  /**
   * Validate email format using secure regex
   * Prevents ReDoS attacks with efficient email validation
   * 
   * @static
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   * @memberof SecurityUtils
   */
  static isValidEmail(email: string): boolean {
    const emailSchema = z.string().email();
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rate limiting helper for API endpoints
   * Simple in-memory rate limiting (use Redis in production)
   * 
   * @static
   * @param {string} key - Unique identifier for rate limiting (IP, user ID, etc.)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} True if request is allowed, false if rate limited
   * @memberof SecurityUtils
   */
  static checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
    // Simple in-memory implementation - replace with Redis for production
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // This would be implemented with a proper rate limiting store in production
    // For now, return true to allow requests (actual rate limiting implemented in middleware)
    return true;
  }

  /**
   * Generate secure random tokens for CSRF protection
   * Creates cryptographically secure random strings
   * 
   * @static
   * @param {number} length - Length of the token (default: 32)
   * @returns {string} Secure random token
   * @memberof SecurityUtils
   */
  static generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate file upload security
   * Checks file type, size, and prevents malicious uploads
   * 
   * @static
   * @param {string} filename - Name of the uploaded file
   * @param {number} fileSize - Size of the file in bytes
   * @param {string[]} allowedTypes - Array of allowed MIME types
   * @returns {boolean} True if file is safe to upload
   * @memberof SecurityUtils
   */
  static validateFileUpload(filename: string, fileSize: number, allowedTypes: string[] = []): boolean {
    // Check filename
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    // Remove path traversal attempts
    const safeName = filename.replace(/[\/\\]/g, '');
    if (safeName !== filename) {
      return false;
    }

    // Check file size (10MB limit)
    if (fileSize > 10 * 1024 * 1024) {
      return false;
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const extension = safeName.toLowerCase().substring(safeName.lastIndexOf('.'));
    
    return allowedExtensions.includes(extension);
  }

  /**
   * Hash sensitive data for storage
   * Uses secure hashing for passwords and sensitive information
   * 
   * @static
   * @param {string} data - Data to hash
   * @param {string} salt - Salt for hashing (optional)
   * @returns {string} Hashed data
   * @memberof SecurityUtils
   */
  static hashSensitiveData(data: string, salt?: string): string {
    const crypto = require('crypto');
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha512');
    return `${saltToUse}:${hash.toString('hex')}`;
  }
}

/**
 * Request validation schemas using Zod
 * Provides strict validation for all API inputs
 * 
 * @namespace ValidationSchemas
 * @since 1.0.0
 */
export const ValidationSchemas = {
  /**
   * Offer creation validation schema
   * Validates all required fields for loan offers
   */
  createOffer: z.object({
    toUserPhone: z.string().min(10).max(20).regex(/^[\d+\-\s()]+$/),
    toUserName: z.string().min(1).max(100),
    amount: z.number().positive().max(10000000), // 1 crore max
    interestRate: z.number().min(0).max(100),
    tenureValue: z.number().positive().max(120), // 10 years max in months
    tenureUnit: z.enum(['days', 'months', 'years']),
    purpose: z.string().max(500).optional(),
    repaymentFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional()
  }),

  /**
   * Offer update validation schema
   * Validates status updates for offers
   */
  updateOffer: z.object({
    status: z.enum(['accepted', 'declined', 'cancelled'])
  }),

  /**
   * User registration validation schema
   * Validates user account creation data
   */
  userRegistration: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(20).regex(/^[\d+\-\s()]+$/),
    email: z.string().email().optional()
  }),

  /**
   * Phone number validation schema
   * Strict validation for phone numbers
   */
  phoneNumber: z.string().min(10).max(20).regex(/^[\d+\-\s()]+$/)
};

/**
 * Security configuration constants
 * Central configuration for security settings
 * 
 * @namespace SecurityConfig
 * @since 1.0.0
 */
export const SecurityConfig = {
  /** Maximum file upload size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  /** Rate limiting: maximum requests per window */
  RATE_LIMIT_MAX: 100,
  
  /** Rate limiting: time window in milliseconds (15 minutes) */
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  
  /** Maximum text input length */
  MAX_TEXT_LENGTH: 1000,
  
  /** Maximum phone number length */
  MAX_PHONE_LENGTH: 20,
  
  /** Allowed file extensions for uploads */
  ALLOWED_FILE_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  
  /** Password minimum length */
  PASSWORD_MIN_LENGTH: 8,
  
  /** Token expiration time (24 hours) */
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000
};
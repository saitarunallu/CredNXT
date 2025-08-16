/**
 * Phone number utilities for consistent handling across the application
 * All phone numbers are stored and processed with +91 prefix
 */

/**
 * Normalize phone number to standard format (+91xxxxxxxxxx)
 * @param phone - Input phone number in any format
 * @returns Standardized phone number with +91 prefix
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Invalid phone number provided');
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats
  if (digits.length === 10) {
    // Indian number without country code: 9876543210 -> +919876543210
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Indian number with 91: 919876543210 -> +919876543210
    return `+${digits}`;
  } else if (digits.length === 13 && digits.startsWith('091')) {
    // Indian number with 091: 0919876543210 -> +919876543210
    return `+${digits.substring(1)}`;
  } else if (phone.startsWith('+91') && digits.length === 12) {
    // Already properly formatted: +919876543210
    return phone;
  }
  
  throw new Error(`Invalid Indian phone number format: ${phone}`);
}

/**
 * Format phone number for display (removes +91 prefix for cleaner UI)
 * @param phone - Standardized phone number (+91xxxxxxxxxx)
 * @returns Display format (xxxxxxxxxx)
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  return normalized.replace('+91', '');
}

/**
 * Validate if phone number is a valid Indian mobile number
 * @param phone - Phone number to validate
 * @returns Boolean indicating validity
 */
export function isValidIndianMobile(phone: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phone);
    const digits = normalized.replace('+91', '');
    
    // Indian mobile numbers start with 6, 7, 8, or 9 and are 10 digits long
    return /^[6-9]\d{9}$/.test(digits);
  } catch {
    return false;
  }
}

/**
 * Extract country code and number
 * @param phone - Standardized phone number
 * @returns Object with country code and number
 */
export function parsePhoneNumber(phone: string): { countryCode: string; number: string } {
  const normalized = normalizePhoneNumber(phone);
  return {
    countryCode: '+91',
    number: normalized.replace('+91', '')
  };
}
import crypto from 'crypto';

// Firebase Auth handles all token generation and verification
// This service now only provides utility functions
export class AuthService {
  generateOtp(): string {
    // Use cryptographically secure random number generation for OTP
    const buffer = crypto.randomBytes(3);
    const otp = buffer.readUIntBE(0, 3) % 900000 + 100000;
    return otp.toString();
  }

  hashPassword(password: string, salt?: string): { hash: string, salt: string } {
    const passwordSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, passwordSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: passwordSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashVerify, 'hex'));
  }
}

export const authService = new AuthService();

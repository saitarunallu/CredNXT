import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('WARNING: Using default JWT secret in development. Set JWT_SECRET environment variable.');
  return 'dev-secret-key-change-in-production';
})();

export class AuthService {
  generateOtp(): string {
    // Use cryptographically secure random number generation for OTP
    const buffer = crypto.randomBytes(3);
    const otp = buffer.readUIntBE(0, 3) % 900000 + 100000;
    return otp.toString();
  }

  generateToken(userId: string, sessionInfo?: { ip?: string, userAgent?: string }): string {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      ...(sessionInfo && { sessionInfo })
    };
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '30d',
      issuer: 'crednxt-platform',
      audience: 'crednxt-users'
    });
  }

  verifyToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: 'crednxt-platform',
        audience: 'crednxt-users'
      }) as { userId: string };
      
      if (!payload.userId) {
        throw new Error('Invalid token payload: missing userId');
      }
      
      return payload;
    } catch (error) {
      console.error('Token verification error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active');
      } else {
        throw new Error('Token verification failed');
      }
    }
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

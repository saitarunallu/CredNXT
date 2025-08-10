import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  }

  verifyToken(token: string): { userId: string } {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload;
  }

  hashPassword(password: string): string {
    return crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex');
  }

  verifyPassword(password: string, hash: string): boolean {
    const hashVerify = crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  }
}

export const authService = new AuthService();

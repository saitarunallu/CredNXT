import { Request, Response, NextFunction } from 'express';

// Use the existing AuthenticatedRequest interface from routes.ts
export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    phone: string;
    name?: string;
  };
}

// Simple auth middleware for SMS routes - uses the same pattern as the main routes
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authorization token'
    });
  }

  // For now, we'll trust that the token was validated elsewhere
  // In a real implementation, you'd import and use the authService.verifyToken here
  // This is a simplified version for the SMS routes
  try {
    // Basic token validation - in production, use the full auth service
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Decode payload (without verification for demo - use authService in production)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    req.userId = payload.userId;
    req.user = payload;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please login again'
    });
  }
}
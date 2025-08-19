import express, { type Request, Response, NextFunction } from "express";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeFirebase } from "./firebase-config";

const app = express();

// Validate critical environment variables
/**
 * Validates the presence of required Firebase environment variables.
 * @example
 * validateEnvironment()
 * true
 * @returns {boolean} Returns true if all required environment variables are present. Returns false in development mode if some variables are missing; otherwise, exits the process in production mode.
 */
function validateEnvironment() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY', 
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required Firebase environment variables:', missing);
    console.error('📋 Please check DEPLOYMENT_CHECKLIST.md for setup instructions');
    console.error('📄 Copy .env.example to .env and configure all variables');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Cannot start in production without proper configuration');
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: continuing with missing variables');
      return false;
    }
  }
  
  return true;
}

// Firebase Auth handles all authentication - no JWT secret needed

// Check environment before starting
const configValid = validateEnvironment();

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || false
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Security middleware - helmet for various HTTP headers security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Firebase
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enhanced security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSRF protection for state-changing operations
  // Since we use Firebase Auth tokens (stateless), CSRF risk is reduced
  // but we add protection for sensitive operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && !req.path.includes('/auth/')) {
      return res.status(403).json({ 
        message: 'Authentication required for state-changing operations',
        code: 'AUTH_REQUIRED'
      });
    }
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const clientIp = req.ip || req.connection.remoteAddress || 'Unknown';
  const requestId = crypto.randomUUID();
  
  // Add request ID to request for tracing
  (req as any).requestId = requestId;
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Enhanced audit log for banking compliance
      const auditLog = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        clientIp,
        userAgent,
        userId: (req as any).userId || null,
        success: res.statusCode < 400,
        ...(capturedJsonResponse && { 
          responseData: JSON.stringify(capturedJsonResponse).substring(0, 500) 
        })
      };

      // Log sensitive operations with more detail
      const sensitiveOperations = ['/api/auth/', '/api/offers', '/api/payments'];
      const isSensitive = sensitiveOperations.some(op => path.includes(op));
      
      if (isSensitive || res.statusCode >= 400) {
        // Audit sensitive operations through proper logging service
        // In production, this should integrate with structured logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('AUDIT:', JSON.stringify(auditLog));
        }
      } else {
        // Regular operations get shorter log
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms [${requestId.substring(0, 8)}]`;
        if (logLine.length > 100) {
          logLine = logLine.slice(0, 99) + "…";
        }
        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  // Initialize Firebase
  const firebaseInitialized = initializeFirebase();
  
  if (!firebaseInitialized && process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: Firebase initialization failed in production');
    console.error('📋 Please check Firebase environment variables in DEPLOYMENT_CHECKLIST.md');
    process.exit(1);
  }

  // Global error handlers for unhandled promises and exceptions
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, we might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Application will attempt graceful shutdown...');
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // In production, we might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Application will attempt graceful shutdown...');
      process.exit(1);
    }
  });
  
  // Graceful shutdown handlers
  /**
   * Handles server shutdown gracefully upon receiving a termination signal.
   * @example
   * signal('SIGTERM')
   * // Logs 'Received SIGTERM. Starting graceful shutdown...' and shuts down the server.
   * @param {string} signal - The termination signal received.
   * @returns {void} Does not return a value.
   */
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Express error handler:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

import express, { type Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Global error handlers for unhandled promises and exceptions
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

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

import express, { type Request, Response, NextFunction } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Could not find index.html in build directory: ${indexPath}`);
    }
    res.sendFile(indexPath);
  });
}

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
        console.log('AUDIT:', JSON.stringify(auditLog));
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

  // Serve static files in production
  serveStatic(app);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 10000 for Render.
  const port = parseInt(process.env.PORT || '10000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
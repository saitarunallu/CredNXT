import { type Express } from "express";
import { db } from "../db";

export function registerHealthRoutes(app: Express) {
  // Basic health check
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown"
    });
  });

  // Detailed health check with database
  app.get("/api/health/detailed", async (req, res) => {
    try {
      // Check database connection
      const start = Date.now();
      await db.execute("SELECT 1 as health_check");
      const dbLatency = Date.now() - start;

      // Check memory usage
      const memoryUsage = process.memoryUsage();

      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "unknown",
        database: {
          status: "connected",
          latency: `${dbLatency}ms`
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        environment: process.env.NODE_ENV || "unknown"
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
        database: {
          status: "disconnected",
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });

  // Readiness check (for Kubernetes)
  app.get("/api/ready", async (req, res) => {
    try {
      await db.execute("SELECT 1");
      res.status(200).json({ status: "ready" });
    } catch (error) {
      res.status(503).json({ 
        status: "not ready",
        error: "Database not accessible"
      });
    }
  });

  // Liveness check (for Kubernetes)
  app.get("/api/live", (req, res) => {
    res.status(200).json({ status: "alive" });
  });
}
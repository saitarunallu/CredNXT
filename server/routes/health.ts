import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Quick Firebase connectivity check
    // Test with a simple read operation
    await storage.getUser('test-health-check');
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      responseTime: responseTime
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Firebase connection failed'
    });
  }
});

// Detailed health check for monitoring systems
router.get('/health/detailed', async (req, res) => {
  const checks = [];
  let overallStatus = 'healthy';

  try {
    // Firebase connectivity check
    const firebaseStart = Date.now();
    await storage.getUser('test-health-check');
    const firebaseResponseTime = Date.now() - firebaseStart;
    
    checks.push({
      name: 'firebase',
      status: 'healthy',
      responseTime: firebaseResponseTime,
      details: 'Firebase connection successful'
    });
  } catch (error) {
    overallStatus = 'unhealthy';
    checks.push({
      name: 'firebase',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to connect to Firebase'
    });
  }

  try {
    // Memory usage check
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const memoryStatus = heapUsagePercent > 90 ? 'warning' : 'healthy';

    checks.push({
      name: 'memory',
      status: memoryStatus,
      usage: memoryMB,
      heapUsagePercent: Math.round(heapUsagePercent),
      details: `Heap usage: ${Math.round(heapUsagePercent)}%`
    });
  } catch (error) {
    checks.push({
      name: 'memory',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Disk space check (simplified)
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat('.');
    
    checks.push({
      name: 'filesystem',
      status: 'healthy',
      details: 'Filesystem accessible'
    });
  } catch (error) {
    overallStatus = 'unhealthy';
    checks.push({
      name: 'filesystem',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Enhanced environment checks for deployment
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID', 
    'FIREBASE_PRIVATE_KEY', 
    'FIREBASE_CLIENT_EMAIL',
    'JWT_SECRET'
  ];
  const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
  
  // Check for insecure defaults
  const insecureDefaults = [];
  if (process.env.JWT_SECRET === 'fallback-secret-please-change-in-production') {
    insecureDefaults.push('JWT_SECRET using default value');
  }
  
  let envStatus = 'healthy';
  let envDetails = 'All required environment variables are properly configured';
  
  if (missingEnvVars.length > 0) {
    envStatus = 'unhealthy';
    overallStatus = 'unhealthy';
    envDetails = `Missing critical variables: ${missingEnvVars.join(', ')}. Check DEPLOYMENT_CHECKLIST.md`;
  } else if (insecureDefaults.length > 0) {
    envStatus = 'warning';
    if (overallStatus === 'healthy') overallStatus = 'degraded';
    envDetails = `Security issues: ${insecureDefaults.join(', ')}`;
  }
  
  checks.push({
    name: 'environment',
    status: envStatus,
    details: envDetails,
    ...(missingEnvVars.length > 0 && { missing: missingEnvVars }),
    ...(insecureDefaults.length > 0 && { security_warnings: insecureDefaults })
  });

  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    node_version: process.version,
    platform: process.platform,
    checks
  });
});

// Kubernetes readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check if the application is ready to serve traffic
    await storage.getUser('test-readiness-check');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Application not ready to serve traffic'
    });
  }
});

// Kubernetes liveness probe
router.get('/live', (req, res) => {
  // Simple liveness check - if this responds, the process is alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
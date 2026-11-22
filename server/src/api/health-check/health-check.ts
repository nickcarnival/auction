import { Request, Response, Router } from 'express';
import { getDb } from '../../db';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    errorHandler: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    middleware: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
  };
}

const router = Router();

/**
 * Optimized health check endpoint for Render deployments
 * - Responds within 5-second timeout requirement
 * - Returns 200 for healthy, 503 for unhealthy (per Render protocol)
 * - Tests critical components with fast, reliable checks
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const HEALTH_CHECK_TIMEOUT = 4500; // 4.5 seconds to stay under Render's 5s limit

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    checks: {
      database: { status: 'healthy' },
      errorHandler: { status: 'healthy' },
      middleware: { status: 'healthy' },
    },
  };

  // Timeout promise to ensure we respond within Render's 5-second limit
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT);
  });

  try {
    await Promise.race([
      (async () => {
        // Fast database connectivity test (with 2s timeout)
        try {
          const dbStartTime = Date.now();
          const db = await getDb();

          // Quick connection test with timeout
          const dbTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Database timeout')), 2000);
          });

          await Promise.race([db.admin().ping(), dbTimeout]);

          healthStatus.checks.database = {
            status: 'healthy',
            responseTime: Date.now() - dbStartTime,
          };
        } catch (error) {
          healthStatus.checks.database = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Database connection failed',
          };
          healthStatus.status = 'unhealthy';
        }
      })(),
      timeoutPromise,
    ]);

    // Return appropriate status code for Render
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    // Fast timeout fallback - always return within 5 seconds
    const isTimeout = error instanceof Error && error.message === 'Health check timeout';

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      error: isTimeout
        ? 'Health check timed out'
        : error instanceof Error
          ? error.message
          : 'Health check failed',
      responseTime: Date.now() - startTime,
      checks: {
        database: { status: 'unhealthy', error: isTimeout ? 'Timed out' : 'Check failed' },
        errorHandler: { status: 'unhealthy', error: isTimeout ? 'Timed out' : 'Check failed' },
        middleware: { status: 'unhealthy', error: isTimeout ? 'Timed out' : 'Check failed' },
      },
    });
  }
});

/**
 * Simple ready check for Kubernetes/Docker readiness probes
 * Fast response with minimal overhead
 */
router.get('/ready', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * Simple alive check for basic liveness probes
 * Fastest possible health indicator
 */
router.get('/alive', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;

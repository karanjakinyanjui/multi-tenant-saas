import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  registers: [register]
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  registers: [register]
});

export const activeTenants = new promClient.Gauge({
  name: 'active_tenants_total',
  help: 'Total number of active tenants',
  registers: [register]
});

export const participantsByStage = new promClient.Gauge({
  name: 'participants_by_stage',
  help: 'Number of participants in each funnel stage',
  labelNames: ['tenant_id', 'stage'],
  registers: [register]
});

export const databaseConnections = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['tenant_id'],
  registers: [register]
});

// Middleware to track request metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const tenantId = (req as any).tenantId || 'unknown';

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
        tenant_id: tenantId
      },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
      tenant_id: tenantId
    });
  });

  next();
};

// Metrics endpoint handler
export const metricsEndpoint = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

export { register };

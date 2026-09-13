import express from 'express';
import apiRoutes from './routes';

export function createExpressApp(): express.Express {
  const app = express();

  // Body parsers with 15MB limit for metadata & uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Basic CORS support so external origins or preview domains can query API safely
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gallery-token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Request logger in dev/api paths
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/gallery')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check endpoints (accessible at both /api/health and /health)
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      serverless: Boolean(process.env.VERCEL),
    });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // Mount API routes at BOTH '/api' and '/'
  // In Vercel serverless functions, rewrites can route with full path (/api/...)
  // or relative path (...). Mounting both ensures seamless resolution in all environments.
  app.use('/api', apiRoutes);
  app.use('/', apiRoutes);

  // Fallback 404 JSON response for any unhandled /api requests
  // Guarantees frontend never receives HTML error pages from the Express backend
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    });
  });

  // Global Express error handler returning structured JSON
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[API Error]', err);
    const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}

export const app = createExpressApp();
export default app;

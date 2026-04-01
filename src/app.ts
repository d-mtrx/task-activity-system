import express from 'express';
import cors from 'cors';
import taskRoutes from './routes/task.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFound } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/auth', authRoutes);
  app.use('/tasks', taskRoutes);

  // 404 + global error handler (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

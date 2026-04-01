import express from 'express';
import cors from 'cors';
import path from 'path';
import taskRoutes from './routes/task.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFound } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve the demo frontend
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/auth', authRoutes);
  app.use('/tasks', taskRoutes);

  // 404 + global error handler
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

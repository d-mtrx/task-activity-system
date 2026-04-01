import http from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { createApp } from './app';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { EventService } from './services/event.service';
import { AuthService } from './services/auth.service';

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  // 1. Connect to databases before accepting traffic
  await connectDB();
  await connectRedis();

  // 2. Create HTTP server from Express app
  const app = createApp();
  const server = http.createServer(app);

  // 3. Attach Socket.io to the same HTTP server
  const io = new SocketServer(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });

  // 4. Authenticate WebSocket connections with the same JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      // Allow unauthenticated connections for read-only real-time feed
      (socket as unknown as { user: null }).user = null;
      return next();
    }
    try {
      const user = AuthService.verifyToken(token);
      (socket as unknown as { user: typeof user }).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // 5. Init event service — wires Redis Pub/Sub → Socket.io broadcast
  EventService.init(io);

  // 6. Start listening
  server.listen(PORT, () => {
    console.log(`\n🚀 Task Activity System running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`\nEndpoints:`);
    console.log(`  POST   /auth/register`);
    console.log(`  POST   /auth/login`);
    console.log(`  POST   /tasks`);
    console.log(`  GET    /tasks`);
    console.log(`  PATCH  /tasks/:id`);
    console.log(`  GET    /tasks/activity`);
    console.log(`  GET    /health\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});

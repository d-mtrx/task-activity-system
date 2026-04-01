import http from "http";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

import { createApp } from "./app";
import { connectDB, db } from "./config/database";
import { connectRedis } from "./config/redis";
import { EventService } from "./services/event.service";
import { AuthService } from "./services/auth.service";

const PORT = Number(process.env.PORT) || 3000;

async function runMigrations(): Promise<void> {
  const sql = fs.readFileSync(
    path.join(__dirname, "config", "schema.sql"),
    "utf8",
  );
  await db.query(sql);
  console.log("✅ Migrations complete");
}

async function bootstrap() {
  await connectDB();
  await connectRedis();
  await runMigrations();

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      (socket as unknown as { user: null }).user = null;
      return next();
    }
    try {
      const user = AuthService.verifyToken(token);
      (socket as unknown as { user: typeof user }).user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  EventService.init(io);

  server.listen(PORT, () => {
    console.log(`\n🚀 Task Activity System running on port ${PORT}`);
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

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});

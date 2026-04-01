import { Server as SocketServer } from 'socket.io';
import { redisPub, redisSub, REDIS_CHANNELS } from '../config/redis';
import { WebSocketEvent } from '../types';

let io: SocketServer | null = null;

export const EventService = {
  /**
   * Bind the Socket.io server instance so we can emit from anywhere.
   * Subscribe to Redis Pub/Sub channel so events published by any
   * horizontal replica are relayed to all local socket connections.
   *
   * Why Redis Pub/Sub here?
   * In a multi-instance deployment, a task update on Server A must reach
   * clients connected to Server B. Redis Pub/Sub decouples the emitter
   * from the socket layer — any instance publishes, all instances subscribe
   * and forward to their own clients. This is far lighter than polling the DB.
   */
  init(socketServer: SocketServer): void {
    io = socketServer;

    redisSub.subscribe(REDIS_CHANNELS.TASK_EVENTS, (err) => {
      if (err) console.error('Redis subscribe error:', err);
      else console.log(`✅ Subscribed to Redis channel: ${REDIS_CHANNELS.TASK_EVENTS}`);
    });

    redisSub.on('message', (channel, message) => {
      if (channel === REDIS_CHANNELS.TASK_EVENTS && io) {
        const event = JSON.parse(message) as WebSocketEvent;
        io.emit(event.event, event);
      }
    });
  },

  async publish(event: WebSocketEvent): Promise<void> {
    await redisPub.publish(REDIS_CHANNELS.TASK_EVENTS, JSON.stringify(event));
  },
};

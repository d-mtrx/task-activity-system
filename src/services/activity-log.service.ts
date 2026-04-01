import { redis } from '../config/redis';
import { ActivityLog } from '../types';

const ACTIVITY_KEY = 'activity:logs';
const MAX_LOGS = 1000; // Keep last 1000 activity entries

export const ActivityLogService = {
  /**
   * Push an activity log entry to Redis List.
   * We use a Redis List (LPUSH + LTRIM) for O(1) inserts and bounded storage.
   * This is the primary reason we use NoSQL here — a relational table would
   * require index maintenance and cleanup jobs. Redis lists give us cheap,
   * ephemeral, ordered activity history ideal for audit trails and feeds.
   */
  async log(entry: ActivityLog): Promise<void> {
    const serialized = JSON.stringify(entry);
    await redis.lpush(ACTIVITY_KEY, serialized);
    await redis.ltrim(ACTIVITY_KEY, 0, MAX_LOGS - 1);
  },

  async getRecent(count = 50): Promise<ActivityLog[]> {
    const raw = await redis.lrange(ACTIVITY_KEY, 0, count - 1);
    return raw.map((r) => JSON.parse(r) as ActivityLog);
  },

  async getByTask(taskId: string, count = 20): Promise<ActivityLog[]> {
    // Scan the log for entries matching this task
    const all = await redis.lrange(ACTIVITY_KEY, 0, MAX_LOGS - 1);
    return all
      .map((r) => JSON.parse(r) as ActivityLog)
      .filter((e) => e.taskId === taskId)
      .slice(0, count);
  },
};

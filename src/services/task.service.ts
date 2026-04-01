import { TaskModel } from '../models/task.model';
import { CacheService } from './cache.service';
import { EventService } from './event.service';
import { ActivityLogService } from './activity-log.service';
import { CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { CreateTaskDTO, UpdateTaskDTO, PaginationQuery, Task, PaginatedResult } from '../types';

export const TaskService = {
  async createTask(dto: CreateTaskDTO, userId: string, username: string): Promise<Task> {
    const task = await TaskModel.create(dto, userId);

    // Invalidate the list cache since we have a new task
    await CacheService.invalidatePattern('tasks:all*');

    // Log the activity in Redis
    await ActivityLogService.log({
      taskId: task.id,
      action: 'created',
      performedBy: username,
      timestamp: new Date().toISOString(),
    });

    // Publish to all connected clients via Redis Pub/Sub → Socket.io
    await EventService.publish({
      event: 'task:created',
      payload: task,
      actorUsername: username,
      timestamp: new Date().toISOString(),
    });

    return task;
  },

  async listTasks(query: PaginationQuery): Promise<PaginatedResult<Task>> {
    // Build a cache key that includes all query params so different
    // filter combinations have independent cache entries
    const cacheKey = `${CACHE_KEYS.ALL_TASKS}:${JSON.stringify(query)}`;

    const cached = await CacheService.get<PaginatedResult<Task>>(cacheKey);
    if (cached) return cached;

    const result = await TaskModel.findAll(query);
    await CacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  },

  async updateTask(
    id: string,
    dto: UpdateTaskDTO,
    userId: string,
    username: string
  ): Promise<Task | null> {
    const before = await TaskModel.findById(id);
    if (!before) return null;

    const task = await TaskModel.update(id, dto);
    if (!task) return null;

    // Invalidate both the list and the single-task cache
    await CacheService.del(CACHE_KEYS.TASK(id));
    await CacheService.invalidatePattern('tasks:all*');

    await ActivityLogService.log({
      taskId: id,
      action: 'updated',
      changes: { status: { from: before.status, to: dto.status } },
      performedBy: username,
      timestamp: new Date().toISOString(),
    });

    await EventService.publish({
      event: 'task:updated',
      payload: task,
      actorUsername: username,
      timestamp: new Date().toISOString(),
    });

    return task;
  },

  async getActivityLogs(taskId?: string) {
    if (taskId) return ActivityLogService.getByTask(taskId);
    return ActivityLogService.getRecent(50);
  },
};

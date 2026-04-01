export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
}

export interface UpdateTaskDTO {
  status: TaskStatus;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface RegisterDTO {
  username: string;
  password: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  username: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActivityLog {
  taskId: string;
  action: 'created' | 'updated';
  changes?: Record<string, unknown>;
  performedBy: string;
  timestamp: string;
}

export interface WebSocketEvent {
  event: 'task:created' | 'task:updated';
  payload: Task;
  actorUsername: string;
  timestamp: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

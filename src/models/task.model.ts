import { db } from '../config/database';
import { Task, CreateTaskDTO, UpdateTaskDTO, PaginationQuery, PaginatedResult } from '../types';

export const TaskModel = {
  async create(dto: CreateTaskDTO, userId: string): Promise<Task> {
    const { rows } = await db.query<Task>(
      `INSERT INTO tasks (title, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.title, dto.description ?? '', userId]
    );
    return rows[0];
  },

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Task>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (query.status) {
      conditions.push(`t.status = $${paramIdx++}`);
      params.push(query.status);
    }

    if (query.search) {
      conditions.push(
        `(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`
      );
      params.push(`%${query.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks t ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await db.query<Task>(
      `SELECT t.*, u.username as created_by_username
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: string): Promise<Task | null> {
    const { rows } = await db.query<Task>(
      `SELECT t.*, u.username as created_by_username
       FROM tasks t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async update(id: string, dto: UpdateTaskDTO): Promise<Task | null> {
    const { rows } = await db.query<Task>(
      `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
      [dto.status, id]
    );
    return rows[0] ?? null;
  },
};

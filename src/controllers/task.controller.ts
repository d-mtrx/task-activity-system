import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { TaskService } from '../services/task.service';
import { TaskStatus } from '../types';

const VALID_STATUSES: TaskStatus[] = ['pending', 'in-progress', 'completed'];

export const taskValidators = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 255 }).withMessage('Title must be under 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description must be under 2000 characters'),
  ],

  update: [
    param('id').isUUID(4).withMessage('Invalid task ID'),
    body('status')
      .isIn(VALID_STATUSES)
      .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],

  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
    query('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status filter'),
    query('search').optional().trim().isLength({ max: 100 }),
  ],
};

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

export const TaskController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;
      const task = await TaskService.createTask(
        { title: req.body.title, description: req.body.description },
        req.user!.userId,
        req.user!.username
      );
      res.status(201).json({ data: task });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;
      const result = await TaskService.listTasks({
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
        status: req.query.status as TaskStatus,
        search: req.query.search as string,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;
      const task = await TaskService.updateTask(
        req.params.id,
        { status: req.body.status },
        req.user!.userId,
        req.user!.username
      );
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ data: task });
    } catch (err) {
      next(err);
    }
  },

  async activityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await TaskService.getActivityLogs(req.query.taskId as string);
      res.json({ data: logs });
    } catch (err) {
      next(err);
    }
  },
};

import { Router } from 'express';
import { TaskController, taskValidators } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.post('/', taskValidators.create, TaskController.create);
router.get('/', taskValidators.list, TaskController.list);
router.patch('/:id', taskValidators.update, TaskController.update);

// Activity log endpoint
router.get('/activity', TaskController.activityLogs);

export default router;

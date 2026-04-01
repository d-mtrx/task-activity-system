import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';

export const authValidators = {
  register: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, underscores'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],

  login: [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
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

export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;
      const result = await AuthService.register({
        username: req.body.username,
        password: req.body.password,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof Error && err.message === 'Username already taken') {
        res.status(409).json({ error: err.message });
        return;
      }
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;
      const result = await AuthService.login({
        username: req.body.username,
        password: req.body.password,
      });
      res.json({ data: result });
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid credentials') {
        res.status(401).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
};

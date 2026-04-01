import { Router } from 'express';
import { AuthController, authValidators } from '../controllers/auth.controller';

const router = Router();

router.post('/register', authValidators.register, AuthController.register);
router.post('/login', authValidators.login, AuthController.login);

export default router;

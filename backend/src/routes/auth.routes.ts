import { Router } from 'express';
import { asyncHandler } from '../utils';
import { register, login, logout, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../middleware/schemas/auth.schemas';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), asyncHandler(register));

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), asyncHandler(login));

// POST /api/v1/auth/logout  (protected)
router.post('/logout', authenticate, asyncHandler(logout));

// GET  /api/v1/auth/me  (protected)
router.get('/me', authenticate, asyncHandler(me));

export default router;

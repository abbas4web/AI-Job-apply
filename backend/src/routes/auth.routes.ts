import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  register,
  login,
  logout,
  me,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', asyncHandler(register));

// POST /api/v1/auth/login
router.post('/login', asyncHandler(login));

// POST /api/v1/auth/logout
router.post('/logout', authenticate, asyncHandler(logout));

// GET  /api/v1/auth/me
router.get('/me', authenticate, asyncHandler(me));

export default router;

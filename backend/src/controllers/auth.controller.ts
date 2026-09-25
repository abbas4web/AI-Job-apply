import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import type { AuthRequest } from '../middleware/auth';
import type { RegisterInput, LoginInput } from '../middleware/schemas/auth.schemas';

// POST /api/v1/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterInput;

  const result = await authService.register({
    email: body.email,
    name: body.name,
    password: body.password,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}

// POST /api/v1/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginInput;

  const result = await authService.login({
    email: body.email,
    password: body.password,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

// POST /api/v1/auth/logout
// JWT is stateless — logout is handled client-side by discarding the token.
// This endpoint exists for future refresh-token invalidation.
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

// GET /api/v1/auth/me
export async function me(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  const user = await authService.getCurrentUser(userId);

  res.status(200).json({
    success: true,
    data: user,
  });
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 12;

export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  // ── Register ──────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthResult> {
    // Check for existing account
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name.trim(),
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = this.generateToken(user.id, user.role);

    return { token, user };
  }

  // ── Login ─────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    // Use constant-time compare to prevent user enumeration
    if (!user) {
      await bcrypt.compare(dto.password, '$2a$12$placeholder.hash.to.prevent.timing.attacks');
      throw AppError.unauthorized('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ── Get current user ──────────────────────────────────────
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  // ── Token generation ──────────────────────────────────────
  private generateToken(userId: string, role: string): string {
    return jwt.sign(
      { sub: userId, role } satisfies Omit<TokenPayload, 'iat' | 'exp'>,
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }
}

// Export a singleton instance
export const authService = new AuthService();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),

  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // ── SMTP (Nodemailer) ──────────────────────────────────────
  // All SMTP fields are optional at startup so the app boots
  // without email configured. EmailService guards against sends
  // when credentials are absent.
  SMTP_HOST:     z.string().optional(),
  SMTP_PORT:     z.coerce.number().default(587),
  SMTP_SECURE:   z.string().transform((v) => v === 'true').default('false'),
  SMTP_USER:     z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM:     z.string().optional(), // e.g. '"AI Job Apply" <noreply@example.com>'
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { Button, Input, FormField } from '@/components/ui';

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name too long'),
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/** Visual password-strength indicator */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-red-400', 'bg-yellow-400', 'bg-indigo-400', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? colors[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`text-xs ${c.pass ? 'text-green-600' : 'text-gray-400'}`}
          >
            {c.pass ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterFormValues) => {
    clearError();
    try {
      await registerAccount({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push('/dashboard');
    } catch {
      // error is already set in the store
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Start automating your job search today
        </p>
      </div>

      {/* Server / API error */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="Full name"
          htmlFor="name"
          error={errors.name?.message}
          required
        >
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            hasError={!!errors.name}
            leftAddon={<User className="h-4 w-4" />}
            {...register('name')}
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
          required
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            hasError={!!errors.email}
            leftAddon={<Mail className="h-4 w-4" />}
            {...register('email')}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          required
        >
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.password}
            leftAddon={<Lock className="h-4 w-4" />}
            rightAddon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            {...register('password')}
          />
          <PasswordStrength password={passwordValue} />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.confirmPassword}
            leftAddon={<Lock className="h-4 w-4" />}
            rightAddon={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            {...register('confirmPassword')}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="mt-2 w-full"
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

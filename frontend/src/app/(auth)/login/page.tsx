'use client';

import type { Metadata } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

import { useAuthStore } from '@/stores/auth.store';
import { Button, Input, FormField } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    clearError();
    try {
      await login(data);
      router.push('/dashboard');
    } catch {
      // error is already set in the store
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your account to continue
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
            autoComplete="current-password"
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
        </FormField>

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="mt-2 w-full"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Create one
        </Link>
      </p>
    </>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}

      {!error && hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, leftAddon, rightAddon, className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="pointer-events-none absolute left-3 text-gray-400">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
            'placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            hasError
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            leftAddon && 'pl-9',
            rightAddon && 'pr-9',
            className
          )}
          {...props}
        />
        {rightAddon && (
          <span className="absolute right-3 text-gray-400">{rightAddon}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

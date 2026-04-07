import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 border rounded-lg',
            'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : 'border-[var(--border-primary)] focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-[var(--input-disabled-bg)] disabled:cursor-not-allowed',
            'placeholder:text-[var(--text-tertiary)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[var(--bg-secondary)] rounded-lg shadow-md overflow-hidden',
          className
        )}
        {...props}
      >
        {(title || description) && (
          <div className="border-b border-[var(--border-primary)] px-6 py-4">
            {title && (
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    )
  }
)

Card.displayName = 'Card'

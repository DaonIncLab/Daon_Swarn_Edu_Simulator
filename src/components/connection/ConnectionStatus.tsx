import { ConnectionStatus as Status } from '@/constants/connection'
import { cn } from '@/utils/cn'

interface ConnectionStatusProps {
  status: Status
  className?: string
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case Status.CONNECTED:
        return {
          color: 'bg-success',
          text: 'Connected',
          textColor: 'text-success-dark',
          icon: '●',
          animate: false,
        }
      case Status.CONNECTING:
        return {
          color: 'bg-warning',
          text: 'Connecting...',
          textColor: 'text-warning-dark',
          icon: '●',
          animate: true,
        }
      case Status.ERROR:
        return {
          color: 'bg-danger',
          text: 'Connection Error',
          textColor: 'text-danger-dark',
          icon: '●',
          animate: false,
        }
      case Status.DISCONNECTED:
      default:
        return {
          color: 'bg-[var(--status-offline)]',
          text: 'Disconnected',
          textColor: 'text-[var(--text-secondary)]',
          icon: '●',
          animate: false,
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          config.color,
          config.animate && 'animate-pulse'
        )}
        aria-label={config.text}
      />
      <span className={cn('text-sm font-medium', config.textColor)}>
        {config.text}
      </span>
    </div>
  )
}

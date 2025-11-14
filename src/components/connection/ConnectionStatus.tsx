import { useTranslation } from 'react-i18next'
import { ConnectionStatus as Status } from '@/constants/connection'
import { cn } from '@/utils/cn'

interface ConnectionStatusProps {
  status: Status
  className?: string
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const { t } = useTranslation()

  const getStatusConfig = () => {
    switch (status) {
      case Status.CONNECTED:
        return {
          color: 'bg-success',
          text: t('connection.status.connected'),
          textColor: 'text-success-dark',
          icon: '●',
          animate: false,
        }
      case Status.CONNECTING:
        return {
          color: 'bg-warning',
          text: t('connection.status.connecting'),
          textColor: 'text-warning-dark',
          icon: '●',
          animate: true,
        }
      case Status.ERROR:
        return {
          color: 'bg-danger',
          text: t('connection.status.error'),
          textColor: 'text-danger-dark',
          icon: '●',
          animate: false,
        }
      case Status.DISCONNECTED:
      default:
        return {
          color: 'bg-[var(--status-offline)]',
          text: t('connection.status.disconnected'),
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

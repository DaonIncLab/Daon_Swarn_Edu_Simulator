import React from 'react'
import { useTranslation } from 'react-i18next'
import { useExecutionStore } from '@/stores/useExecutionStore'

interface DroneStatusButtonProps {
  onClick: () => void
}

export const DroneStatusButton: React.FC<DroneStatusButtonProps> = ({ onClick }) => {
  const { t } = useTranslation()
  const { drones } = useExecutionStore()

  // Calculate status summary
  const droneCount = drones.length
  const statusSummary = drones.reduce(
    (acc, drone) => {
      if (drone.status === 'idle' || drone.status === 'flying') {
        acc.normal++
      } else if (drone.status === 'error') {
        acc.error++
      } else {
        acc.warning++
      }
      return acc
    },
    { normal: 0, warning: 0, error: 0 }
  )

  const getStatusColor = () => {
    if (statusSummary.error > 0) return 'bg-red-500 hover:bg-red-600'
    if (statusSummary.warning > 0) return 'bg-yellow-500 hover:bg-yellow-600'
    if (droneCount === 0) return 'bg-gray-400 hover:bg-gray-500'
    return 'bg-green-500 hover:bg-green-600'
  }

  const getStatusIcon = () => {
    if (statusSummary.error > 0) return '⚠️'
    if (droneCount === 0) return '🚁'
    return '✓'
  }

  return (
    <button
      onClick={onClick}
      className={`${getStatusColor()} text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md flex items-center gap-2`}
    >
      <span className="text-xl">🚁</span>
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-semibold">
          {t('drone.status')} {getStatusIcon()}
        </span>
        <span className="text-xs opacity-90">
          {droneCount > 0 ? t('drone.connected', { count: droneCount }) : t('drone.waiting')}
        </span>
      </div>
    </button>
  )
}

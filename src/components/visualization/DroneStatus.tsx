import { useState, useEffect } from 'react'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { DroneState } from '@/types/websocket'

type ViewMode = 'card' | 'list'

interface DroneStatusProps {
  isOpen: boolean
  onClose: () => void
}

export function DroneStatus({ isOpen, onClose }: DroneStatusProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const { drones } = useExecutionStore()

  const getStatusColor = (status: DroneState['status']) => {
    switch (status) {
      case 'flying':
        return 'bg-success text-white'
      case 'landed':
        return 'bg-gray-500 text-white'
      case 'hovering':
        return 'bg-blue-500 text-white'
      case 'error':
        return 'bg-danger text-white'
      default:
        return 'bg-gray-300 text-gray-700'
    }
  }

  const getStatusIcon = (status: DroneState['status']) => {
    switch (status) {
      case 'flying':
        return '🚁'
      case 'landed':
        return '🛬'
      case 'hovering':
        return '⏸️'
      case 'error':
        return '❌'
      default:
        return '❓'
    }
  }

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-success-dark'
    if (battery > 30) return 'text-yellow-600'
    return 'text-danger-dark'
  }

  const getBatteryIcon = (battery: number) => {
    if (battery > 75) return '🔋'
    if (battery > 50) return '🔋'
    if (battery > 25) return '🪫'
    return '🪫'
  }

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl overflow-hidden max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚁</span>
            <h3 className="text-lg font-semibold text-white">Drone Status</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {drones.length > 0 && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white text-green-600'
                      : 'text-white hover:bg-white/20'
                  }`}
                  title="카드형"
                >
                  📇 카드
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-green-600'
                      : 'text-white hover:bg-white/20'
                  }`}
                  title="리스트형"
                >
                  📋 리스트
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg px-3 py-2 transition-colors text-xl font-bold"
              title="닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-white/90">
            {drones.length} drone{drones.length !== 1 ? 's' : ''} connected
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {drones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🚁</div>
              <p className="text-sm">No drones connected</p>
              <p className="text-xs mt-1">
                Waiting for telemetry data from Unity...
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                // Card View
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {drones.map((drone) => (
                    <div
                      key={drone.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      {/* Drone Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            #{drone.id}
                          </span>
                          <span className="text-2xl">{getStatusIcon(drone.status)}</span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            drone.status
                          )}`}
                        >
                          {drone.status}
                        </span>
                      </div>

                      {/* Battery */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Battery</span>
                          <span
                            className={`font-semibold ${getBatteryColor(
                              drone.battery
                            )}`}
                          >
                            {getBatteryIcon(drone.battery)} {drone.battery}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              drone.battery > 60
                                ? 'bg-success'
                                : drone.battery > 30
                                ? 'bg-yellow-500'
                                : 'bg-danger'
                            }`}
                            style={{ width: `${drone.battery}%` }}
                          />
                        </div>
                      </div>

                      {/* Position */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Position:</span>
                          <span className="font-mono">
                            ({drone.position.x.toFixed(1)}, {drone.position.y.toFixed(1)},{' '}
                            {drone.position.z.toFixed(1)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Altitude:</span>
                          <span className="font-mono font-semibold">
                            {drone.position.z.toFixed(2)}m
                          </span>
                        </div>
                      </div>

                      {/* Velocity (optional) */}
                      {drone.velocity && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-600">
                            Velocity:{' '}
                            <span className="font-mono">
                              {Math.sqrt(
                                drone.velocity.x ** 2 +
                                  drone.velocity.y ** 2 +
                                  drone.velocity.z ** 2
                              ).toFixed(2)}{' '}
                              m/s
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {drones.map((drone) => (
                    <div
                      key={drone.id}
                      className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {/* Drone ID & Icon */}
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <span className="text-base font-semibold text-gray-900">
                          #{drone.id}
                        </span>
                        <span className="text-lg">{getStatusIcon(drone.status)}</span>
                      </div>

                      {/* Status Badge */}
                      <div className="w-24 flex-shrink-0">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            drone.status
                          )}`}
                        >
                          {drone.status}
                        </span>
                      </div>

                      {/* Battery Bar */}
                      <div className="flex items-center gap-2 w-36 flex-shrink-0">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              drone.battery > 60
                                ? 'bg-success'
                                : drone.battery > 30
                                ? 'bg-yellow-500'
                                : 'bg-danger'
                            }`}
                            style={{ width: `${drone.battery}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-semibold ${getBatteryColor(
                            drone.battery
                          )}`}
                        >
                          {drone.battery}%
                        </span>
                      </div>

                      {/* Altitude */}
                      <div className="w-24 text-right flex-shrink-0">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {drone.position.z.toFixed(1)}m
                        </span>
                      </div>

                      {/* Position (Compact) */}
                      <div className="flex-1 text-right text-xs text-gray-600 font-mono">
                        ({drone.position.x.toFixed(1)}, {drone.position.y.toFixed(1)},{' '}
                        {drone.position.z.toFixed(1)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

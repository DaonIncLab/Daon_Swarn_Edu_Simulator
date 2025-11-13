import { useState, useEffect } from 'react'
import { ExecutionLog } from '@/components/visualization/ExecutionLog'
import { TelemetryDashboard } from '@/components/visualization/TelemetryDashboard'
import { CommandPreview } from '@/components/visualization/CommandPreview'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { DroneState } from '@/types/websocket'

interface MonitoringPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'drones' | 'logs' | 'telemetry' | 'commands'

interface Tab {
  id: TabId
  icon: string
  label: string
}

const tabs: Tab[] = [
  { id: 'drones', icon: '🚁', label: '드론 상태' },
  { id: 'logs', icon: '📜', label: '실행 로그' },
  { id: 'telemetry', icon: '📈', label: '텔레메트리' },
  { id: 'commands', icon: '📋', label: '명령 미리보기' },
]

export function MonitoringPanel({ isOpen, onClose }: MonitoringPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('drones')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const { drones } = useExecutionStore()

  const getStatusColor = (status: DroneState['status']) => {
    switch (status) {
      case 'flying':
        return 'bg-green-600 text-white'
      case 'landed':
        return 'bg-gray-500 text-white'
      case 'hovering':
        return 'bg-blue-500 text-white'
      case 'error':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-300 text-gray-700'
    }
  }

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-700'
    if (battery > 30) return 'text-yellow-600'
    return 'text-red-700'
  }

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when open
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
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="돌아가기"
            >
              <span className="text-xl">←</span>
            </button>
            <h2 className="text-xl font-bold">모니터링</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-xl font-bold"
            title="닫기 (ESC)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex gap-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <div className="h-full overflow-y-auto">
          {activeTab === 'drones' && (
            <div className="p-6">
              {/* View Mode Toggle */}
              {drones.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <div className="inline-flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        viewMode === 'card'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      📇 카드
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      📋 리스트
                    </button>
                  </div>
                </div>
              )}

              {/* Drone List/Grid */}
              {drones.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">🚁</div>
                  <p className="text-gray-600 text-lg">드론이 연결되지 않았습니다</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Unity에서 텔레메트리 데이터를 기다리는 중...
                  </p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {drones.map((drone) => (
                    <div
                      key={drone.id}
                      className="bg-white rounded-lg shadow p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{drone.id}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            drone.status
                          )}`}
                        >
                          {drone.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">배터리:</span>
                          <span className={`font-semibold ${getBatteryColor(drone.battery)}`}>
                            {drone.battery}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">위치:</span>
                          <span className="font-mono text-xs">
                            ({drone.position.x.toFixed(1)}, {drone.position.y.toFixed(1)},{' '}
                            {drone.position.z.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          드론 ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          상태
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          배터리
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          위치 (X, Y, Z)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {drones.map((drone) => (
                        <tr key={drone.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{drone.id}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                drone.status
                              )}`}
                            >
                              {drone.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${getBatteryColor(drone.battery)}`}>
                              {drone.battery}%
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-600">
                            ({drone.position.x.toFixed(1)}, {drone.position.y.toFixed(1)},{' '}
                            {drone.position.z.toFixed(1)})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-6">
              <ExecutionLog />
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="p-6">
              <TelemetryDashboard />
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="p-6">
              <CommandPreview />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

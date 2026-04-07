/**
 * Telemetry Dashboard Component
 *
 * Tabbed interface for viewing drone telemetry data:
 * - 3D View: Three.js visualization
 * - Charts: Battery and altitude charts
 * - Drone List: Detailed drone status table
 */

import { useState } from 'react'
import { shallow } from 'zustand/shallow'
import { Drone3DView } from './Drone3DView'
import { BatteryChart } from './BatteryChart'
import { AltitudeChart } from './AltitudeChart'
import { TelemetryTab } from '@/constants/telemetry'
import type { TelemetryTab as TelemetryTabType } from '@/types/telemetry'
import { useTelemetryStore } from '@/stores/useTelemetryStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { DroneState } from '@/types/websocket'

/**
 * Tab Button Component
 */
function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string
  icon: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 font-medium rounded-t-lg transition-colors ${
        isActive
          ? 'bg-white text-blue-600 border-b-2 border-blue-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/**
 * Inline Drone Card Component
 */
function DroneCard({ drone }: { drone: DroneState }) {
  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'bg-success'
    if (battery > 30) return 'bg-yellow-500'
    return 'bg-danger'
  }

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

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">Drone #{drone.id}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(drone.status)}`}>
            {drone.status}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Battery: <span className="font-semibold">{drone.battery}%</span>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${getBatteryColor(drone.battery)}`}
          style={{ width: `${drone.battery}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Position:</span>
          <span className="ml-1 font-mono">({drone.position.x.toFixed(1)}, {drone.position.y.toFixed(1)}, {drone.position.z.toFixed(1)})</span>
        </div>
        <div>
          <span className="text-gray-600">Altitude:</span>
          <span className="ml-1 font-mono font-semibold">{drone.position.z.toFixed(2)}m</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Telemetry Dashboard Component
 */
export function TelemetryDashboard() {
  const [activeTab, setActiveTab] = useState<TelemetryTabType>(TelemetryTab.VIEW_3D)

  // Optimized: Use selectors to subscribe only to needed state
  const drones = useExecutionStore(state => state.drones, shallow)
  const isRecording = useTelemetryStore(state => state.isRecording)
  const clearHistory = useTelemetryStore(state => state.clearHistory)

  const tabs = [
    { id: TelemetryTab.VIEW_3D, label: '3D View', icon: '🎮' },
    { id: TelemetryTab.CHARTS, label: 'Charts', icon: '📊' },
    { id: TelemetryTab.DRONE_LIST, label: 'Drone List', icon: '📋' },
  ]

  return (
    <div className="bg-gray-50 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📡</span>
            <h3 className="text-lg font-semibold text-white">Telemetry Dashboard</h3>
          </div>

          {/* Recording Status & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-white font-medium">
                {isRecording ? 'Recording' : 'Paused'}
              </span>
            </div>

            <button
              onClick={clearHistory}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors backdrop-blur-sm"
              title="Clear all telemetry history"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm text-white/90">
          <span>{drones.length} drone{drones.length !== 1 ? 's' : ''} active</span>
          <span>•</span>
          <span>
            {drones.filter((d) => d.status === 'flying').length} flying
          </span>
          <span>•</span>
          <span>
            Avg Battery:{' '}
            {drones.length > 0
              ? (
                  drones.reduce((sum, d) => sum + d.battery, 0) / drones.length
                ).toFixed(1)
              : 0}
            %
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 bg-gray-100">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Content */}
      <div className="p-6 bg-white">
        {/* 3D View */}
        {activeTab === TelemetryTab.VIEW_3D && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>3D Visualization:</strong> Real-time drone positions and status. Use
                mouse to rotate, pan, and zoom.
              </p>
            </div>
            <Drone3DView />
          </div>
        )}

        {/* Charts */}
        {activeTab === TelemetryTab.CHARTS && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Time-series Charts:</strong> Historical battery and altitude data over
                time.
              </p>
            </div>
            <BatteryChart />
            <AltitudeChart />
          </div>
        )}

        {/* Drone List */}
        {activeTab === TelemetryTab.DRONE_LIST && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Drone Status List:</strong> Detailed status information for each drone.
              </p>
            </div>
            {drones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-3">🚁</div>
                <p className="text-base">No drones connected</p>
                <p className="text-sm mt-1">Waiting for telemetry data...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drones.map((drone) => (
                  <DroneCard key={drone.id} drone={drone} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          💡 Tip: Telemetry data is automatically recorded when drones are connected. Use the
          Clear button to reset history.
        </p>
      </div>
    </div>
  )
}

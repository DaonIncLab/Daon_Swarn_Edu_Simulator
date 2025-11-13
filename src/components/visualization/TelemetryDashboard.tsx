/**
 * Telemetry Dashboard Component
 *
 * Tabbed interface for viewing drone telemetry data:
 * - 3D View: Three.js visualization
 * - Charts: Battery and altitude charts
 * - Drone List: Detailed drone status table
 */

import { useState } from 'react'
import { Drone3DView } from './Drone3DView'
import { BatteryChart } from './BatteryChart'
import { AltitudeChart } from './AltitudeChart'
import { DroneStatus } from './DroneStatus'
import { TelemetryTab } from '@/types/telemetry'
import { useTelemetryStore } from '@/stores/useTelemetryStore'
import { useExecutionStore } from '@/stores/useExecutionStore'

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
 * Telemetry Dashboard Component
 */
export function TelemetryDashboard() {
  const [activeTab, setActiveTab] = useState<TelemetryTab>(TelemetryTab.VIEW_3D)
  const { drones } = useExecutionStore()
  const { isRecording, clearHistory } = useTelemetryStore()

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
            <DroneStatus />
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

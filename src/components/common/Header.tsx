import { useProjectStore } from '@/stores/useProjectStore'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus } from '@/constants/connection'

interface HeaderProps {
  onOpenMonitoring: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenMonitoring, onOpenSettings }: HeaderProps) {
  const { currentProject, saveCurrentProject } = useProjectStore()
  const { hasUnsavedChanges } = useBlocklyStore()
  const { status } = useConnectionStore()

  const isConnected = status === ConnectionStatus.CONNECTED

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Project Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Drone Swarm Simulator
            </h1>
            <p className="text-xs text-gray-500">
              Blockly ↔ Unity Integration
            </p>
          </div>

          {currentProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                📄 {currentProject.name}
              </span>
              {hasUnsavedChanges && (
                <span
                  className="text-orange-600 font-bold"
                  title="저장되지 않은 변경사항"
                >
                  ✱
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Save Button */}
          {currentProject && hasUnsavedChanges && (
            <button
              onClick={() => saveCurrentProject()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              title="저장 (Ctrl+S)"
            >
              💾 저장
            </button>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {/* Monitoring Button */}
          {isConnected && (
            <button
              onClick={onOpenMonitoring}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <span>📊</span>
              <span>모니터링</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="설정"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </div>
    </header>
  )
}

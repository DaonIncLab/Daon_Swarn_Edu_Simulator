import { useProjectStore } from '@/stores/useProjectStore'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useThemeContext } from '@/contexts/ThemeContext'
import { ConnectionStatus } from '@/constants/connection'

interface HeaderProps {
  onOpenMonitoring: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenMonitoring, onOpenSettings }: HeaderProps) {
  const { currentProject, saveCurrentProject } = useProjectStore()
  const { hasUnsavedChanges } = useBlocklyStore()
  const { status } = useConnectionStore()
  const { isDark, toggle } = useThemeContext()

  const isConnected = status === ConnectionStatus.CONNECTED

  return (
    <header className="bg-[var(--bg-secondary)] shadow-sm border-b border-[var(--border-primary)] flex-shrink-0 transition-colors">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Project Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Drone Swarm Simulator
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Blockly ↔ Unity Integration
            </p>
          </div>

          {currentProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--project-badge-bg)] border border-[var(--project-badge-border)] rounded-lg">
              <span className="text-sm font-medium text-[var(--project-badge-text)]">
                📄 {currentProject.name}
              </span>
              {hasUnsavedChanges && (
                <span
                  className="text-[var(--unsaved-indicator)] font-bold"
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
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[var(--status-online)] animate-pulse' : 'bg-[var(--status-offline)]'
              }`}
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
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

          {/* Theme Toggle Button */}
          <button
            onClick={toggle}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title="설정"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>
      </div>
    </header>
  )
}

import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useThemeContext } from '@/contexts/ThemeContext'
import { ConnectionStatus } from '@/constants/connection'

interface HeaderProps {
  onOpenProject: () => void
  onOpenMonitoring: () => void
  onOpenConnectionSettings: () => void
}

export function Header({
  onOpenProject,
  onOpenMonitoring,
  onOpenConnectionSettings,
}: HeaderProps) {
  const { t, i18n } = useTranslation()
  const { currentProject, saveCurrentProject, isLoading: isProjectLoading } = useProjectStore()
  const { hasUnsavedChanges, workspace } = useBlocklyStore()
  const { status } = useConnectionStore()
  const { isDark, toggle } = useThemeContext()
  const [isSavingFromHeader, setIsSavingFromHeader] = useState(false)

  const isConnected = status === ConnectionStatus.CONNECTED
  const isWorkspaceReady = Boolean(workspace)
  const canSave = Boolean(currentProject) && hasUnsavedChanges && isWorkspaceReady && !isProjectLoading && !isSavingFromHeader

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(newLang)
  }

  const handleSave = async () => {
    if (!currentProject || !hasUnsavedChanges || !isWorkspaceReady || isProjectLoading || isSavingFromHeader) {
      return
    }

    setIsSavingFromHeader(true)
    try {
      await saveCurrentProject()
      alert('프로젝트가 저장되었습니다')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '프로젝트 저장 실패'
      alert(message)
    } finally {
      setIsSavingFromHeader(false)
    }
  }

  return (
    <header className="bg-[var(--bg-secondary)] shadow-sm border-b border-[var(--border-primary)] flex-shrink-0 transition-colors">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Project Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {t('header.title')}
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
              <span
                className={`font-bold ${
                  hasUnsavedChanges
                    ? 'text-[var(--unsaved-indicator)]'
                    : 'text-green-600'
                }`}
                title={hasUnsavedChanges ? t('project.unsaved') : t('common.success')}
              >
                {hasUnsavedChanges ? '*' : 'V'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[var(--status-online)] animate-pulse' : 'bg-[var(--status-offline)]'
              }`}
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {isConnected ? t('connection.status.connected') : t('connection.status.disconnected')}
            </span>
          </div>

          {/* Save Button */}
          {currentProject && (
            <button
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !isWorkspaceReady
                  ? '워크스페이스 초기화 중'
                  : isSavingFromHeader || isProjectLoading
                    ? '저장 중'
                    : `${t('common.save')} (Ctrl+S)`
              }
            >
              💾 {isSavingFromHeader || isProjectLoading ? '저장 중...' : t('common.save')}
            </button>
          )}

          {/* Monitoring Button */}
          {isConnected && (
            <button
              onClick={onOpenMonitoring}
              className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium flex items-center gap-2 border border-slate-200"
            >
              <span>📊</span>
              <span>{t('header.monitoring')}</span>
            </button>
          )}

          <button
            onClick={onOpenProject}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            title={t('header.project')}
          >
            📁 {t('header.project')}
          </button>

          {/* Connection Settings Button */}
          <button
            onClick={onOpenConnectionSettings}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
            title={t('header.connectionSettings')}
          >
            ⚙️ {t('header.connectionSettings')}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggle}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={isDark ? t('settings.lightMode') : t('settings.darkMode')}
          >
            <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={i18n.language === 'ko' ? 'Switch to English' : '한국어로 전환'}
          >
            <span className="text-xl">{i18n.language === 'ko' ? '🇬🇧' : '🇰🇷'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

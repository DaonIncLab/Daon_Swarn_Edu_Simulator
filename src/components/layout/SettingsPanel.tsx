import { useState, useEffect } from 'react'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { ConnectionPanel } from '@/components/connection/ConnectionPanel'
import { useProjectStore } from '@/stores/useProjectStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionStatus } from '@/constants/connection'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialStep?: SettingsStep
}

export type SettingsStep = 'project' | 'connection'

export function SettingsPanel({
  isOpen,
  onClose,
  initialStep = 'connection',
}: SettingsPanelProps) {
  const { currentProject } = useProjectStore()
  const { status } = useConnectionStore()
  const [activeStep, setActiveStep] = useState<SettingsStep>('project')

  useEffect(() => {
    if (!isOpen) return
    setActiveStep(currentProject ? initialStep : 'project')
  }, [currentProject, initialStep, isOpen])

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

  const stepTitle =
    activeStep === 'project' ? '프로젝트 시작' : '연결 설정'
  const stepDescription =
    activeStep === 'project'
      ? '프로젝트를 생성하거나 열어 작업을 시작합니다.'
      : '현재 프로젝트에서 사용할 연결 모드를 선택합니다. 연결되면 작업 화면으로 돌아갑니다.'
  const canGoBackToProject = activeStep === 'connection'
  const isConnected = status === ConnectionStatus.CONNECTED
  const showCloseButton =
    activeStep === 'project'
      ? Boolean(currentProject)
      : isConnected

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-secondary)] flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--header-gradient-from)] to-[var(--header-gradient-to)] text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {canGoBackToProject ? (
              <button
                onClick={() => setActiveStep('project')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="프로젝트 단계로 돌아가기"
              >
                <span className="text-xl">←</span>
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}
            <div>
              <h2 className="text-xl font-bold">{stepTitle}</h2>
              <p className="text-sm text-white/80 mt-1">{stepDescription}</p>
            </div>
          </div>

          {showCloseButton ? (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-xl font-bold"
              title="닫기 (ESC)"
            >
              ✕
            </button>
          ) : (
            <div className="w-10 h-10" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex-shrink-0">
        <div className="flex gap-3 px-6 py-4">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              activeStep === 'project'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <span className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              1
            </span>
            프로젝트
          </div>
          <div className="flex-1 border-t border-dashed border-[var(--border-primary)] self-center" />
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              activeStep === 'connection'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            <span className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              2
            </span>
            연결 설정
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div className="max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto">
            {activeStep === 'project' && (
              <ProjectPanel onProjectReady={() => setActiveStep('connection')} />
            )}
            {activeStep === 'connection' && (
              <ConnectionPanel onConnected={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

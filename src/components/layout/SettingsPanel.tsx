import { useState, useEffect } from 'react'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { ConnectionPanel } from '@/components/connection/ConnectionPanel'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'project' | 'connection'

interface Tab {
  id: TabId
  icon: string
  label: string
}

const tabs: Tab[] = [
  { id: 'project', icon: '📁', label: '프로젝트' },
  { id: 'connection', icon: '🔌', label: '연결' },
]

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('connection')

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
    <div className="fixed inset-0 z-[100] bg-[var(--bg-secondary)] flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--header-gradient-from)] to-[var(--header-gradient-to)] text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="돌아가기"
            >
              <span className="text-xl">←</span>
            </button>
            <h2 className="text-xl font-bold">설정</h2>
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
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex-shrink-0">
        <div className="flex gap-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div className="max-w-full sm:max-w-2xl lg:max-w-4xl mx-auto">
            {activeTab === 'project' && <ProjectPanel />}
            {activeTab === 'connection' && <ConnectionPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

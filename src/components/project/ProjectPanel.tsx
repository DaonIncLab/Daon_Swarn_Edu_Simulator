import { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useBlocklyStore } from '@/stores/useBlocklyStore'
import { Button } from '@/components/common/Button'
import { NewProjectModal } from './NewProjectModal'
import { ProjectListModal } from './ProjectListModal'

export function ProjectPanel() {
  const { currentProject, saveCurrentProject, exportProjectToFile, isLoading } = useProjectStore()
  const { hasUnsavedChanges } = useBlocklyStore()
  const [showNewModal, setShowNewModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  const handleSave = async () => {
    try {
      await saveCurrentProject()
      alert('프로젝트가 저장되었습니다')
    } catch (error) {
      console.error('Save failed:', error)
      alert('저장 실패')
    }
  }

  const handleExport = async () => {
    if (!currentProject) return

    try {
      await exportProjectToFile(currentProject.id)
    } catch (error) {
      console.error('Export failed:', error)
      alert('내보내기 실패')
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">프로젝트</h3>

        {/* Current Project Info */}
        {currentProject ? (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">
                    {currentProject.name}
                  </h4>
                  {hasUnsavedChanges && (
                    <span className="text-orange-600 font-bold" title="저장되지 않은 변경사항">
                      ✱
                    </span>
                  )}
                </div>
                {currentProject.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {currentProject.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
            열린 프로젝트가 없습니다
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => setShowNewModal(true)}
            disabled={isLoading}
          >
            📄 새 프로젝트
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowListModal(true)}
            disabled={isLoading}
          >
            📂 프로젝트 열기
          </Button>

          {currentProject && (
            <>
              <Button
                variant="success"
                fullWidth
                onClick={handleSave}
                disabled={isLoading || !hasUnsavedChanges}
              >
                💾 저장 {hasUnsavedChanges && '✱'}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleExport}
                disabled={isLoading}
              >
                📤 내보내기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />

      <ProjectListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
      />
    </>
  )
}

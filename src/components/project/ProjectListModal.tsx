import { useEffect, useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { Button } from '@/components/common/Button'
import type { ProjectMetadata } from '@/types/project'

interface ProjectListModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectListModal({ isOpen, onClose }: ProjectListModalProps) {
  const { projects, loadProject, deleteProject, renameProject, refreshProjectList, isLoading } = useProjectStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    if (isOpen) {
      refreshProjectList()
    }
  }, [isOpen, refreshProjectList])

  if (!isOpen) return null

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLoad = async (id: string) => {
    try {
      await loadProject(id)
      onClose()
    } catch (error) {
      console.error('Failed to load project:', error)
      alert('프로젝트 로드 실패')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 프로젝트를 삭제하시겠습니까?`)) {
      try {
        await deleteProject(id)
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('프로젝트 삭제 실패')
      }
    }
  }

  const startRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) {
      alert('프로젝트 이름을 입력해주세요')
      return
    }

    try {
      await renameProject(id, editingName.trim())
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Failed to rename project:', error)
      alert('이름 변경 실패')
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">프로젝트 열기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              프로젝트 목록을 불러오는 중...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '저장된 프로젝트가 없습니다'}
              </h3>
              <p className="text-gray-600">
                {searchQuery ? '다른 검색어를 시도해보세요' : '새 프로젝트를 만들어보세요'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isEditing={editingId === project.id}
                  editingName={editingName}
                  onEditingNameChange={setEditingName}
                  onLoad={() => handleLoad(project.id)}
                  onDelete={() => handleDelete(project.id, project.name)}
                  onStartRename={() => startRename(project.id, project.name)}
                  onRename={() => handleRename(project.id)}
                  onCancelRename={() => setEditingId(null)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {filteredProjects.length}개의 프로젝트
          </div>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: ProjectMetadata
  isEditing: boolean
  editingName: string
  onEditingNameChange: (name: string) => void
  onLoad: () => void
  onDelete: () => void
  onStartRename: () => void
  onRename: () => void
  onCancelRename: () => void
  formatDate: (date: string) => string
}

function ProjectCard({
  project,
  isEditing,
  editingName,
  onEditingNameChange,
  onLoad,
  onDelete,
  onStartRename,
  onRename,
  onCancelRename,
  formatDate,
}: ProjectCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => onEditingNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename()
                if (e.key === 'Escape') onCancelRename()
              }}
              className="w-full px-2 py-1 border border-primary-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          )}
          {project.description && !isEditing && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{formatDate(project.updatedAt)}</span>
        {project.blockCount !== undefined && (
          <span>{project.blockCount}개 블록</span>
        )}
      </div>

      {isEditing ? (
        <div className="flex gap-2">
          <button
            onClick={onRename}
            className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
          >
            저장
          </button>
          <button
            onClick={onCancelRename}
            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onLoad}
            className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
          >
            열기
          </button>
          <button
            onClick={onStartRename}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
            title="이름 변경"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

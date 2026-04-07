import { useState } from 'react'
import { ProjectTemplate } from '@/constants/project'
import type { ProjectTemplate as ProjectTemplateType } from '@/types/project'
import { useProjectStore } from '@/stores/useProjectStore'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { log } from '@/utils/logger'
import { validateProjectName, validateProjectDescription } from '@/utils/validation'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

export function NewProjectModal({ isOpen, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateType>(ProjectTemplate.BLANK)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { createProject, isLoading } = useProjectStore()

  if (!isOpen) return null

  const handleCreate = async () => {
    // Validate and sanitize project name
    const nameValidation = validateProjectName(name)
    if (!nameValidation.success) {
      setValidationError(nameValidation.error || 'Invalid project name')
      return
    }

    // Validate and sanitize description
    const descValidation = validateProjectDescription(description)
    if (!descValidation.success) {
      setValidationError(descValidation.error || 'Invalid description')
      return
    }

    setValidationError(null)

    try {
      await createProject({
        name: nameValidation.data!,
        description: descValidation.data || undefined,
        template: selectedTemplate,
      })

      // 성공 시 모달 닫고 초기화
      setName('')
      setDescription('')
      setSelectedTemplate(ProjectTemplate.BLANK)
      setValidationError(null)
      onCreated?.()
      onClose()
    } catch (error) {
      log.error('NewProjectModal', 'Failed to create project', error)
      setValidationError('프로젝트 생성 실패')
    }
  }

  const templates = [
    {
      value: ProjectTemplate.BLANK,
      label: '빈 프로젝트',
      description: '아무 블록도 없는 빈 워크스페이스',
      icon: '📄',
    },
    {
      value: ProjectTemplate.BASIC_FLIGHT,
      label: '기본 비행',
      description: '이륙 → 이동 → 착륙 예제',
      icon: '🚁',
    },
    {
      value: ProjectTemplate.REPEAT_EXAMPLE,
      label: '반복 실행',
      description: '속도 설정 후 이동과 대기를 반복하는 시작 템플릿',
      icon: '🔁',
    },
    {
      value: ProjectTemplate.COORDINATE_EXAMPLE,
      label: '좌표 이동',
      description: '개별 드론을 서로 다른 좌표로 이동시키는 시작 템플릿',
      icon: '🎯',
    },
  ]

  return (
    <div className="fixed inset-0 bg-[var(--modal-overlay)] flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">새 프로젝트 만들기</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Validation Error */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          )}

          {/* Project Name */}
          <Input
            label="프로젝트 이름"
            type="text"
            placeholder="나의 드론 프로젝트"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setValidationError(null)
            }}
            disabled={isLoading}
            helperText="영문, 한글, 숫자, 공백, 하이픈, 언더스코어만 사용 가능 (최대 100자)"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 (선택사항)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요 (최대 500자)"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setValidationError(null)
              }}
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              템플릿 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.value}
                  onClick={() => setSelectedTemplate(template.value)}
                  disabled={isLoading}
                  className={`p-4 rounded-lg border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedTemplate === template.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1">
                        {template.label}
                      </div>
                      <div className="text-xs text-gray-600">
                        {template.description}
                      </div>
                    </div>
                    {selectedTemplate === template.value && (
                      <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? '생성 중...' : '프로젝트 생성'}
          </Button>
        </div>
      </div>
    </div>
  )
}

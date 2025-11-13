/**
 * Navigation Panel Component
 *
 * Left sidebar navigation with:
 * - Quick action buttons (Project, Settings, Monitoring)
 * - Blockly block categories
 */

import { useState } from 'react'

export interface Category {
  id: string
  name: string
  icon: string
  colour: string
}

export const blockCategories: Category[] = [
  { id: 'basic', name: '기본 제어', icon: '🎮', colour: '230' },
  { id: 'formation', name: '대형 제어', icon: '📐', colour: '160' },
  { id: 'individual', name: '개별 제어', icon: '🎯', colour: '290' },
  { id: 'control_flow', name: '제어 흐름', icon: '🔄', colour: '210' },
  { id: 'variables', name: '변수 & 수식', icon: '🔢', colour: '330' },
  { id: 'functions', name: '함수', icon: '⚙️', colour: '290' },
  { id: 'sensors', name: '센서', icon: '📡', colour: '120' },
  { id: 'logic', name: '논리', icon: '🧠', colour: '210' },
  { id: 'sync', name: '동기화', icon: '⏱️', colour: '120' },
]

interface NavigationPanelProps {
  className?: string
  selectedCategory: string
  onCategorySelect: (categoryId: string) => void
  onOpenProject: () => void
  onOpenSettings: () => void
  onOpenMonitoring: () => void
  isConnected: boolean
}

export function NavigationPanel({
  className = '',
  selectedCategory,
  onCategorySelect,
  onOpenProject,
  onOpenSettings,
  onOpenMonitoring,
  isConnected,
}: NavigationPanelProps) {
  return (
    <div className={`flex flex-col bg-gray-50 border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">메뉴</h2>
      </div>

      {/* Quick Actions */}
      <div className="px-2 py-3 border-b border-gray-200 space-y-1 flex-shrink-0">
        <button
          onClick={onOpenProject}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="프로젝트"
        >
          <span className="text-lg">📦</span>
          <span className="font-medium">프로젝트</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="설정"
        >
          <span className="text-lg">⚙️</span>
          <span className="font-medium">설정</span>
        </button>

        {isConnected && (
          <button
            onClick={onOpenMonitoring}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="모니터링"
          >
            <span className="text-lg">📊</span>
            <span className="font-medium">모니터링</span>
          </button>
        )}
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            블록 카테고리
          </h3>
          <div className="space-y-1">
            {blockCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-900 font-semibold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={category.name}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-left flex-1">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          {isConnected ? (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>연결됨</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>연결 안 됨</span>
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

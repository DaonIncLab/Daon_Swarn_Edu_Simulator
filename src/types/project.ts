/**
 * 프로젝트 저장/불러오기 타입 정의
 */

/**
 * 프로젝트 인터페이스
 */
export interface Project {
  /** 고유 ID (UUID) */
  id: string

  /** 프로젝트 이름 */
  name: string

  /** 프로젝트 설명 (옵션) */
  description?: string

  /** Blockly 워크스페이스 XML */
  workspaceXml: string

  /** 생성 시각 (ISO 8601 문자열) */
  createdAt: string

  /** 마지막 수정 시각 (ISO 8601 문자열) */
  updatedAt: string

  /** 썸네일 이미지 (base64 인코딩, 옵션) */
  thumbnail?: string

  /** 태그 (옵션) */
  tags?: string[]
}

/**
 * 프로젝트 메타데이터 (목록 표시용)
 */
export interface ProjectMetadata {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  thumbnail?: string
  tags?: string[]
  /** 블록 개수 (파싱 없이 대략적 추정) */
  blockCount?: number
}

/**
 * 프로젝트 생성 옵션
 */
export interface CreateProjectOptions {
  name: string
  description?: string
  template?: import('@/constants/project').ProjectTemplate
}

/**
 * Re-export types from constants
 */
export type { ProjectTemplate, StorageType } from '@/constants/project'

/**
 * 프로젝트 필터 옵션
 */
export interface ProjectFilterOptions {
  /** 검색어 */
  searchQuery?: string
  /** 태그 필터 */
  tags?: string[]
  /** 정렬 기준 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt'
  /** 정렬 방향 */
  sortDirection?: 'asc' | 'desc'
}

/**
 * 프로젝트 내보내기 데이터
 */
export interface ExportedProject extends Project {
  /** 내보내기 형식 버전 */
  exportVersion: string
  /** 내보낸 시각 */
  exportedAt: string
  /** 앱 버전 */
  appVersion?: string
}

/**
 * 자동 저장 설정
 */
export interface AutoSaveSettings {
  /** 자동 저장 활성화 여부 */
  enabled: boolean
  /** 자동 저장 간격 (밀리초) */
  interval: number
  /** 마지막 자동 저장 시각 */
  lastSaveTime?: string
}

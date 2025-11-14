/**
 * 프로젝트 저장소 메인 서비스
 * IndexedDB 우선, LocalStorage 폴백
 */

import type { Project, ProjectMetadata, ExportedProject, StorageType as StorageTypeType } from '@/types/project'
import { StorageType } from '@/constants/project'
import { IndexedDBAdapter, getIndexedDBAdapter } from './indexedDBAdapter'
import { LocalStorageAdapter, getLocalStorageAdapter } from './localStorageAdapter'

/**
 * 프로젝트 저장소 서비스
 */
export class ProjectStorage {
  private adapter: IndexedDBAdapter | LocalStorageAdapter
  private storageType: StorageTypeType

  constructor() {
    // IndexedDB 지원 여부 확인
    if (IndexedDBAdapter.isSupported()) {
      console.log('[ProjectStorage] Using IndexedDB')
      this.adapter = getIndexedDBAdapter()
      this.storageType = StorageType.INDEXED_DB
    } else if (LocalStorageAdapter.isSupported()) {
      console.log('[ProjectStorage] Falling back to LocalStorage')
      this.adapter = getLocalStorageAdapter()
      this.storageType = StorageType.LOCAL_STORAGE
    } else {
      throw new Error('No storage mechanism available')
    }
  }

  /**
   * 초기화
   */
  async initialize(): Promise<void> {
    if (this.adapter instanceof IndexedDBAdapter) {
      await this.adapter.initialize()
    }
  }

  /**
   * 사용 중인 저장소 타입 반환
   */
  getStorageType(): StorageTypeType {
    return this.storageType
  }

  /**
   * 프로젝트 저장
   */
  async saveProject(project: Project): Promise<void> {
    try {
      await this.adapter.saveProject(project)
    } catch (error) {
      console.error('[ProjectStorage] Save failed:', error)
      throw error
    }
  }

  /**
   * 프로젝트 로드
   */
  async loadProject(id: string): Promise<Project | null> {
    try {
      return await this.adapter.loadProject(id)
    } catch (error) {
      console.error('[ProjectStorage] Load failed:', error)
      throw error
    }
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(id: string): Promise<void> {
    try {
      await this.adapter.deleteProject(id)
    } catch (error) {
      console.error('[ProjectStorage] Delete failed:', error)
      throw error
    }
  }

  /**
   * 프로젝트 목록 조회
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      return await this.adapter.listProjects()
    } catch (error) {
      console.error('[ProjectStorage] List failed:', error)
      throw error
    }
  }

  /**
   * 프로젝트 존재 여부 확인
   */
  async projectExists(id: string): Promise<boolean> {
    try {
      return await this.adapter.projectExists(id)
    } catch (error) {
      console.error('[ProjectStorage] Exists check failed:', error)
      return false
    }
  }

  /**
   * 프로젝트를 JSON 파일로 내보내기
   */
  async exportProjectToFile(id: string): Promise<void> {
    try {
      const project = await this.loadProject(id)

      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }

      const exportData: ExportedProject = {
        ...project,
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        appVersion: '0.0.0', // TODO: 실제 앱 버전으로 교체
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${this.sanitizeFileName(project.name)}.json`
      link.click()

      URL.revokeObjectURL(url)

      console.log(`[ProjectStorage] Project exported: ${project.name}`)
    } catch (error) {
      console.error('[ProjectStorage] Export failed:', error)
      throw error
    }
  }

  /**
   * JSON 파일에서 프로젝트 가져오기
   */
  async importProjectFromFile(file: File): Promise<Project> {
    try {
      const text = await this.readFileAsText(file)
      const imported = JSON.parse(text) as ExportedProject

      // 유효성 검사
      if (!imported.id || !imported.name || !imported.workspaceXml) {
        throw new Error('Invalid project file format')
      }

      // 새로운 ID 생성 (중복 방지)
      const newId = crypto.randomUUID()

      const project: Project = {
        id: newId,
        name: `${imported.name} (Imported)`,
        description: imported.description,
        workspaceXml: imported.workspaceXml,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: imported.thumbnail,
        tags: imported.tags,
      }

      await this.saveProject(project)

      console.log(`[ProjectStorage] Project imported: ${project.name}`)

      return project
    } catch (error) {
      console.error('[ProjectStorage] Import failed:', error)
      throw error instanceof Error ? error : new Error('Failed to import project')
    }
  }

  /**
   * 모든 프로젝트 삭제 (개발/테스트용)
   */
  async clearAll(): Promise<void> {
    try {
      await this.adapter.clearAll()
      console.log('[ProjectStorage] All projects cleared')
    } catch (error) {
      console.error('[ProjectStorage] Clear failed:', error)
      throw error
    }
  }

  /**
   * 파일 이름 정제 (안전하지 않은 문자 제거)
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9가-힣\s_-]/gi, '_')
  }

  /**
   * File을 텍스트로 읽기
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as text'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }
}

/**
 * 싱글톤 인스턴스
 */
let projectStorageInstance: ProjectStorage | null = null

/**
 * ProjectStorage 인스턴스 가져오기
 */
export function getProjectStorage(): ProjectStorage {
  if (!projectStorageInstance) {
    projectStorageInstance = new ProjectStorage()
  }
  return projectStorageInstance
}

/**
 * ProjectStorage 초기화 (앱 시작 시 호출)
 */
export async function initializeProjectStorage(): Promise<ProjectStorage> {
  const storage = getProjectStorage()
  await storage.initialize()
  return storage
}

/**
 * LocalStorage 저장소 어댑터 (IndexedDB 폴백용)
 */

import type { Project, ProjectMetadata } from '@/types/project'

const KEY_PREFIX = 'drone-swarm-project-'
const METADATA_KEY = 'drone-swarm-projects-metadata'
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB (LocalStorage 일반적 한계)

/**
 * LocalStorage 어댑터
 */
export class LocalStorageAdapter {
  /**
   * LocalStorage 지원 여부 확인
   */
  static isSupported(): boolean {
    try {
      const testKey = '__test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * 프로젝트 저장
   */
  async saveProject(project: Project): Promise<void> {
    try {
      const key = this.getProjectKey(project.id)
      const data = JSON.stringify(project)

      // 용량 체크
      const currentSize = this.estimateStorageSize()
      const projectSize = new Blob([data]).size

      if (currentSize + projectSize > MAX_STORAGE_SIZE) {
        throw new Error('Storage quota exceeded. Please delete some projects.')
      }

      // 프로젝트 저장
      localStorage.setItem(key, data)

      // 메타데이터 업데이트
      await this.updateMetadata(project)

      console.log(`[LocalStorageAdapter] Project saved: ${project.id}`)
    } catch (error) {
      console.error('[LocalStorageAdapter] Save failed:', error)
      throw error instanceof Error ? error : new Error('Failed to save project')
    }
  }

  /**
   * 프로젝트 로드
   */
  async loadProject(id: string): Promise<Project | null> {
    try {
      const key = this.getProjectKey(id)
      const data = localStorage.getItem(key)

      if (!data) {
        return null
      }

      const project = JSON.parse(data) as Project
      return project
    } catch (error) {
      console.error('[LocalStorageAdapter] Load failed:', error)
      throw new Error('Failed to load project')
    }
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(id: string): Promise<void> {
    try {
      const key = this.getProjectKey(id)
      localStorage.removeItem(key)

      // 메타데이터에서 제거
      await this.removeFromMetadata(id)

      console.log(`[LocalStorageAdapter] Project deleted: ${id}`)
    } catch (error) {
      console.error('[LocalStorageAdapter] Delete failed:', error)
      throw new Error('Failed to delete project')
    }
  }

  /**
   * 모든 프로젝트 메타데이터 목록 조회
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const metadataJson = localStorage.getItem(METADATA_KEY)

      if (!metadataJson) {
        // 메타데이터가 없으면 LocalStorage를 스캔하여 재구성
        return await this.rebuildMetadata()
      }

      const metadata = JSON.parse(metadataJson) as ProjectMetadata[]
      return metadata
    } catch (error) {
      console.error('[LocalStorageAdapter] List failed:', error)
      // 에러 발생 시 재구성 시도
      return await this.rebuildMetadata()
    }
  }

  /**
   * 프로젝트 존재 여부 확인
   */
  async projectExists(id: string): Promise<boolean> {
    const key = this.getProjectKey(id)
    return localStorage.getItem(key) !== null
  }

  /**
   * 모든 프로젝트 삭제 (개발/테스트용)
   */
  async clearAll(): Promise<void> {
    try {
      // 모든 프로젝트 키 찾기
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(KEY_PREFIX)) {
          keys.push(key)
        }
      }

      // 프로젝트 삭제
      keys.forEach(key => localStorage.removeItem(key))

      // 메타데이터 삭제
      localStorage.removeItem(METADATA_KEY)

      console.log('[LocalStorageAdapter] All projects cleared')
    } catch (error) {
      console.error('[LocalStorageAdapter] Clear failed:', error)
      throw new Error('Failed to clear projects')
    }
  }

  /**
   * 프로젝트 키 생성
   */
  private getProjectKey(id: string): string {
    return `${KEY_PREFIX}${id}`
  }

  /**
   * 메타데이터 업데이트
   */
  private async updateMetadata(project: Project): Promise<void> {
    const metadata = await this.listProjects()

    // 기존 메타데이터 찾기
    const index = metadata.findIndex(m => m.id === project.id)

    const newMetadata: ProjectMetadata = {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      thumbnail: project.thumbnail,
      tags: project.tags,
      blockCount: this.estimateBlockCount(project.workspaceXml),
    }

    if (index >= 0) {
      // 업데이트
      metadata[index] = newMetadata
    } else {
      // 추가
      metadata.push(newMetadata)
    }

    // 저장
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
  }

  /**
   * 메타데이터에서 제거
   */
  private async removeFromMetadata(id: string): Promise<void> {
    const metadata = await this.listProjects()
    const filtered = metadata.filter(m => m.id !== id)
    localStorage.setItem(METADATA_KEY, JSON.stringify(filtered))
  }

  /**
   * 메타데이터 재구성 (손상되었거나 없는 경우)
   */
  private async rebuildMetadata(): Promise<ProjectMetadata[]> {
    console.log('[LocalStorageAdapter] Rebuilding metadata...')

    const metadata: ProjectMetadata[] = []

    // LocalStorage 스캔
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key && key.startsWith(KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const project = JSON.parse(data) as Project

            metadata.push({
              id: project.id,
              name: project.name,
              description: project.description,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              thumbnail: project.thumbnail,
              tags: project.tags,
              blockCount: this.estimateBlockCount(project.workspaceXml),
            })
          }
        } catch (error) {
          console.error(`[LocalStorageAdapter] Failed to parse project from ${key}:`, error)
        }
      }
    }

    // 메타데이터 저장
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))

    return metadata
  }

  /**
   * 현재 사용 중인 저장 공간 추정
   */
  private estimateStorageSize(): number {
    let total = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(KEY_PREFIX)) {
        const value = localStorage.getItem(key)
        if (value) {
          total += new Blob([value]).size
        }
      }
    }

    return total
  }

  /**
   * XML 문자열에서 블록 개수 추정
   */
  private estimateBlockCount(xml: string): number {
    const matches = xml.match(/<block\s+type=/g)
    return matches ? matches.length : 0
  }
}

/**
 * 싱글톤 인스턴스
 */
let localStorageInstance: LocalStorageAdapter | null = null

/**
 * LocalStorage 어댑터 인스턴스 가져오기
 */
export function getLocalStorageAdapter(): LocalStorageAdapter {
  if (!localStorageInstance) {
    localStorageInstance = new LocalStorageAdapter()
  }
  return localStorageInstance
}

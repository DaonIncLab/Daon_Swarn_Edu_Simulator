/**
 * IndexedDB 저장소 어댑터
 */

import type { Project, ProjectMetadata } from '@/types/project'
import { log } from '@/utils/logger'

const DB_NAME = 'DroneSwarmGCS'
const DB_VERSION = 1
const STORE_NAME = 'projects'

/**
 * IndexedDB 어댑터
 */
export class IndexedDBAdapter {
  private db: IDBDatabase | null = null

  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return // 이미 초기화됨
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        log.error('Failed to open database', { error: request.error })
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        log.info('Database opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // projects 객체 저장소 생성
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

          // 인덱스 생성
          objectStore.createIndex('name', 'name', { unique: false })
          objectStore.createIndex('createdAt', 'createdAt', { unique: false })
          objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })

          log.info('Object store created with indexes')
        }
      }
    })
  }

  /**
   * IndexedDB 지원 여부 확인
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined'
  }

  /**
   * 프로젝트 저장
   */
  async saveProject(project: Project): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(project)

      request.onsuccess = () => {
        log.info('Project saved', { projectId: project.id })
        resolve()
      }

      request.onerror = () => {
        log.error('Save failed', { error: request.error })
        reject(new Error(`Failed to save project: ${request.error}`))
      }
    })
  }

  /**
   * 프로젝트 로드
   */
  async loadProject(id: string): Promise<Project | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const project = request.result as Project | undefined
        resolve(project || null)
      }

      request.onerror = () => {
        log.error('Load failed', { error: request.error })
        reject(new Error(`Failed to load project: ${request.error}`))
      }
    })
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(id: string): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        log.info('Project deleted', { id })
        resolve()
      }

      request.onerror = () => {
        log.error('Delete failed', { error: request.error })
        reject(new Error(`Failed to delete project: ${request.error}`))
      }
    })
  }

  /**
   * 모든 프로젝트 메타데이터 목록 조회
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const projects = request.result as Project[]

        // Project를 ProjectMetadata로 변환 (workspaceXml 제외)
        const metadata: ProjectMetadata[] = projects.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          thumbnail: project.thumbnail,
          tags: project.tags,
          blockCount: this.estimateBlockCount(project.workspaceXml),
        }))

        resolve(metadata)
      }

      request.onerror = () => {
        log.error('List failed', { error: request.error })
        reject(new Error(`Failed to list projects: ${request.error}`))
      }
    })
  }

  /**
   * 프로젝트 존재 여부 확인
   */
  async projectExists(id: string): Promise<boolean> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count(id)

      request.onsuccess = () => {
        resolve(request.result > 0)
      }

      request.onerror = () => {
        log.error('Exists check failed', { error: request.error })
        reject(new Error(`Failed to check if project exists: ${request.error}`))
      }
    })
  }

  /**
   * 모든 프로젝트 삭제 (개발/테스트용)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        log.info('All projects cleared')
        resolve()
      }

      request.onerror = () => {
        log.error('Clear failed', { error: request.error })
        reject(new Error(`Failed to clear projects: ${request.error}`))
      }
    })
  }

  /**
   * 데이터베이스 닫기
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      log.info('Database closed')
    }
  }

  /**
   * 초기화 확인
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }
  }

  /**
   * XML 문자열에서 블록 개수 추정
   */
  private estimateBlockCount(xml: string): number {
    // <block type="..."> 태그 개수를 세어 블록 개수 추정
    const matches = xml.match(/<block\s+type=/g)
    return matches ? matches.length : 0
  }
}

/**
 * 싱글톤 인스턴스
 */
let indexedDBInstance: IndexedDBAdapter | null = null

/**
 * IndexedDB 어댑터 인스턴스 가져오기
 */
export function getIndexedDBAdapter(): IndexedDBAdapter {
  if (!indexedDBInstance) {
    indexedDBInstance = new IndexedDBAdapter()
  }
  return indexedDBInstance
}

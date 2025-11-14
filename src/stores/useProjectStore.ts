/**
 * 프로젝트 관리 스토어
 */

import { create } from 'zustand'
import type { Project, ProjectMetadata, CreateProjectOptions } from '@/types/project'
import { getProjectStorage } from '@/services/storage'
import { workspaceToXml, xmlToWorkspace, createEmptyWorkspaceXml, getTemplateXml } from '@/utils/blocklyXml'
import { useBlocklyStore } from './useBlocklyStore'

/**
 * 프로젝트 스토어 상태
 */
interface ProjectStore {
  // State
  currentProject: Project | null
  projects: ProjectMetadata[]
  isLoading: boolean
  error: string | null

  // Actions
  createProject: (options: CreateProjectOptions) => Promise<void>
  saveCurrentProject: (name?: string) => Promise<void>
  loadProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, newName: string) => Promise<void>
  exportProjectToFile: (id: string) => Promise<void>
  importProjectFromFile: (file: File) => Promise<void>
  refreshProjectList: () => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,

  /**
   * 새 프로젝트 생성
   */
  createProject: async (options: CreateProjectOptions) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()

      // 템플릿 XML 가져오기
      const workspaceXml = options.template
        ? getTemplateXml(options.template)
        : createEmptyWorkspaceXml()

      // 프로젝트 생성
      const project: Project = {
        id: crypto.randomUUID(),
        name: options.name,
        description: options.description,
        workspaceXml,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 저장
      await storage.saveProject(project)

      // 현재 프로젝트로 설정
      set({ currentProject: project })

      // Blockly 워크스페이스에 로드
      const workspace = useBlocklyStore.getState().workspace
      if (workspace) {
        xmlToWorkspace(workspaceXml, workspace)
      }

      // 프로젝트 목록 새로고침
      await get().refreshProjectList()

      console.log(`[ProjectStore] Project created: ${project.name}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create project'
      console.error('[ProjectStore] Create project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 현재 프로젝트 저장
   */
  saveCurrentProject: async (name?: string) => {
    const { currentProject } = get()

    if (!currentProject) {
      set({ error: 'No project is currently open' })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()
      const workspace = useBlocklyStore.getState().workspace

      if (!workspace) {
        throw new Error('Blockly workspace not initialized')
      }

      // 워크스페이스에서 XML 추출
      const workspaceXml = workspaceToXml(workspace)

      // 프로젝트 업데이트
      const updatedProject: Project = {
        ...currentProject,
        name: name || currentProject.name,
        workspaceXml,
        updatedAt: new Date().toISOString(),
      }

      // 저장
      await storage.saveProject(updatedProject)

      // 상태 업데이트
      set({ currentProject: updatedProject })

      // Blockly 저장 플래그 리셋
      useBlocklyStore.getState().setHasUnsavedChanges(false)

      // 프로젝트 목록 새로고침
      await get().refreshProjectList()

      console.log(`[ProjectStore] Project saved: ${updatedProject.name}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save project'
      console.error('[ProjectStore] Save project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 로드
   */
  loadProject: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()

      // 프로젝트 로드
      const project = await storage.loadProject(id)

      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }

      // Blockly 워크스페이스에 로드
      const workspace = useBlocklyStore.getState().workspace

      if (!workspace) {
        throw new Error('Blockly workspace not initialized')
      }

      xmlToWorkspace(project.workspaceXml, workspace)

      // 현재 프로젝트로 설정
      set({ currentProject: project })

      // 저장 플래그 리셋
      useBlocklyStore.getState().setHasUnsavedChanges(false)

      console.log(`[ProjectStore] Project loaded: ${project.name}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load project'
      console.error('[ProjectStore] Load project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 삭제
   */
  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()

      // 삭제
      await storage.deleteProject(id)

      // 현재 프로젝트였다면 초기화
      const { currentProject } = get()
      if (currentProject?.id === id) {
        set({ currentProject: null })

        // 워크스페이스 초기화
        const workspace = useBlocklyStore.getState().workspace
        if (workspace) {
          workspace.clear()
        }
      }

      // 프로젝트 목록 새로고침
      await get().refreshProjectList()

      console.log(`[ProjectStore] Project deleted: ${id}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete project'
      console.error('[ProjectStore] Delete project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 이름 변경
   */
  renameProject: async (id: string, newName: string) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()

      // 프로젝트 로드
      const project = await storage.loadProject(id)

      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }

      // 이름 변경
      const updatedProject: Project = {
        ...project,
        name: newName,
        updatedAt: new Date().toISOString(),
      }

      // 저장
      await storage.saveProject(updatedProject)

      // 현재 프로젝트라면 업데이트
      const { currentProject } = get()
      if (currentProject?.id === id) {
        set({ currentProject: updatedProject })
      }

      // 프로젝트 목록 새로고침
      await get().refreshProjectList()

      console.log(`[ProjectStore] Project renamed: ${newName}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to rename project'
      console.error('[ProjectStore] Rename project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 내보내기
   */
  exportProjectToFile: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()
      await storage.exportProjectToFile(id)

      console.log(`[ProjectStore] Project exported: ${id}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to export project'
      console.error('[ProjectStore] Export project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 가져오기
   */
  importProjectFromFile: async (file: File) => {
    set({ isLoading: true, error: null })

    try {
      const storage = getProjectStorage()

      // 파일에서 프로젝트 가져오기
      const project = await storage.importProjectFromFile(file)

      // 프로젝트 목록 새로고침
      await get().refreshProjectList()

      console.log(`[ProjectStore] Project imported: ${project.name}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import project'
      console.error('[ProjectStore] Import project failed:', error)
      set({ error: errorMsg })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * 프로젝트 목록 새로고침
   */
  refreshProjectList: async () => {
    try {
      const storage = getProjectStorage()
      const projects = await storage.listProjects()

      // 최신 수정일 기준 내림차순 정렬
      projects.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      set({ projects })
    } catch (error) {
      console.error('[ProjectStore] Refresh project list failed:', error)
      set({ error: 'Failed to load project list' })
    }
  },

  /**
   * 현재 프로젝트 설정
   */
  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project })
  },

  /**
   * 에러 초기화
   */
  clearError: () => {
    set({ error: null })
  },
}))

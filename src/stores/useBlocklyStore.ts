import { create } from 'zustand'
import * as Blockly from 'blockly'
import type { Command } from '@/types/websocket'
import type { ExecutableNode } from '@/types/execution'

/**
 * Blockly 워크스페이스 상태 관리 스토어
 */
interface BlocklyStore {
  // State
  workspace: Blockly.WorkspaceSvg | null
  generatedCommands: Command[]
  hasUnsavedChanges: boolean

  // Caching fields
  parsedTree: ExecutableNode | null
  workspaceHash: string | null

  // Actions
  setWorkspace: (workspace: Blockly.WorkspaceSvg | null) => void
  setGeneratedCommands: (commands: Command[]) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void
  clearWorkspace: () => void

  // Cache methods
  invalidateCache: () => void
  getParsedTree: () => ExecutableNode | null
  getWorkspaceHash: () => string | null
  setCachedParsedTree: (tree: ExecutableNode | null, hash: string | null) => void
}

export const useBlocklyStore = create<BlocklyStore>((set, get) => ({
  // Initial state
  workspace: null,
  generatedCommands: [],
  hasUnsavedChanges: false,
  parsedTree: null,
  workspaceHash: null,

  // Actions
  setWorkspace: (workspace) => set({ workspace }),

  setGeneratedCommands: (commands) => set({ generatedCommands: commands }),

  setHasUnsavedChanges: (hasChanges) => {
    set({ hasUnsavedChanges: hasChanges })
    // Invalidate cache when workspace changes
    if (hasChanges) {
      get().invalidateCache()
    }
  },

  clearWorkspace: () => {
    const { workspace } = get()
    if (workspace) {
      workspace.clear()
      set({ generatedCommands: [], hasUnsavedChanges: false, parsedTree: null, workspaceHash: null })
    }
  },

  // Cache methods
  invalidateCache: () => {
    set({ parsedTree: null, workspaceHash: null })
  },

  getParsedTree: () => {
    return get().parsedTree
  },

  getWorkspaceHash: () => {
    return get().workspaceHash
  },

  setCachedParsedTree: (tree, hash) => {
    set({ parsedTree: tree, workspaceHash: hash })
  },
}))

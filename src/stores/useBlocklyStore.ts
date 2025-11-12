import { create } from 'zustand'
import * as Blockly from 'blockly'
import type { Command } from '@/types/websocket'

/**
 * Blockly 워크스페이스 상태 관리 스토어
 */
interface BlocklyStore {
  // State
  workspace: Blockly.WorkspaceSvg | null
  generatedCommands: Command[]
  hasUnsavedChanges: boolean

  // Actions
  setWorkspace: (workspace: Blockly.WorkspaceSvg | null) => void
  setGeneratedCommands: (commands: Command[]) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void
  clearWorkspace: () => void
}

export const useBlocklyStore = create<BlocklyStore>((set, get) => ({
  // Initial state
  workspace: null,
  generatedCommands: [],
  hasUnsavedChanges: false,

  // Actions
  setWorkspace: (workspace) => set({ workspace }),

  setGeneratedCommands: (commands) => set({ generatedCommands: commands }),

  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  clearWorkspace: () => {
    const { workspace } = get()
    if (workspace) {
      workspace.clear()
      set({ generatedCommands: [], hasUnsavedChanges: false })
    }
  },
}))

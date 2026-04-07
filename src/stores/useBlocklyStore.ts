import { create } from "zustand";
import * as Blockly from "blockly";
import type { ScenarioPlan } from "@/types/execution";

interface BlocklyStore {
  workspace: Blockly.WorkspaceSvg | null;
  scenarioPlan: ScenarioPlan | null;
  hasUnsavedChanges: boolean;
  workspaceHash: string | null;

  setWorkspace: (workspace: Blockly.WorkspaceSvg | null) => void;
  setScenarioPlan: (plan: ScenarioPlan | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  clearWorkspace: () => void;

  invalidateScenarioCache: () => void;
  getScenarioPlan: () => ScenarioPlan | null;
  getWorkspaceHash: () => string | null;
  setCachedScenarioPlan: (plan: ScenarioPlan | null, hash: string | null) => void;
}

export const useBlocklyStore = create<BlocklyStore>((set, get) => ({
  workspace: null,
  scenarioPlan: null,
  hasUnsavedChanges: false,
  workspaceHash: null,

  setWorkspace: (workspace) => set({ workspace }),

  setScenarioPlan: (scenarioPlan) => set({ scenarioPlan }),

  setHasUnsavedChanges: (hasChanges) => {
    set({ hasUnsavedChanges: hasChanges });
    if (hasChanges) {
      get().invalidateScenarioCache();
    }
  },

  clearWorkspace: () => {
    const { workspace } = get();
    if (workspace) {
      workspace.clear();
      set({
        hasUnsavedChanges: false,
        scenarioPlan: null,
        workspaceHash: null,
      });
    }
  },

  invalidateScenarioCache: () => {
    set({ scenarioPlan: null, workspaceHash: null });
  },

  getScenarioPlan: () => get().scenarioPlan,

  getWorkspaceHash: () => get().workspaceHash,

  setCachedScenarioPlan: (scenarioPlan, workspaceHash) => {
    set({ scenarioPlan, workspaceHash });
  },
}));

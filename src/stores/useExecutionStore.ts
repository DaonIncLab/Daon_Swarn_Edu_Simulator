import { create } from "zustand";
import type { Command, WSMessage, DroneState } from "@/types/websocket";
import { CommandAction, MessageType } from "@/constants/commands";
import { wsService } from "@/services/websocket";
import { useBlocklyStore } from "./useBlocklyStore";
import { useTelemetryStore } from "./useTelemetryStore";
import { Interpreter } from "@/services/execution";
import { parseBlocklyWorkspace } from "@/services/execution";
import { getConnectionManager } from "@/services/connection/ConnectionManager";
import type {
  ExecutableNode,
  ExecutionState,
  ScenarioPlan,
  ScenarioSummary,
} from "@/types/execution";
import * as Blockly from "blockly";
import { log } from "@/utils/logger";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function summarizeScenarioPlan(plan: ScenarioPlan | null): ScenarioSummary {
  if (!plan) {
    return { totalNodes: 0, commandNodes: 0, maxDepth: 0 };
  }

  const walk = (
    node: ExecutableNode,
    depth: number,
  ): { total: number; command: number; depth: number } => {
    let total = 1;
    let command = node.type === "command" || node.type === "wait" ? 1 : 0;
    let maxDepth = depth;

    if (node.type === "sequence") {
      for (const child of node.children) {
        const nested = walk(child, depth + 1);
        total += nested.total;
        command += nested.command;
        maxDepth = Math.max(maxDepth, nested.depth);
      }
    }

    if (
      node.type === "repeat" ||
      node.type === "for_loop" ||
      node.type === "while_loop" ||
      node.type === "until_loop"
    ) {
      const nested = walk(node.body, depth + 1);
      total += nested.total;
      command += nested.command;
      maxDepth = Math.max(maxDepth, nested.depth);
    }

    if (node.type === "if") {
      const nested = walk(node.thenBranch, depth + 1);
      total += nested.total;
      command += nested.command;
      maxDepth = Math.max(maxDepth, nested.depth);
    }

    if (node.type === "if_else") {
      const thenNested = walk(node.thenBranch, depth + 1);
      const elseNested = walk(node.elseBranch, depth + 1);
      total += thenNested.total + elseNested.total;
      command += thenNested.command + elseNested.command;
      maxDepth = Math.max(maxDepth, thenNested.depth, elseNested.depth);
    }

    if (node.type === "function_def") {
      const nested = walk(node.body, depth + 1);
      total += nested.total;
      command += nested.command;
      maxDepth = Math.max(maxDepth, nested.depth);
    }

    if (node.type === "scenario_config") {
      maxDepth = Math.max(maxDepth, depth);
    }

    return { total, command, depth: maxDepth };
  };

  const result = walk(plan, 1);
  return {
    totalNodes: result.total,
    commandNodes: result.command,
    maxDepth: result.depth,
  };
}

function withScenarioSpeed(command: Command, speed: number): Command {
  if (
    command.action !== CommandAction.MOVE_DRONE &&
    command.action !== CommandAction.MOVE_DIRECTION &&
    command.action !== CommandAction.MOVE_DIRECTION_ALL
  ) {
    return command;
  }

  if (typeof command.params.speed === "number") {
    return command;
  }

  return {
    ...command,
    params: {
      ...command.params,
      speed,
    },
  };
}

function extractRawCommands(plan: ScenarioPlan | null): Command[] {
  if (!plan) {
    return [];
  }

  const commands: Command[] = [];
  const context = { speed: 2 };

  const visit = (node: ExecutableNode) => {
    if (node.type === "command") {
      commands.push(withScenarioSpeed(node.command, context.speed));
      return;
    }

    if (node.type === "scenario_config") {
      context.speed = node.config.speed ?? context.speed;
      return;
    }

    if (node.type === "wait") {
      commands.push({
        action: CommandAction.WAIT,
        params: { duration: node.duration },
      });
      return;
    }

    if (node.type === "scenario_config") {
      if (typeof node.config.speed === "number") {
        context.speed = node.config.speed;
      }
      return;
    }

    if (node.type === "sequence") {
      node.children.forEach(visit);
      return;
    }

    if (
      node.type === "repeat" ||
      node.type === "for_loop" ||
      node.type === "while_loop" ||
      node.type === "until_loop"
    ) {
      visit(node.body);
      return;
    }

    if (node.type === "if") {
      visit(node.thenBranch);
      return;
    }

    if (node.type === "if_else") {
      visit(node.thenBranch);
      visit(node.elseBranch);
      return;
    }

    if (node.type === "function_def") {
      visit(node.body);
    }
  };

  visit(plan);
  return commands;
}

export const ExecutionStatus = {
  IDLE: "idle",
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ExecutionStatus =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

interface ExecutionStore {
  status: ExecutionStatus;
  commands: Command[];
  scenarioPlan: ScenarioPlan | null;
  scenarioSummary: ScenarioSummary;
  currentCommandIndex: number;
  currentNodeId: string | null;
  currentNodePath: number[];
  error: string | null;
  drones: DroneState[];
  interpreter: Interpreter | null;

  setCommands: (commands: Command[]) => void;
  setScenarioPlan: (plan: ScenarioPlan | null) => void;
  executeScript: () => Promise<void>;
  stopExecution: () => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  reset: () => void;
  handleMessage: (message: WSMessage) => void;
  updateExecutionState: (state: ExecutionState) => void;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => {
  wsService.setMessageListener((message) => {
    get().handleMessage(message);
  });

  return {
    status: ExecutionStatus.IDLE,
    commands: [],
    scenarioPlan: null,
    scenarioSummary: { totalNodes: 0, commandNodes: 0, maxDepth: 0 },
    currentCommandIndex: -1,
    currentNodeId: null,
    currentNodePath: [],
    error: null,
    drones: [],
    interpreter: null,

    setCommands: (commands) => set({ commands }),

    setScenarioPlan: (scenarioPlan) => {
      set({
        scenarioPlan,
        scenarioSummary: summarizeScenarioPlan(scenarioPlan),
        commands: extractRawCommands(scenarioPlan),
      });
    },

    executeScript: async () => {
      const blocklyStore = useBlocklyStore.getState();
      const workspace = blocklyStore.workspace;

      if (!workspace) {
        set({ error: "Blockly workspace not initialized" });
        return;
      }

      const workspaceXml = Blockly.Xml.domToText(
        Blockly.Xml.workspaceToDom(workspace),
      );
      const currentHash = simpleHash(workspaceXml);

      let scenarioPlan: ScenarioPlan | null = null;
      const cachedHash = blocklyStore.getWorkspaceHash();
      const cachedPlan = blocklyStore.getScenarioPlan();

      if (cachedHash === currentHash && cachedPlan) {
        log.debug("ExecutionStore", "Using cached scenario plan");
        scenarioPlan = cachedPlan;
      } else {
        log.debug("ExecutionStore", "Parsing workspace scenario plan");
        scenarioPlan = parseBlocklyWorkspace(workspace);
        if (!scenarioPlan) {
          set({ error: "No blocks to execute" });
          return;
        }
        blocklyStore.setCachedScenarioPlan(scenarioPlan, currentHash);
      }

      if (!scenarioPlan) {
        set({ error: "No blocks to execute" });
        return;
      }

      get().setScenarioPlan(scenarioPlan);

      const connectionManager = getConnectionManager();
      const connectionService = connectionManager.getCurrentService();

      if (!connectionService) {
        set({ error: "Not connected to any service" });
        return;
      }

      const interpreter = new Interpreter(connectionService);
      interpreter.setStateListener((state) => {
        get().updateExecutionState(state);
      });
      interpreter.updateDroneStates(get().drones);

      set({
        interpreter,
        status: ExecutionStatus.RUNNING,
        error: null,
        currentCommandIndex: -1,
        currentNodeId: null,
        currentNodePath: [],
      });

      try {
        const result = await interpreter.execute(scenarioPlan);

        if (result.success) {
          set({ status: ExecutionStatus.COMPLETED });
        } else {
          set({
            status: ExecutionStatus.ERROR,
            error: result.error || "Execution failed",
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        log.error("ExecutionStore", "Execution error:", error);
        set({
          status: ExecutionStatus.ERROR,
          error: errorMsg,
        });
      }
    },

    stopExecution: () => {
      const { interpreter } = get();
      if (interpreter) {
        interpreter.stop();
      }
      set({
        status: ExecutionStatus.IDLE,
        currentCommandIndex: -1,
        currentNodeId: null,
        currentNodePath: [],
      });
    },

    pauseExecution: () => {
      const { interpreter } = get();
      if (interpreter) {
        interpreter.pause();
      }
    },

    resumeExecution: () => {
      const { interpreter } = get();
      if (interpreter) {
        interpreter.resume();
      }
    },

    reset: () => {
      set({
        status: ExecutionStatus.IDLE,
        commands: [],
        scenarioPlan: null,
        scenarioSummary: { totalNodes: 0, commandNodes: 0, maxDepth: 0 },
        currentCommandIndex: -1,
        currentNodeId: null,
        currentNodePath: [],
        error: null,
        drones: [],
        interpreter: null,
      });
    },

    updateExecutionState: (state) => {
      set({
        currentNodeId: state.currentNodeId,
        currentNodePath: state.currentNodePath,
      });

      if (state.status === "running") {
        set({ status: ExecutionStatus.RUNNING });
      } else if (state.status === "completed") {
        set({ status: ExecutionStatus.COMPLETED });
      } else if (state.status === "error") {
        set({
          status: ExecutionStatus.ERROR,
          error: state.error || "Unknown error",
        });
      }
    },

    handleMessage: (message) => {
      switch (message.type) {
        case MessageType.TELEMETRY: {
          const newDrones = message.drones;
          set({ drones: newDrones });

          const { interpreter } = get();
          if (interpreter) {
            interpreter.updateDroneStates(newDrones);
          }

          useTelemetryStore.getState().addTelemetryData(newDrones);
          break;
        }

        case MessageType.COMMAND_FINISH:
          break;

        case MessageType.ERROR:
          log.error("ExecutionStore", "Server error:", message.error);
          break;

        case MessageType.ACK:
          break;

        default:
          log.warn("ExecutionStore", "Unknown message type:", message);
      }
    },
  };
});

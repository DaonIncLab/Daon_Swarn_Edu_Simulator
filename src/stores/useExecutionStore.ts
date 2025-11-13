import { create } from 'zustand'
import type { Command, WSMessage, DroneState } from '@/types/websocket'
import { MessageType } from '@/constants/commands'
import { wsService } from '@/services/websocket'
import { useConnectionStore } from './useConnectionStore'
import { useBlocklyStore } from './useBlocklyStore'
import { useTelemetryStore } from './useTelemetryStore'
import { Interpreter } from '@/services/execution'
import { parseBlocklyWorkspace } from '@/services/execution'
import { getConnectionManager } from '@/services/connection/ConnectionManager'
import type { ExecutionState } from '@/types/execution'

/**
 * 스크립트 실행 상태
 */
export const ExecutionStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const

export type ExecutionStatus = typeof ExecutionStatus[keyof typeof ExecutionStatus]

/**
 * 스크립트 실행 상태 관리 스토어
 */
interface ExecutionStore {
  // State
  status: ExecutionStatus
  commands: Command[]
  currentCommandIndex: number
  currentNodeId: string | null
  currentNodePath: number[]
  error: string | null
  drones: DroneState[]
  interpreter: Interpreter | null

  // Actions
  setCommands: (commands: Command[]) => void
  executeScript: () => Promise<void>
  stopExecution: () => void
  pauseExecution: () => void
  resumeExecution: () => void
  reset: () => void
  handleMessage: (message: WSMessage) => void
  updateExecutionState: (state: ExecutionState) => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => {
  // WebSocket 메시지 리스너 등록
  wsService.setMessageListener((message) => {
    get().handleMessage(message)
  })

  return {
    // Initial state
    status: ExecutionStatus.IDLE,
    commands: [],
    currentCommandIndex: -1,
    currentNodeId: null,
    currentNodePath: [],
    error: null,
    drones: [],
    interpreter: null,

    // Actions
    setCommands: (commands) => set({ commands }),

    /**
     * 스크립트 실행 (Interpreter 사용)
     */
    executeScript: async () => {
      const workspace = useBlocklyStore.getState().workspace

      if (!workspace) {
        set({ error: 'Blockly workspace not initialized' })
        return
      }

      // Blockly 워크스페이스를 실행 트리로 파싱
      const executionTree = parseBlocklyWorkspace(workspace)

      if (!executionTree) {
        set({ error: 'No blocks to execute' })
        return
      }

      console.log('[ExecutionStore] Parsed execution tree:', executionTree)

      // ConnectionManager에서 현재 연결 서비스 가져오기
      const connectionManager = getConnectionManager()
      const connectionService = (connectionManager as any).currentService

      if (!connectionService) {
        set({ error: 'Not connected to any service' })
        return
      }

      // Interpreter 생성
      const interpreter = new Interpreter(connectionService)

      // 상태 업데이트 리스너 등록
      interpreter.setStateListener((state) => {
        get().updateExecutionState(state)
      })

      // 드론 상태를 인터프리터에 전달
      interpreter.updateDroneStates(get().drones)

      // 인터프리터 저장
      set({ interpreter })

      // 실행 시작
      set({
        status: ExecutionStatus.RUNNING,
        error: null,
        currentCommandIndex: 0,
        currentNodeId: null,
        currentNodePath: [],
      })

      try {
        const result = await interpreter.execute(executionTree)

        if (result.success) {
          console.log(`[ExecutionStore] Execution completed. Executed ${result.executedNodes} nodes.`)
          set({ status: ExecutionStatus.COMPLETED })
        } else {
          console.error(`[ExecutionStore] Execution failed: ${result.error}`)
          set({
            status: ExecutionStatus.ERROR,
            error: result.error || 'Execution failed',
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ExecutionStore] Execution error:', error)
        set({
          status: ExecutionStatus.ERROR,
          error: errorMsg,
        })
      }
    },

    /**
     * 실행 중단
     */
    stopExecution: () => {
      const { interpreter } = get()
      if (interpreter) {
        interpreter.stop()
      }
      set({
        status: ExecutionStatus.IDLE,
        currentCommandIndex: -1,
        currentNodeId: null,
        currentNodePath: [],
      })
    },

    /**
     * 일시정지
     */
    pauseExecution: () => {
      const { interpreter } = get()
      if (interpreter) {
        interpreter.pause()
      }
    },

    /**
     * 재개
     */
    resumeExecution: () => {
      const { interpreter } = get()
      if (interpreter) {
        interpreter.resume()
      }
    },

    /**
     * 리셋
     */
    reset: () => {
      set({
        status: ExecutionStatus.IDLE,
        commands: [],
        currentCommandIndex: -1,
        currentNodeId: null,
        currentNodePath: [],
        error: null,
        drones: [],
        interpreter: null,
      })
    },

    /**
     * 실행 상태 업데이트 (Interpreter로부터)
     */
    updateExecutionState: (state: ExecutionState) => {
      console.log('[ExecutionStore] State update from interpreter:', state)

      set({
        currentNodeId: state.currentNodeId,
        currentNodePath: state.currentNodePath,
      })

      // 상태 매핑
      if (state.status === 'running') {
        set({ status: ExecutionStatus.RUNNING })
      } else if (state.status === 'completed') {
        set({ status: ExecutionStatus.COMPLETED })
      } else if (state.status === 'error') {
        set({
          status: ExecutionStatus.ERROR,
          error: state.error || 'Unknown error',
        })
      }
    },

    /**
     * WebSocket 메시지 핸들러
     */
    handleMessage: (message) => {
      switch (message.type) {
        case MessageType.TELEMETRY:
          const newDrones = message.drones
          set({ drones: newDrones })

          // 인터프리터에 드론 상태 업데이트
          const { interpreter } = get()
          if (interpreter) {
            interpreter.updateDroneStates(newDrones)
          }

          // TelemetryStore에 데이터 자동 기록
          useTelemetryStore.getState().addTelemetryData(newDrones)
          break

        case MessageType.COMMAND_FINISH:
          // 인터프리터가 명령 완료를 직접 처리하므로 여기서는 무시
          break

        case MessageType.ERROR:
          console.error('[ExecutionStore] Server error:', message.error)
          break

        case MessageType.ACK:
          // ACK received
          break

        default:
          console.warn('[ExecutionStore] Unknown message type:', message)
      }
    },
  }
})

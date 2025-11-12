import { create } from 'zustand'
import type { Command, WSMessage, DroneState } from '@/types/websocket'
import { MessageType } from '@/constants/commands'
import { wsService } from '@/services/websocket'
import { useConnectionStore } from './useConnectionStore'

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
  error: string | null
  drones: DroneState[]

  // Actions
  setCommands: (commands: Command[]) => void
  executeScript: () => void
  stopExecution: () => void
  reset: () => void
  handleMessage: (message: WSMessage) => void
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
    error: null,
    drones: [],

    // Actions
    setCommands: (commands) => set({ commands }),

    executeScript: () => {
      const { commands } = get()
      const isDummyMode = useConnectionStore.getState().isDummyMode

      if (commands.length === 0) {
        set({ error: 'No commands to execute' })
        return
      }

      // 더미 모드인 경우 시뮬레이션 실행
      if (isDummyMode) {
        set({
          status: ExecutionStatus.RUNNING,
          currentCommandIndex: 0,
          error: null,
        })

        // 각 명령을 순차적으로 시뮬레이션
        let currentIndex = 0
        const simulateCommand = () => {
          if (currentIndex >= commands.length) {
            set({ status: ExecutionStatus.COMPLETED })
            return
          }

          set({ currentCommandIndex: currentIndex })

          // 다음 명령으로 (1초 간격)
          setTimeout(() => {
            currentIndex++
            if (get().status === ExecutionStatus.RUNNING) {
              simulateCommand()
            }
          }, 1000)
        }

        simulateCommand()
        return
      }

      // 실제 Unity 연결 확인
      if (!wsService.isConnected()) {
        set({ error: 'Not connected to Unity' })
        return
      }

      // 실행 시작
      set({
        status: ExecutionStatus.RUNNING,
        currentCommandIndex: 0,
        error: null,
      })

      // Unity에 스크립트 전송
      const success = wsService.send({
        type: MessageType.EXECUTE_SCRIPT,
        commands,
        timestamp: Date.now(),
      })

      if (!success) {
        set({
          status: ExecutionStatus.ERROR,
          error: 'Failed to send script to Unity',
        })
      }
    },

    stopExecution: () => {
      set({
        status: ExecutionStatus.IDLE,
        currentCommandIndex: -1,
      })
    },

    reset: () => {
      set({
        status: ExecutionStatus.IDLE,
        commands: [],
        currentCommandIndex: -1,
        error: null,
        drones: [],
      })
    },

    handleMessage: (message) => {
      switch (message.type) {
        case MessageType.COMMAND_FINISH:
          set({
            currentCommandIndex: message.commandIndex,
          })

          // 모든 명령 완료 확인
          const { commands, currentCommandIndex } = get()
          if (currentCommandIndex >= commands.length - 1) {
            set({ status: ExecutionStatus.COMPLETED })
          }
          break

        case MessageType.ERROR:
          set({
            status: ExecutionStatus.ERROR,
            error: message.error,
            currentCommandIndex: message.commandIndex ?? -1,
          })
          break

        case MessageType.TELEMETRY:
          set({ drones: message.drones })
          break

        case MessageType.ACK:
          // ACK received
          break

        default:
          console.warn('Unknown message type:', message)
      }
    },
  }
})

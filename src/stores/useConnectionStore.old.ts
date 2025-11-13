import { create } from 'zustand'
import { ConnectionStatus, DEFAULT_WS_PORT } from '@/constants/connection'
import { wsService } from '@/services/websocket'

/**
 * WebSocket 연결 상태 관리 스토어
 */
interface ConnectionStore {
  // State
  status: ConnectionStatus
  ipAddress: string
  port: number
  error: string | null
  isDummyMode: boolean

  // Actions
  setIpAddress: (ip: string) => void
  setPort: (port: number) => void
  connect: () => void
  disconnect: () => void
  setStatus: (status: ConnectionStatus) => void
  setError: (error: string | null) => void
  clearError: () => void
  toggleDummyMode: () => void
  connectDummy: () => void
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  // Initial state
  status: ConnectionStatus.DISCONNECTED,
  ipAddress: '',
  port: DEFAULT_WS_PORT,
  error: null,
  isDummyMode: false,

  // Actions
  setIpAddress: (ip) => set({ ipAddress: ip }),

  setPort: (port) => set({ port }),

  connect: () => {
    const { ipAddress, port, isDummyMode } = get()

    // 더미 모드인 경우 바로 연결
    if (isDummyMode) {
      get().connectDummy()
      return
    }

    if (!ipAddress) {
      set({ error: 'Please enter IP address' })
      return
    }

    // WebSocket 서비스에 이벤트 리스너 등록
    wsService.setStatusChangeListener((status) => {
      set({ status })
    })

    wsService.setErrorListener((error) => {
      set({ error, status: ConnectionStatus.ERROR })
    })

    // 연결 시도
    set({ error: null, status: ConnectionStatus.CONNECTING })
    wsService.connect(ipAddress, port)
  },

  disconnect: () => {
    const { isDummyMode } = get()

    if (!isDummyMode) {
      wsService.disconnect()
    }

    set({ status: ConnectionStatus.DISCONNECTED, error: null })
  },

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  toggleDummyMode: () => {
    const { isDummyMode, status } = get()

    // 연결 중이면 토글 불가
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      set({ error: 'Disconnect first to change mode' })
      return
    }

    const newDummyMode = !isDummyMode
    set({ isDummyMode: newDummyMode, error: null })

    // 테스트 모드를 활성화하면 자동으로 연결
    if (newDummyMode) {
      setTimeout(() => {
        get().connectDummy()
      }, 100)
    }
  },

  connectDummy: () => {
    set({
      error: null,
      status: ConnectionStatus.CONNECTING,
      ipAddress: 'dummy-mode',
      port: 0
    })

    // 더미 연결 시뮬레이션 (1초 후 연결 성공)
    setTimeout(() => {
      // 연결 성공 상태로 변경
      set({
        status: ConnectionStatus.CONNECTED,
        error: null
      })
    }, 1000)
  },
}))

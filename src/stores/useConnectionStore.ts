/**
 * WebSocket 연결 상태 관리 스토어 (v2 - ConnectionManager 사용)
 */

import { create } from 'zustand'
import { ConnectionStatus, DEFAULT_WS_PORT } from '@/constants/connection'
import {
  getConnectionManager,
  ConnectionMode,
  type ConnectionConfig,
  type TelemetryData,
} from '@/services/connection'

/**
 * 연결 상태 관리 스토어
 */
interface ConnectionStore {
  // State
  status: ConnectionStatus
  mode: ConnectionMode
  ipAddress: string
  port: number
  error: string | null
  latestTelemetry: TelemetryData | null

  // Actions
  setMode: (mode: ConnectionMode) => void
  setIpAddress: (ip: string) => void
  setPort: (port: number) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  setStatus: (status: ConnectionStatus) => void
  setError: (error: string | null) => void
  clearError: () => void
  updateTelemetry: (data: TelemetryData) => void
}

export const useConnectionStore = create<ConnectionStore>((set, get) => {
  // ConnectionManager 인스턴스
  const manager = getConnectionManager()

  return {
    // Initial state
    status: ConnectionStatus.DISCONNECTED,
    mode: ConnectionMode.SIMULATION, // 기본값: 시뮬레이션 모드
    ipAddress: '',
    port: DEFAULT_WS_PORT,
    error: null,
    latestTelemetry: null,

    // Actions
    setMode: (mode) => set({ mode }),

    setIpAddress: (ip) => set({ ipAddress: ip }),

    setPort: (port) => set({ port }),

    connect: async () => {
      const { mode, ipAddress, port } = get()

      set({ error: null })

      try {
        // 이벤트 리스너 등록 (연결 전에)
        manager.setEventListeners({
          onStatusChange: (status) => {
            console.log('[Store] Status changed to:', status)
            set({ status })
          },
          onError: (error) => {
            console.log('[Store] Error:', error)
            set({ error, status: ConnectionStatus.ERROR })
          },
          onTelemetry: (data) => {
            set({ latestTelemetry: data })
          },
          onLog: (log) => {
            console.log('[Connection]', log)
          },
        })

        const config: ConnectionConfig = { mode }

        // 모드별 설정
        switch (mode) {
          case ConnectionMode.SIMULATION:
            if (!ipAddress) {
              set({ error: 'Please enter IP address' })
              return
            }
            config.websocket = { ipAddress, port }
            break

          case ConnectionMode.REAL_DRONE:
            // MAVLink 설정 (2차 목표)
            config.mavlink = {
              connectionType: 'udp',
              udpPort: 14550,
            }
            break

          case ConnectionMode.TEST:
            // 테스트 모드는 추가 설정 불필요
            break
        }

        // ConnectionManager를 통해 연결
        await manager.connect(config)

        console.log(`[Store] Connected in ${mode} mode`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Connection failed'
        set({ error: errorMsg, status: ConnectionStatus.ERROR })
      }
    },

    disconnect: async () => {
      try {
        await manager.disconnect()
        set({ status: ConnectionStatus.DISCONNECTED, error: null })
      } catch (error) {
        console.error('[Store] Disconnect error:', error)
      }
    },

    setStatus: (status) => set({ status }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    updateTelemetry: (data) => set({ latestTelemetry: data }),
  }
})

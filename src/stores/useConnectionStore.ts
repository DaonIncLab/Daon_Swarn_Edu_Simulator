/**
 * WebSocket 연결 상태 관리 스토어 (v2 - ConnectionManager 사용)
 */

import { create } from 'zustand'
import { ConnectionStatus } from '@/constants/connection'
import {
  getConnectionManager,
  ConnectionMode,
  type ConnectionConfig,
  type TelemetryData,
} from '@/services/connection'
import { FormationControlMode } from '@/services/connection/MAVLinkConnectionService'
import { wsService } from '@/services/websocket'
import { log } from '@/utils/logger'

/**
 * 연결 상태 관리 스토어
 */
interface ConnectionStore {
  // State
  status: ConnectionStatus
  mode: ConnectionMode
  error: string | null
  latestTelemetry: TelemetryData | null
  testModeDroneCount: number

  // Real MAVLink connection settings
  mavlinkTransportType: 'udp' | 'serial'
  mavlinkHost: string // UDP target host
  mavlinkPort: number // UDP target port
  mavlinkSerialDevice: string
  mavlinkBaudRate: number

  // Formation control settings
  formationMode: FormationControlMode

  // Actions
  setMode: (mode: ConnectionMode) => void
  setTestModeDroneCount: (count: number) => void
  setMavlinkTransportType: (type: 'udp' | 'serial') => void
  setMavlinkHost: (host: string) => void
  setMavlinkPort: (port: number) => void
  setMavlinkSerialDevice: (device: string) => void
  setMavlinkBaudRate: (baudRate: number) => void
  setFormationMode: (mode: FormationControlMode) => void
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
    mode: ConnectionMode.UNITY,
    error: null,
    latestTelemetry: null,
    testModeDroneCount: 4,

    // Real MAVLink connection initial state
    mavlinkTransportType: 'udp',
    mavlinkHost: 'localhost', // UDP target host
    mavlinkPort: 14550, // UDP target port
    mavlinkSerialDevice: 'COM3',
    mavlinkBaudRate: 57600,

    // Formation control initial state
    formationMode: FormationControlMode.GCS_COORDINATED, // 기본값: GCS 중앙제어

    // Actions
    setMode: (mode) => set({ mode }),

    setTestModeDroneCount: (count) => set({ testModeDroneCount: count }),

    setMavlinkTransportType: (type) => set({ mavlinkTransportType: type }),

    setMavlinkHost: (host) => set({ mavlinkHost: host }),

    setMavlinkPort: (port) => set({ mavlinkPort: port }),

    setMavlinkSerialDevice: (device) => set({ mavlinkSerialDevice: device }),

    setMavlinkBaudRate: (baudRate) => set({ mavlinkBaudRate: baudRate }),

    setFormationMode: (mode) => {
      set({ formationMode: mode })

      // Update the MAVLink service if connected
      const service = manager.getService()
      if (service && 'setFormationMode' in service) {
        // Type assertion since we know MAVLinkConnectionService has this method
        (service as any).setFormationMode(mode)
      }

      log.info('ConnectionStore', `Formation mode set to: ${mode}`)
    },

    connect: async () => {
      const {
        mode,
        testModeDroneCount,
        mavlinkTransportType,
        mavlinkHost,
        mavlinkPort,
        mavlinkSerialDevice,
        mavlinkBaudRate,
      } = get()

      set({ error: null })

      try {
        // 이벤트 리스너 등록 (연결 전에)
        manager.setEventListeners({
          onStatusChange: (status) => {
            log.debug('ConnectionStore', 'Status changed to:', status)
            set({ status })
          },
          onError: (error) => {
            log.error('ConnectionStore', 'Error:', error)
            set({ error, status: ConnectionStatus.ERROR })
          },
          onTelemetry: (data) => {
            set({ latestTelemetry: data })
          },
          onLog: (logMsg) => {
            log.info('Connection', logMsg)
          },
        })

        const config: ConnectionConfig = { mode }

        // 모드별 설정
        switch (mode) {
          case ConnectionMode.UNITY:
            // Unity WebGL 임베드 모드 - 설정 불필요
            break

          case ConnectionMode.MAVLINK:
            // MAVLink 실제 드론 연결
            config.mavlink = {
              transportType: mavlinkTransportType,
              host: mavlinkTransportType === 'udp' ? mavlinkHost : undefined,
              port: mavlinkTransportType === 'udp' ? mavlinkPort : undefined,
              device: mavlinkTransportType === 'serial' ? mavlinkSerialDevice : undefined,
              baudRate: mavlinkTransportType === 'serial' ? mavlinkBaudRate : undefined,
            }
            break

          case ConnectionMode.TEST:
            // 테스트 모드 설정 (드론 수)
            config.test = { droneCount: testModeDroneCount }
            break
        }

        // ConnectionManager를 통해 연결
        await manager.connect(config)

        // TestConnectionService에 message listener 설정 (WebSocket 메시지 형식으로)
        manager.setMessageListener((message) => {
          wsService.getMessageListener()?.(message)
        })

        log.info('ConnectionStore', `Connected in ${mode} mode`)
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
        log.error('ConnectionStore', 'Disconnect error:', error)
      }
    },

    setStatus: (status) => set({ status }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    updateTelemetry: (data) => set({ latestTelemetry: data }),
  }
})

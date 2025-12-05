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
  ipAddress: string
  port: number
  error: string | null
  latestTelemetry: TelemetryData | null
  testModeDroneCount: number
  mavlinkDroneCount: number // MAVLink 시뮬레이션 드론 수

  // Real MAVLink connection settings
  mavlinkTransportType: 'udp' | 'serial'
  mavlinkHost: string
  mavlinkPort: number
  mavlinkSerialDevice: string
  mavlinkBaudRate: number

  // Formation control settings
  formationMode: FormationControlMode

  // Actions
  setMode: (mode: ConnectionMode) => void
  setIpAddress: (ip: string) => void
  setPort: (port: number) => void
  setTestModeDroneCount: (count: number) => void
  setMavlinkDroneCount: (count: number) => void
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
    mode: ConnectionMode.UNITY_WEBGL, // 기본값: Unity WebGL 시뮬레이터
    ipAddress: '',
    port: DEFAULT_WS_PORT,
    error: null,
    latestTelemetry: null,
    testModeDroneCount: 4,
    mavlinkDroneCount: 4, // MAVLink 시뮬레이터 기본 드론 수

    // Real MAVLink connection initial state
    mavlinkTransportType: 'udp',
    mavlinkHost: 'localhost',
    mavlinkPort: 14550,
    mavlinkSerialDevice: 'COM3',
    mavlinkBaudRate: 57600,

    // Formation control initial state
    formationMode: FormationControlMode.GCS_COORDINATED, // 기본값: GCS 중앙제어

    // Actions
    setMode: (mode) => set({ mode }),

    setIpAddress: (ip) => set({ ipAddress: ip }),

    setPort: (port) => set({ port }),

    setTestModeDroneCount: (count) => set({ testModeDroneCount: count }),

    setMavlinkDroneCount: (count) => set({ mavlinkDroneCount: count }),

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
        ipAddress,
        port,
        testModeDroneCount,
        mavlinkDroneCount,
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
          case ConnectionMode.UNITY_WEBGL:
            // Unity WebGL 임베드 모드 - 설정 불필요
            break

          case ConnectionMode.SIMULATION:
            if (!ipAddress) {
              set({ error: 'Please enter IP address' })
              return
            }
            config.websocket = { ipAddress, port }
            break

          case ConnectionMode.MAVLINK_SIMULATION:
            // MAVLink 시뮬레이션 모드
            config.mavlink = {
              connectionType: 'simulation',
              droneCount: mavlinkDroneCount,
            }
            break

          case ConnectionMode.REAL_DRONE:
            // MAVLink 실제 드론 연결
            config.mavlink = {
              connectionType: mavlinkTransportType,
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

/**
 * Unity WebGL 임베드 연결 서비스
 * IConnectionService 인터페이스 구현
 *
 * Unity WebGL 빌드를 React에 임베드하여 직접 통신합니다.
 */

import { ConnectionStatus } from '@/constants/connection'
import type { Command } from '@/types/blockly'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  CommandResponse,
  TelemetryData,
  ReceivedMessage,
} from './types'
import type { UnityInitData, UnityBridge, UnityToReactMessage } from '@/types/unity'
import { log } from '@/utils/logger'

/**
 * Unity WebGL 연결 서비스
 *
 * ⚠️ 주의: 이 서비스는 Unity WebGL 빌드와 함께 사용해야 합니다.
 * Unity 빌드 파일은 public/unity/ 폴더에 배치되어야 합니다.
 */
export class UnityWebGLConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}
  private unityBridge: UnityBridge | null = null
  private messageListener: ((message: unknown) => void) | null = null
  private resolveConnection: (() => void) | null = null
  private rejectConnection: ((error: Error) => void) | null = null
  private droneCount: number = 0
  private isInitialized: boolean = false

  /**
   * Unity WebGL 브릿지 인스턴스 설정
   * (React Hook에서 생성된 브릿지를 주입받음)
   */
  setUnityBridge(bridge: UnityBridge): void {
    this.unityBridge = bridge

    // Bridge가 준비되면 Unity에 초기화 요청
    if (bridge.isReady && this.resolveConnection) {
      log.info('Unity bridge injected and ready, requesting initialization')
      this._requestUnityInit()
    }
  }

  async connect(config: ConnectionConfig): Promise<void> {
    log.info('Initializing Unity WebGL embed...')

    this._updateStatus(ConnectionStatus.CONNECTING)
    this.isInitialized = false

    // Unity bridge injection과 초기화 응답을 기다림
    return new Promise((resolve, reject) => {
      this.resolveConnection = resolve
      this.rejectConnection = reject

      // 브릿지가 이미 준비되어 있다면 즉시 초기화 요청
      if (this.unityBridge?.isReady) {
        log.info('Unity bridge already ready, requesting initialization')
        this._requestUnityInit()
      } else {
        log.info('Waiting for Unity bridge injection...')
      }

      // 타임아웃 설정 (10초)
      setTimeout(() => {
        if (!this.isInitialized) {
          const error = new Error('Unity initialization timeout - Unity bridge or init response not received within 10 seconds')
          log.error(error.message)
          this._updateStatus(ConnectionStatus.DISCONNECTED)
          reject(error)
          this.resolveConnection = null
          this.rejectConnection = null
        }
      }, 10000)
    })
  }

  async disconnect(): Promise<void> {
    log.info('Disconnecting Unity WebGL...')

    if (this.unityBridge?.unload) {
      await this.unityBridge.unload()
    }

    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    return this.sendCommands([command])
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    if (!this.unityBridge || !this.unityBridge.isReady) {
      return {
        success: false,
        error: 'Unity WebGL not ready',
        timestamp: Date.now(),
      }
    }

    try {
      const success = this.unityBridge.executeCommands(commands)

      if (success) {
        log.info('Commands sent to Unity', { count: commands.length })
        return {
          success: true,
          timestamp: Date.now(),
        }
      } else {
        return {
          success: false,
          error: 'Failed to send commands to Unity',
          timestamp: Date.now(),
        }
      }
    } catch (error) {
      const errorMsg = `Failed to send commands: ${error}`
      this._notifyError(errorMsg)

      return {
        success: false,
        error: errorMsg,
        timestamp: Date.now(),
      }
    }
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  isConnected(): boolean {
    return (
      this.status === ConnectionStatus.CONNECTED &&
      this.unityBridge?.isReady === true
    )
  }

  setEventListeners(listeners: ConnectionEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners }
  }

  /**
   * 메시지 리스너 설정
   * wsService와의 통합을 위해 사용
   */
  setMessageListener(listener: (message: unknown) => void): void {
    this.messageListener = listener
  }

  async emergencyStop(): Promise<CommandResponse> {
    log.warn('EMERGENCY STOP')

    if (!this.unityBridge || !this.unityBridge.isReady) {
      return {
        success: false,
        error: 'Unity WebGL not ready',
        timestamp: Date.now(),
      }
    }

    try {
      const success = this.unityBridge.emergencyStop()

      return {
        success,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        success: false,
        error: `Emergency stop failed: ${error}`,
        timestamp: Date.now(),
      }
    }
  }

  async ping(): Promise<number> {
    // Unity WebGL은 로컬에서 실행되므로 항상 낮은 레이턴시
    return Promise.resolve(1)
  }

  async reset(): Promise<CommandResponse> {
    log.info('UnityWebGLConnectionService', 'Resetting drone positions')

    if (!this.unityBridge || !this.isInitialized) {
      return {
        success: false,
        error: 'Unity not initialized',
        timestamp: Date.now(),
      }
    }

    try {
      this.unityBridge.sendMessage('DroneController', 'ResetPositions', '')
      return {
        success: true,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        success: false,
        error: `Reset failed: ${error}`,
        timestamp: Date.now(),
      }
    }
  }

  cleanup(): void {
    log.info('Cleanup')
    this.listeners = {}
    this.unityBridge = null
  }

  /**
   * Unity로부터 메시지를 수신했을 때 호출
   * (외부에서 호출됨 - useUnityBridge에서)
   */
  handleUnityMessage(message: UnityToReactMessage): void {
    const receivedMessage: ReceivedMessage = {
      type: message.type,
      timestamp: message.timestamp || Date.now(),
      data: message.data,
    }

    // 메시지 타입별 처리
    switch (message.type) {
      case 'init':
        this._handleInit(message.data as UnityInitData)
        break
      case 'telemetry':
        this._handleTelemetry(message.data)
        break
      case 'command_finish':
      case 'error':
      case 'log':
        if (this.listeners.onMessage) {
          this.listeners.onMessage(receivedMessage)
        }
        if (message.type === 'log' && this.listeners.onLog) {
          this.listeners.onLog(message.data)
        }
        break
      default:
        log.debug('Unknown message type', { type: message.type })
    }

    // wsService 통합을 위한 메시지 리스너 호출
    if (this.messageListener && message.type === 'telemetry') {
      this.messageListener({
        type: message.type,
        drones: message.data,
        timestamp: message.timestamp || Date.now()
      })
    }
  }

  // Private methods

  /**
   * Unity에 초기화 요청 전송
   */
  private _requestUnityInit(): void {
    if (!this.unityBridge || !this.unityBridge.isReady) {
      log.warn('Cannot request init - Unity bridge not ready')
      return
    }

    try {
      this.unityBridge.sendToUnity({
        type: 'request_init',
        data: {},
        timestamp: Date.now()
      })
      log.info('Sent init request to Unity')
    } catch (error) {
      log.error('Failed to send init request to Unity', error)
      if (this.rejectConnection) {
        this.rejectConnection(new Error(`Failed to request Unity init: ${error}`))
        this.resolveConnection = null
        this.rejectConnection = null
      }
    }
  }

  /**
   * Unity 초기화 응답 처리
   */
  private _handleInit(data: UnityInitData): void {
    log.info('Received init data from Unity', data)

    this.droneCount = data.droneCount || 0
    this.isInitialized = true

    // 초기 텔레메트리 데이터 생성 (Unity가 positions를 보내준 경우)
    if (data.positions && data.positions.length > 0) {
      data.positions.forEach((pos, index) => {
        const initialTelemetry: TelemetryData = {
          droneId: index + 1,
          position: pos,
          altitude: pos.z || 0,
          velocity: { x: 0, y: 0, z: 0 },
          battery: 100,
          flightMode: 'STABILIZE',
          isArmed: false,
          timestamp: Date.now(),
        }

        if (this.listeners.onTelemetry) {
          this.listeners.onTelemetry(initialTelemetry)
        }
      })
    }

    // 연결 완료 처리
    this._updateStatus(ConnectionStatus.CONNECTED)

    if (this.resolveConnection) {
      this.resolveConnection()
      log.info(`Unity WebGL connected with ${this.droneCount} drones`)
      this.resolveConnection = null
      this.rejectConnection = null
    }
  }

  private _handleTelemetry(data: unknown): void {
    // Unity가 여러 드론의 텔레메트리를 배열로 보낼 수 있음
    if (Array.isArray(data)) {
      data.forEach(droneData => this._processSingleTelemetry(droneData))
    } else {
      this._processSingleTelemetry(data)
    }
  }

  private _processSingleTelemetry(data: unknown): void {
    // Type assertion with validation
    if (!data || typeof data !== 'object') {
      log.warn('Invalid telemetry data received')
      return
    }

    const droneData = data as Record<string, unknown>

    const telemetry: TelemetryData = {
      droneId: droneData.droneId as number,
      position: droneData.position as { x: number; y: number; z: number },
      altitude: droneData.altitude as number,
      velocity: droneData.velocity as { x: number; y: number; z: number },
      battery: droneData.battery as number,
      flightMode: droneData.flightMode as string,
      isArmed: droneData.isArmed as boolean,
      timestamp: (droneData.timestamp as number) || Date.now(),
    }

    if (this.listeners.onTelemetry) {
      this.listeners.onTelemetry(telemetry)
    }
  }

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }

  private _notifyError(error: string): void {
    if (this.listeners.onError) {
      this.listeners.onError(error)
    }
  }
}

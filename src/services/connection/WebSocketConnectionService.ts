/**
 * WebSocket 기반 연결 서비스 (Unity 시뮬레이션용)
 * IConnectionService 인터페이스 구현
 */

import { ConnectionStatus, WS_CONFIG } from '@/constants/connection'
import { MessageType } from '@/constants/commands'
import type { Command } from '@/types/blockly'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  ReceivedMessage,
  CommandResponse,
  TelemetryData,
} from './types'
import { log } from '@/utils/logger'

/**
 * WebSocket 연결 서비스
 */
export class WebSocketConnectionService implements IConnectionService {
  private ws: WebSocket | null = null
  private url: string = ''
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private reconnectAttempts: number = 0
  private reconnectTimer: number | null = null
  private pingTimer: number | null = null
  private connectionTimeout: number | null = null

  // 이벤트 리스너
  private listeners: ConnectionEventListeners = {}

  /**
   * 연결 설정
   */
  async connect(config: ConnectionConfig): Promise<void> {
    if (!config.websocket) {
      throw new Error('WebSocket configuration is required')
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      log.warn('Already connected')
      return
    }

    const { ipAddress, port } = config.websocket
    this.url = `ws://${ipAddress}:${port}`
    this.reconnectAttempts = 0

    return this._connect()
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    this._clearTimers()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect') // 정상 종료
      this.ws = null
    }
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  /**
   * 단일 명령 전송
   */
  async sendCommand(command: Command): Promise<CommandResponse> {
    return this.sendCommands([command])
  }

  /**
   * 명령 리스트 전송
   */
  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return {
        success: false,
        error: 'Not connected to Unity',
        timestamp: Date.now(),
      }
    }

    try {
      const message = {
        type: MessageType.EXECUTE_SCRIPT,
        commands,
        timestamp: Date.now(),
      }

      const payload = JSON.stringify(message)
      this.ws.send(payload)

      log.info('Commands sent', { count: commands.length })

      return {
        success: true,
        timestamp: Date.now(),
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

  /**
   * 현재 연결 상태 조회
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * 연결 여부 확인
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 이벤트 리스너 등록
   */
  setEventListeners(listeners: ConnectionEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners }
  }

  /**
   * 비상 정지 명령
   */
  async emergencyStop(): Promise<CommandResponse> {
    log.warn('EMERGENCY STOP')

    const emergencyCommand: Command = {
      action: 'emergency_stop' as any,
      timestamp: Date.now(),
    }

    return this.sendCommand(emergencyCommand)
  }

  /**
   * 핑 테스트
   */
  async ping(): Promise<number> {
    if (!this.isConnected()) {
      throw new Error('Not connected')
    }

    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'))
      }, 5000)

      const handlePong = () => {
        clearTimeout(timeout)
        const latency = Date.now() - startTime
        resolve(latency)
      }

      // 임시 이벤트 리스너
      this.ws!.addEventListener('message', function pongListener(event) {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'pong') {
            handlePong()
            this.removeEventListener('message', pongListener)
          }
        } catch (e) {
          // 무시
        }
      })

      // Ping 전송
      this.ws!.send(JSON.stringify({ type: 'ping', timestamp: startTime }))
    })
  }

  /**
   * 드론 위치 및 상태 초기화
   */
  async reset(): Promise<CommandResponse> {
    if (!this.isConnected()) {
      return {
        success: false,
        error: 'Not connected',
        timestamp: Date.now(),
      }
    }

    // Send reset command to server
    this.ws!.send(JSON.stringify({ type: 'reset', timestamp: Date.now() }))

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  /**
   * 클린업
   */
  cleanup(): void {
    this._clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners = {}
  }

  // Private methods

  private async _connect(): Promise<void> {
    this._updateStatus(ConnectionStatus.CONNECTING)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        this._setupEventHandlers(resolve, reject)
        this._setupConnectionTimeout(reject)
      } catch (error) {
        const errorMsg = `Connection failed: ${error}`
        this._handleConnectionError(errorMsg)
        reject(new Error(errorMsg))
      }
    })
  }

  private _setupEventHandlers(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      log.info('Connected', { url: this.url })
      this._clearTimers()
      this.reconnectAttempts = 0
      this._updateStatus(ConnectionStatus.CONNECTED)
      this._startPingInterval()
      resolve()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this._handleMessage(data)
      } catch (error) {
        log.error('Failed to parse message', { error })
      }
    }

    this.ws.onerror = (event) => {
      log.error('WebSocket error', { event })
      const errorMsg = 'Connection error occurred'
      this._handleConnectionError(errorMsg)
      reject(new Error(errorMsg))
    }

    this.ws.onclose = (event) => {
      log.info('Closed', { code: event.code, reason: event.reason })
      this._clearTimers()
      this._updateStatus(ConnectionStatus.DISCONNECTED)

      // 비정상 종료 시 재연결 시도
      if (
        event.code !== 1000 &&
        this.reconnectAttempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS
      ) {
        this._scheduleReconnect()
      }
    }
  }

  private _handleMessage(data: any): void {
    const message: ReceivedMessage = {
      type: data.type,
      timestamp: data.timestamp || Date.now(),
      data,
    }

    // 메시지 타입별 처리
    switch (data.type) {
      case 'telemetry':
        this._handleTelemetry(data)
        break
      case 'ack':
      case 'command_finish':
      case 'error':
      case 'log':
        if (this.listeners.onMessage) {
          this.listeners.onMessage(message)
        }
        break
      case 'pong':
        // Ping 응답은 별도 처리
        break
      default:
        log.debug('Unknown message type', { type: data.type })
    }
  }

  private _handleTelemetry(data: any): void {
    const telemetry: TelemetryData = {
      droneId: data.droneId,
      position: data.position,
      altitude: data.altitude,
      velocity: data.velocity,
      battery: data.battery,
      flightMode: data.flightMode,
      isArmed: data.isArmed,
      timestamp: data.timestamp || Date.now(),
    }

    if (this.listeners.onTelemetry) {
      this.listeners.onTelemetry(telemetry)
    }
  }

  private _setupConnectionTimeout(reject: (error: Error) => void): void {
    this.connectionTimeout = window.setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.ws?.close()
        const errorMsg = 'Connection timeout'
        this._handleConnectionError(errorMsg)
        reject(new Error(errorMsg))
      }
    }, WS_CONFIG.CONNECTION_TIMEOUT)
  }

  private _scheduleReconnect(): void {
    this.reconnectAttempts++
    log.info('Reconnecting...', {
      attempt: this.reconnectAttempts,
      maxAttempts: WS_CONFIG.MAX_RECONNECT_ATTEMPTS
    })

    this.reconnectTimer = window.setTimeout(() => {
      this._connect().catch((error) => {
        log.error('Reconnect failed', { error })
      })
    }, WS_CONFIG.RECONNECT_INTERVAL)
  }

  private _startPingInterval(): void {
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, WS_CONFIG.PING_INTERVAL)
  }

  private _clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
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

  private _handleConnectionError(error: string): void {
    this._updateStatus(ConnectionStatus.ERROR)
    this._notifyError(error)
  }
}

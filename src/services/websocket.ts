import { ConnectionStatus, WS_CONFIG } from '@/constants/connection'
import type { WSMessage, ExecuteScriptMessage } from '@/types/websocket'
import { log } from '@/utils/logger'

/**
 * WebSocket 클라이언트 서비스
 * Unity Control Server와 실시간 통신을 담당
 */
export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectAttempts: number = 0
  private reconnectTimer: number | null = null
  private pingTimer: number | null = null
  private connectionTimeout: number | null = null

  // 이벤트 리스너들
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null
  private onMessage: ((message: WSMessage) => void) | null = null
  private onError: ((error: string) => void) | null = null

  /**
   * 연결 시도
   * @param ipAddress Unity Control Server의 IP 주소
   * @param port WebSocket 포트 (기본: 8080)
   */
  connect(ipAddress: string, port: number = 8080): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      log.warn('WebSocketService', 'Already connected')
      return
    }

    this.url = `ws://${ipAddress}:${port}`
    this.reconnectAttempts = 0
    this._connect()
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this._clearTimers()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  /**
   * 메시지 전송
   * @param message 전송할 메시지
   */
  send(message: ExecuteScriptMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this._notifyError('Not connected to Unity')
      return false
    }

    try {
      const payload = JSON.stringify(message)
      this.ws.send(payload)
      // Successfully sent message
      return true
    } catch (error) {
      this._notifyError(`Failed to send message: ${error}`)
      return false
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  setStatusChangeListener(listener: (status: ConnectionStatus) => void): void {
    this.onStatusChange = listener
  }

  setMessageListener(listener: (message: WSMessage) => void): void {
    this.onMessage = listener
  }

  getMessageListener(): ((message: WSMessage) => void) | null {
    return this.onMessage
  }

  setErrorListener(listener: (error: string) => void): void {
    this.onError = listener
  }

  /**
   * 현재 연결 상태 확인
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // Private methods

  private _connect(): void {
    this._updateStatus(ConnectionStatus.CONNECTING)

    try {
      this.ws = new WebSocket(this.url)
      this._setupEventHandlers()
      this._setupConnectionTimeout()
    } catch (error) {
      this._handleConnectionError(`Connection failed: ${error}`)
    }
  }

  private _setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      // Connection established successfully
      this._clearTimers()
      this.reconnectAttempts = 0
      this._updateStatus(ConnectionStatus.CONNECTED)
      this._startPingInterval()
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        if (this.onMessage) {
          this.onMessage(message)
        }
      } catch (error) {
        log.error('WebSocketService', 'Failed to parse message:', error)
      }
    }

    this.ws.onerror = (event) => {
      log.error('WebSocketService', 'WebSocket error:', event)
      this._handleConnectionError('Connection error occurred')
    }

    this.ws.onclose = (event) => {
      // Connection closed
      this._clearTimers()
      this._updateStatus(ConnectionStatus.DISCONNECTED)

      // 비정상 종료 시 재연결 시도
      if (event.code !== 1000 && this.reconnectAttempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        this._scheduleReconnect()
      }
    }
  }

  private _setupConnectionTimeout(): void {
    this.connectionTimeout = window.setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.ws?.close()
        this._handleConnectionError('Connection timeout')
      }
    }, WS_CONFIG.CONNECTION_TIMEOUT)
  }

  private _scheduleReconnect(): void {
    this.reconnectAttempts++
    // Attempting to reconnect...

    this.reconnectTimer = window.setTimeout(() => {
      this._connect()
    }, WS_CONFIG.RECONNECT_INTERVAL)
  }

  private _startPingInterval(): void {
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Ping 메시지 전송 (Keep-alive)
        this.ws.send(JSON.stringify({ type: 'ping' }))
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
    if (this.onStatusChange) {
      this.onStatusChange(status)
    }
  }

  private _notifyError(error: string): void {
    if (this.onError) {
      this.onError(error)
    }
  }

  private _handleConnectionError(error: string): void {
    this._updateStatus(ConnectionStatus.ERROR)
    this._notifyError(error)
  }
}

// Singleton 인스턴스
export const wsService = new WebSocketService()

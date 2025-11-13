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

/**
 * Unity WebGL 연결 서비스
 *
 * ⚠️ 주의: 이 서비스는 Unity WebGL 빌드와 함께 사용해야 합니다.
 * Unity 빌드 파일은 public/unity/ 폴더에 배치되어야 합니다.
 */
export class UnityWebGLConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}
  private unityBridge: any = null // useUnityBridge의 반환값을 저장

  /**
   * Unity WebGL 브릿지 인스턴스 설정
   * (React Hook에서 생성된 브릿지를 주입받음)
   */
  setUnityBridge(bridge: any): void {
    this.unityBridge = bridge

    // Unity로부터 메시지 수신 시 처리
    // (실제로는 useUnityBridge에서 onMessage 콜백으로 처리)
  }

  async connect(config: ConnectionConfig): Promise<void> {
    console.log('[UnityWebGL] Initializing Unity WebGL embed...')

    this._updateStatus(ConnectionStatus.CONNECTING)

    // Unity WebGL은 컴포넌트 레벨에서 로드되므로
    // 여기서는 상태만 업데이트
    // 실제 연결은 useUnityBridge의 onReady 콜백에서 완료

    return new Promise((resolve) => {
      // Unity 로딩 완료 대기 (컴포넌트에서 처리)
      // 임시로 즉시 연결된 것으로 간주
      setTimeout(() => {
        this._updateStatus(ConnectionStatus.CONNECTED)
        console.log('[UnityWebGL] Unity WebGL ready')
        resolve()
      }, 1000)
    })
  }

  async disconnect(): Promise<void> {
    console.log('[UnityWebGL] Disconnecting Unity WebGL...')

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
        console.log('[UnityWebGL] Commands sent to Unity:', commands.length)
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

  async emergencyStop(): Promise<CommandResponse> {
    console.warn('[UnityWebGL] EMERGENCY STOP')

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

  cleanup(): void {
    console.log('[UnityWebGL] Cleanup')
    this.listeners = {}
    this.unityBridge = null
  }

  /**
   * Unity로부터 메시지를 수신했을 때 호출
   * (외부에서 호출됨 - useUnityBridge에서)
   */
  handleUnityMessage(message: any): void {
    const receivedMessage: ReceivedMessage = {
      type: message.type,
      timestamp: message.timestamp || Date.now(),
      data: message.data,
    }

    // 메시지 타입별 처리
    switch (message.type) {
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
        console.log('[UnityWebGL] Unknown message type:', message.type)
    }
  }

  // Private methods

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

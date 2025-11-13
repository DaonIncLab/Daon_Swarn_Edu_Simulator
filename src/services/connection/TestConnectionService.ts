/**
 * 테스트/더미 연결 서비스
 * Unity 서버 없이 로컬에서 테스트할 수 있는 더미 구현
 */

import { ConnectionStatus } from '@/constants/connection'
import type { Command } from '@/types/blockly'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  CommandResponse,
  TelemetryData,
} from './types'

/**
 * 테스트 연결 서비스
 */
export class TestConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}
  private telemetryTimer: number | null = null

  async connect(config: ConnectionConfig): Promise<void> {
    console.log('[Test] Connecting to test mode...')

    this._updateStatus(ConnectionStatus.CONNECTING)

    // 연결 시뮬레이션 (1초 후 연결 성공)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    this._updateStatus(ConnectionStatus.CONNECTED)
    this._startDummyTelemetry()

    console.log('[Test] Connected successfully (dummy mode)')
  }

  async disconnect(): Promise<void> {
    console.log('[Test] Disconnecting...')

    this._stopDummyTelemetry()
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    console.log('[Test] Command sent (dummy):', command)

    // 더미 응답 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      success: true,
      commandId: `dummy-${Date.now()}`,
      timestamp: Date.now(),
    }
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    console.log('[Test] Commands sent (dummy):', commands.length)

    // 더미 응답 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 200))

    // 명령 실행 로그 시뮬레이션
    for (const cmd of commands) {
      if (this.listeners.onLog) {
        this.listeners.onLog(`[Dummy] Executing: ${cmd.action}`)
      }
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED
  }

  setEventListeners(listeners: ConnectionEventListeners): void {
    this.listeners = { ...this.listeners, ...listeners }
  }

  async emergencyStop(): Promise<CommandResponse> {
    console.warn('[Test] EMERGENCY STOP (dummy)')

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  async ping(): Promise<number> {
    // 더미 핑 (10-50ms 랜덤)
    const latency = Math.random() * 40 + 10
    return Promise.resolve(latency)
  }

  cleanup(): void {
    this._stopDummyTelemetry()
    this.listeners = {}
  }

  // Private methods

  /**
   * 더미 텔레메트리 데이터 생성 시작
   */
  private _startDummyTelemetry(): void {
    let time = 0

    this.telemetryTimer = window.setInterval(() => {
      time += 0.5

      // 사인파 패턴으로 더미 위치 생성
      const telemetry: TelemetryData = {
        droneId: 'dummy-drone-1',
        position: {
          x: Math.sin(time * 0.5) * 5,
          y: 2 + Math.sin(time * 0.3) * 1,
          z: Math.cos(time * 0.5) * 5,
        },
        altitude: 2 + Math.sin(time * 0.3) * 1,
        velocity: {
          vx: Math.cos(time * 0.5) * 2.5,
          vy: Math.cos(time * 0.3) * 0.3,
          vz: -Math.sin(time * 0.5) * 2.5,
        },
        battery: Math.max(0, 100 - time * 0.5), // 천천히 감소
        flightMode: 'GUIDED',
        isArmed: true,
        timestamp: Date.now(),
      }

      if (this.listeners.onTelemetry) {
        this.listeners.onTelemetry(telemetry)
      }
    }, 500) // 0.5초마다 업데이트
  }

  /**
   * 더미 텔레메트리 중지
   */
  private _stopDummyTelemetry(): void {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer)
      this.telemetryTimer = null
    }
  }

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }
}

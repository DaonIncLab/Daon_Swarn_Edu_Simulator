/**
 * MAVLink 기반 연결 서비스 (실제 드론 연동용 - 2차 목표)
 * IConnectionService 인터페이스 구현
 *
 * ⚠️ 현재는 스텁(Stub) 구현입니다.
 * 실제 MAVLink 프로토콜 구현은 2차 목표에서 진행됩니다.
 */

import { ConnectionStatus } from '@/constants/connection'
import type { Command } from '@/types/blockly'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  CommandResponse,
} from './types'

/**
 * MAVLink 연결 서비스 (스텁)
 */
export class MAVLinkConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}

  async connect(config: ConnectionConfig): Promise<void> {
    console.warn('[MAVLink] MAVLink service is not implemented yet (Phase 2)')

    if (!config.mavlink) {
      throw new Error('MAVLink configuration is required')
    }

    // TODO: MAVLink 프로토콜 연결 구현
    // - Serial/UDP/TCP 연결
    // - MAVLink 핸드셰이크
    // - 텔레메트리 스트림 시작

    throw new Error('MAVLink service not implemented yet')
  }

  async disconnect(): Promise<void> {
    console.log('[MAVLink] Disconnect (stub)')
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    console.warn('[MAVLink] sendCommand not implemented:', command)

    // TODO: 명령을 MAVLink 메시지로 변환
    // - MAV_CMD_NAV_TAKEOFF
    // - MAV_CMD_NAV_LAND
    // - MAV_CMD_DO_SET_MODE 등

    return {
      success: false,
      error: 'MAVLink service not implemented',
      timestamp: Date.now(),
    }
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    console.warn('[MAVLink] sendCommands not implemented:', commands.length)

    return {
      success: false,
      error: 'MAVLink service not implemented',
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
    console.warn('[MAVLink] emergencyStop not implemented')

    // TODO: MAV_CMD_DO_FLIGHTTERMINATION 또는
    // MAV_CMD_COMPONENT_ARM_DISARM (강제 disarm)

    return {
      success: false,
      error: 'MAVLink service not implemented',
      timestamp: Date.now(),
    }
  }

  async ping(): Promise<number> {
    throw new Error('MAVLink ping not implemented')
  }

  cleanup(): void {
    console.log('[MAVLink] Cleanup (stub)')
    this.listeners = {}
  }

  // Private methods

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }
}

/**
 * MAVLink 명령 변환 유틸리티 (향후 구현)
 */
export class MAVLinkCommandConverter {
  /**
   * Blockly Command를 MAVLink 메시지로 변환
   */
  static toMAVLinkCommand(command: Command): any {
    // TODO: 구현 필요
    throw new Error('Not implemented')
  }

  /**
   * MAVLink 텔레메트리를 표준 포맷으로 변환
   */
  static fromMAVLinkTelemetry(mavlinkData: any): any {
    // TODO: 구현 필요
    throw new Error('Not implemented')
  }
}

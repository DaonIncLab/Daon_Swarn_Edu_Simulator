/**
 * 연결 서비스 공통 타입 정의
 */

import type { ConnectionStatus } from '@/constants/connection'
import type { Command } from '@/types/blockly'

/**
 * 연결 모드
 */
export enum ConnectionMode {
  /** Unity WebSocket 시뮬레이션 (별도 서버) */
  SIMULATION = 'simulation',
  /** Unity WebGL 임베드 모드 (클라이언트 내장) */
  UNITY_WEBGL = 'unity_webgl',
  /** 실제 드론 MAVLink 연동 (2차 목표) */
  REAL_DRONE = 'real_drone',
  /** 테스트/더미 모드 */
  TEST = 'test',
}

/**
 * 연결 설정
 */
export interface ConnectionConfig {
  mode: ConnectionMode

  // WebSocket 설정 (시뮬레이션 모드)
  websocket?: {
    ipAddress: string
    port: number
  }

  // Unity WebGL 설정 (임베드 모드)
  unityWebGL?: {
    loaderUrl: string
    dataUrl: string
    frameworkUrl: string
    codeUrl: string
  }

  // MAVLink 설정 (실제 드론 모드)
  mavlink?: {
    connectionType: 'serial' | 'udp' | 'tcp'
    port?: string // COM3, /dev/ttyUSB0 등
    baudRate?: number
    host?: string
    udpPort?: number
  }

  // Test 모드 설정
  test?: {
    droneCount?: number
  }
}

/**
 * 수신 메시지 타입
 */
export interface ReceivedMessage {
  type: 'telemetry' | 'ack' | 'error' | 'command_finish' | 'log'
  timestamp: number
  data: unknown
}

/**
 * 텔레메트리 데이터
 */
export interface TelemetryData {
  droneId?: string
  position?: { x: number; y: number; z: number }
  altitude?: number
  velocity?: { vx: number; vy: number; vz: number }
  battery?: number
  flightMode?: string
  isArmed?: boolean
  timestamp: number
}

/**
 * 명령 응답
 */
export interface CommandResponse {
  success: boolean
  commandId?: string
  error?: string
  timestamp: number
}

/**
 * 연결 이벤트 리스너
 */
export interface ConnectionEventListeners {
  onStatusChange?: (status: ConnectionStatus) => void
  onMessage?: (message: ReceivedMessage) => void
  onTelemetry?: (data: TelemetryData) => void
  onError?: (error: string) => void
  onLog?: (log: string) => void
}

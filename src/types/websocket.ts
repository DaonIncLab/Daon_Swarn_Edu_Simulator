import { MessageType, CommandAction, FormationType, Direction } from '../constants/commands'

/**
 * WebSocket 메시지 타입 정의
 */

// 기본 메시지 인터페이스
export interface BaseMessage {
  type: MessageType
  timestamp?: number
}

// 명령 파라미터 타입들
export interface TakeoffAllParams {
  altitude?: number
}

export interface LandAllParams {
  speed?: number
}

export interface SetFormationParams {
  type: FormationType
  rows?: number
  cols?: number
  spacing?: number
  radius?: number
}

export interface MoveFormationParams {
  direction: Direction
  distance: number
  speed?: number
}

export interface MoveDroneParams {
  droneId: number
  x: number
  y: number
  z: number
  speed?: number
}

export interface RotateDroneParams {
  droneId: number
  yaw: number
}

export interface WaitParams {
  duration: number
}

// 명령어 타입
export type CommandParams =
  | TakeoffAllParams
  | LandAllParams
  | SetFormationParams
  | MoveFormationParams
  | MoveDroneParams
  | RotateDroneParams
  | WaitParams
  | Record<string, never> // 빈 객체

export interface Command {
  action: CommandAction
  params: CommandParams
}

// 명령 응답 인터페이스
export interface CommandResponse {
  success: boolean
  error?: string
  timestamp: number
}

// 클라이언트 -> Unity: 스크립트 실행
export interface ExecuteScriptMessage extends BaseMessage {
  type: 'execute_script'
  commands: Command[]
}

// Unity -> 클라이언트: 명령 완료
export interface CommandFinishMessage extends BaseMessage {
  type: 'command_finish'
  commandIndex: number
  message?: string
}

// Unity -> 클라이언트: 에러
export interface ErrorMessage extends BaseMessage {
  type: 'error'
  error: string
  commandIndex?: number
}

// Unity -> 클라이언트: 텔레메트리 (드론 상태)
export interface DroneState {
  id: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  battery: number // Required for visualization
  isActive: boolean
  status: 'idle' | 'flying' | 'landed' | 'hovering' | 'error'
}

export interface TelemetryMessage extends BaseMessage {
  type: 'telemetry'
  drones: DroneState[]
}

// Unity -> 클라이언트: Ack (메시지 수신 확인)
export interface AckMessage extends BaseMessage {
  type: 'ack'
  message?: string
}

// 모든 메시지 타입 유니온
export type WSMessage =
  | ExecuteScriptMessage
  | CommandFinishMessage
  | ErrorMessage
  | TelemetryMessage
  | AckMessage

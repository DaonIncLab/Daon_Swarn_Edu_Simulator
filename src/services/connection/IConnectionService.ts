/**
 * 연결 서비스 추상 인터페이스
 * Strategy Pattern을 사용하여 WebSocket, MAVLink 등 다양한 통신 방식을 지원
 */

import type { ConnectionStatus } from '@/constants/connection'
import type { Command } from '@/types/blockly'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  ReceivedMessage,
  CommandResponse,
} from './types'

/**
 * 연결 서비스 인터페이스
 *
 * 모든 통신 구현체(WebSocket, MAVLink 등)는 이 인터페이스를 구현해야 함
 */
export interface IConnectionService {
  /**
   * 연결 설정
   * @param config 연결 설정 정보
   * @returns 연결 성공 여부
   */
  connect(config: ConnectionConfig): Promise<void>

  /**
   * 연결 해제
   */
  disconnect(): Promise<void>

  /**
   * 명령 전송
   * @param command 전송할 명령
   * @returns 명령 전송 결과
   */
  sendCommand(command: Command): Promise<CommandResponse>

  /**
   * 명령 리스트 전송 (배치 실행)
   * @param commands 전송할 명령 리스트
   * @returns 명령 전송 결과
   */
  sendCommands(commands: Command[]): Promise<CommandResponse>

  /**
   * 현재 연결 상태 조회
   */
  getStatus(): ConnectionStatus

  /**
   * 연결 여부 확인
   */
  isConnected(): boolean

  /**
   * 이벤트 리스너 등록
   * @param listeners 이벤트 리스너 객체
   */
  setEventListeners(listeners: ConnectionEventListeners): void

  /**
   * 비상 정지 명령 (최우선 순위)
   * @returns 비상 정지 실행 결과
   */
  emergencyStop(): Promise<CommandResponse>

  /**
   * 연결 상태 핑 테스트
   * @returns 핑 응답 시간 (ms)
   */
  ping(): Promise<number>

  /**
   * 드론 위치 및 상태 초기화
   * @returns 초기화 결과
   */
  reset(): Promise<CommandResponse>

  /**
   * 서비스 클린업 (메모리 해제)
   */
  cleanup(): void
}

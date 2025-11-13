/**
 * 실행 가능한 노드 트리 구조 정의
 * Blockly 블록을 파싱하여 생성되는 실행 트리의 타입들
 */

import type { Command } from './websocket'

/**
 * 노드 타입
 */
export enum NodeType {
  /** 단일 명령 */
  COMMAND = 'command',
  /** 순차 실행 (여러 명령을 순서대로) */
  SEQUENCE = 'sequence',
  /** 반복 실행 */
  REPEAT = 'repeat',
  /** For 루프 */
  FOR_LOOP = 'for_loop',
  /** 조건 분기 (if) */
  IF = 'if',
  /** 조건 분기 (if-else) */
  IF_ELSE = 'if_else',
  /** 대기 */
  WAIT = 'wait',
}

/**
 * 기본 실행 노드 인터페이스
 */
export interface BaseNode {
  id: string // 노드 고유 ID (디버깅용)
  type: NodeType
}

/**
 * 단일 명령 노드
 */
export interface CommandNode extends BaseNode {
  type: NodeType.COMMAND
  command: Command
}

/**
 * 순차 실행 노드
 */
export interface SequenceNode extends BaseNode {
  type: NodeType.SEQUENCE
  children: ExecutableNode[]
}

/**
 * 반복 노드
 */
export interface RepeatNode extends BaseNode {
  type: NodeType.REPEAT
  times: number
  body: ExecutableNode
}

/**
 * For 루프 노드
 */
export interface ForLoopNode extends BaseNode {
  type: NodeType.FOR_LOOP
  variable: string
  from: number
  to: number
  by: number
  body: ExecutableNode
}

/**
 * 조건 분기 노드 (if)
 */
export interface IfNode extends BaseNode {
  type: NodeType.IF
  condition: string
  thenBranch: ExecutableNode
}

/**
 * 조건 분기 노드 (if-else)
 */
export interface IfElseNode extends BaseNode {
  type: NodeType.IF_ELSE
  condition: string
  thenBranch: ExecutableNode
  elseBranch: ExecutableNode
}

/**
 * 대기 노드
 */
export interface WaitNode extends BaseNode {
  type: NodeType.WAIT
  duration: number // 초 단위
}

/**
 * 실행 가능한 모든 노드 타입의 유니온
 */
export type ExecutableNode =
  | CommandNode
  | SequenceNode
  | RepeatNode
  | ForLoopNode
  | IfNode
  | IfElseNode
  | WaitNode

/**
 * 실행 컨텍스트 (변수 저장소)
 */
export interface ExecutionContext {
  variables: Map<string, number>
  currentRepeatCount?: number // 현재 반복 횟수 (디버깅용)
  currentLoopVariable?: { name: string; value: number } // 현재 루프 변수
}

/**
 * 실행 상태
 */
export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  currentNodeId: string | null // 현재 실행 중인 노드 ID
  currentNodePath: number[] // 노드 경로 (중첩 레벨 추적)
  error: string | null
  context: ExecutionContext
}

/**
 * 실행 결과
 */
export interface ExecutionResult {
  success: boolean
  error?: string
  executedNodes: number // 실행된 노드 수
}

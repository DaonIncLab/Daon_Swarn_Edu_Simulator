/**
 * 실행 가능한 노드 트리 구조 정의
 * Blockly 블록을 파싱하여 생성되는 실행 트리의 타입들
 */

import type { Command } from './websocket'

/**
 * 노드 타입
 */
export const NodeType = {
  /** 단일 명령 */
  COMMAND: 'command',
  /** 순차 실행 (여러 명령을 순서대로) */
  SEQUENCE: 'sequence',
  /** 반복 실행 */
  REPEAT: 'repeat',
  /** For 루프 */
  FOR_LOOP: 'for_loop',
  /** While 루프 (조건 기반) */
  WHILE_LOOP: 'while_loop',
  /** Repeat Until 루프 (조건이 참이 될 때까지) */
  UNTIL_LOOP: 'until_loop',
  /** 조건 분기 (if) */
  IF: 'if',
  /** 조건 분기 (if-else) */
  IF_ELSE: 'if_else',
  /** 대기 */
  WAIT: 'wait',
  /** 변수 설정 */
  VARIABLE_SET: 'variable_set',
  /** 변수 값 가져오기 */
  VARIABLE_GET: 'variable_get',
  /** 함수 정의 */
  FUNCTION_DEF: 'function_def',
  /** 함수 호출 */
  FUNCTION_CALL: 'function_call',
} as const

export type NodeType = typeof NodeType[keyof typeof NodeType]

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
 * While 루프 노드
 */
export interface WhileLoopNode extends BaseNode {
  type: NodeType.WHILE_LOOP
  condition: string
  body: ExecutableNode
  maxIterations?: number // 무한 루프 방지 (기본값: 1000)
}

/**
 * Repeat Until 루프 노드
 */
export interface UntilLoopNode extends BaseNode {
  type: NodeType.UNTIL_LOOP
  condition: string
  body: ExecutableNode
  maxIterations?: number // 무한 루프 방지 (기본값: 1000)
}

/**
 * 변수 설정 노드
 */
export interface VariableSetNode extends BaseNode {
  type: NodeType.VARIABLE_SET
  variableName: string
  value: number | VariableGetNode // 직접 값 또는 다른 변수 참조
}

/**
 * 변수 값 가져오기 노드
 */
export interface VariableGetNode extends BaseNode {
  type: NodeType.VARIABLE_GET
  variableName: string
}

/**
 * 함수 정의 노드
 */
export interface FunctionDefNode extends BaseNode {
  type: NodeType.FUNCTION_DEF
  functionName: string
  body: ExecutableNode
}

/**
 * 함수 호출 노드
 */
export interface FunctionCallNode extends BaseNode {
  type: NodeType.FUNCTION_CALL
  functionName: string
}

/**
 * 실행 가능한 모든 노드 타입의 유니온
 */
export type ExecutableNode =
  | CommandNode
  | SequenceNode
  | RepeatNode
  | ForLoopNode
  | WhileLoopNode
  | UntilLoopNode
  | IfNode
  | IfElseNode
  | WaitNode
  | VariableSetNode
  | VariableGetNode
  | FunctionDefNode
  | FunctionCallNode

/**
 * 실행 컨텍스트 (변수 저장소 및 함수 레지스트리)
 */
export interface ExecutionContext {
  variables: Map<string, number> // 전역 변수 저장소
  functions: Map<string, ExecutableNode> // 함수 정의 저장소
  callStack: string[] // 함수 호출 스택 (무한 재귀 방지)
  currentRepeatCount?: number // 현재 반복 횟수 (디버깅용)
  currentLoopVariable?: { name: string; value: number } // 현재 루프 변수
  executionStartTime?: number // 실행 시작 시간 (센서: elapsed_time 조건용)
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

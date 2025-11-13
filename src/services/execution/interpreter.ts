/**
 * 실행 인터프리터
 * ExecutableNode 트리를 실제로 실행하는 엔진
 */

import type { IConnectionService } from '@/services/connection'
import type { DroneState, Command, CommandResponse } from '@/types/websocket'
import type {
  ExecutableNode,
  ExecutionContext,
  ExecutionState,
  ExecutionResult,
  NodeType,
} from '@/types/execution'
import { evaluateCondition } from './conditionEvaluator'

/**
 * 실행 상태 변경 리스너
 */
export type ExecutionStateListener = (state: ExecutionState) => void

/**
 * 실행 인터프리터
 */
export class Interpreter {
  private connectionService: IConnectionService
  private droneStates: DroneState[]
  private state: ExecutionState
  private stateListener: ExecutionStateListener | null = null
  private shouldStop: boolean = false

  constructor(connectionService: IConnectionService) {
    this.connectionService = connectionService
    this.droneStates = []
    this.state = {
      status: 'idle',
      currentNodeId: null,
      currentNodePath: [],
      error: null,
      context: {
        variables: new Map(),
      },
    }
  }

  /**
   * 드론 상태 업데이트 (텔레메트리 데이터)
   */
  updateDroneStates(states: DroneState[]): void {
    this.droneStates = states
  }

  /**
   * 상태 변경 리스너 등록
   */
  setStateListener(listener: ExecutionStateListener): void {
    this.stateListener = listener
  }

  /**
   * 상태 업데이트 및 리스너 호출
   */
  private updateState(update: Partial<ExecutionState>): void {
    this.state = { ...this.state, ...update }
    this.stateListener?.(this.state)
  }

  /**
   * 트리 실행
   */
  async execute(tree: ExecutableNode): Promise<ExecutionResult> {
    console.log('[Interpreter] Starting execution', tree)

    this.shouldStop = false
    this.updateState({
      status: 'running',
      currentNodeId: null,
      currentNodePath: [],
      error: null,
      context: { variables: new Map() },
    })

    let executedNodes = 0

    try {
      executedNodes = await this.executeNode(tree, [0])

      if (this.shouldStop) {
        this.updateState({ status: 'idle' })
        return { success: false, error: 'Execution stopped by user', executedNodes }
      }

      this.updateState({ status: 'completed', currentNodeId: null })
      return { success: true, executedNodes }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Interpreter] Execution error:', error)
      this.updateState({ status: 'error', error: errorMsg })
      return { success: false, error: errorMsg, executedNodes }
    }
  }

  /**
   * 실행 중단
   */
  stop(): void {
    console.log('[Interpreter] Stopping execution')
    this.shouldStop = true
    this.updateState({ status: 'idle' })
  }

  /**
   * 일시정지 (추후 구현)
   */
  pause(): void {
    this.updateState({ status: 'paused' })
  }

  /**
   * 재개 (추후 구현)
   */
  resume(): void {
    this.updateState({ status: 'running' })
  }

  /**
   * 개별 노드 실행 (재귀적)
   */
  private async executeNode(node: ExecutableNode, path: number[]): Promise<number> {
    if (this.shouldStop) {
      return 0
    }

    this.updateState({ currentNodeId: node.id, currentNodePath: path })

    console.log(`[Interpreter] Executing node ${node.id} (type: ${node.type})`)

    let executedCount = 1 // 현재 노드 포함

    switch (node.type) {
      case 'command':
        await this.executeCommand(node)
        break

      case 'sequence':
        executedCount = await this.executeSequence(node, path)
        break

      case 'repeat':
        executedCount = await this.executeRepeat(node, path)
        break

      case 'for_loop':
        executedCount = await this.executeForLoop(node, path)
        break

      case 'if':
        executedCount = await this.executeIf(node, path)
        break

      case 'if_else':
        executedCount = await this.executeIfElse(node, path)
        break

      case 'wait':
        await this.executeWait(node)
        break

      default:
        console.warn(`[Interpreter] Unknown node type: ${(node as any).type}`)
    }

    return executedCount
  }

  /**
   * 명령 노드 실행
   */
  private async executeCommand(node: any): Promise<void> {
    console.log('[Interpreter] Executing command:', node.command.action)

    const response: CommandResponse = await this.connectionService.sendCommand(node.command)

    if (!response.success) {
      throw new Error(`Command failed: ${response.error || 'Unknown error'}`)
    }

    // 명령 완료 대기 (Unity 응답 시뮬레이션 - 실제로는 Unity에서 완료 신호를 받아야 함)
    await this.delay(100)
  }

  /**
   * 시퀀스 노드 실행
   */
  private async executeSequence(node: any, path: number[]): Promise<number> {
    let totalExecuted = 0

    for (let i = 0; i < node.children.length; i++) {
      if (this.shouldStop) break

      const child = node.children[i]
      const childPath = [...path, i]
      const executed = await this.executeNode(child, childPath)
      totalExecuted += executed
    }

    return totalExecuted
  }

  /**
   * 반복 노드 실행
   */
  private async executeRepeat(node: any, path: number[]): Promise<number> {
    console.log(`[Interpreter] Repeating ${node.times} times`)

    let totalExecuted = 0

    for (let i = 0; i < node.times; i++) {
      if (this.shouldStop) break

      console.log(`[Interpreter] Repeat iteration ${i + 1}/${node.times}`)

      // 컨텍스트에 반복 횟수 저장
      const oldRepeatCount = this.state.context.currentRepeatCount
      this.state.context.currentRepeatCount = i + 1

      const childPath = [...path, i]
      const executed = await this.executeNode(node.body, childPath)
      totalExecuted += executed

      // 복원
      this.state.context.currentRepeatCount = oldRepeatCount
    }

    return totalExecuted
  }

  /**
   * For 루프 노드 실행
   */
  private async executeForLoop(node: any, path: number[]): Promise<number> {
    console.log(`[Interpreter] For loop: ${node.variable} from ${node.from} to ${node.to} by ${node.by}`)

    let totalExecuted = 0
    const { variable, from, to, by } = node

    const isIncrementing = by > 0
    let loopIndex = 0

    for (let i = from; isIncrementing ? i <= to : i >= to; i += by) {
      if (this.shouldStop) break

      console.log(`[Interpreter] Loop variable ${variable} = ${i}`)

      // 변수를 컨텍스트에 설정
      this.state.context.variables.set(variable, i)
      this.state.context.currentLoopVariable = { name: variable, value: i }

      const childPath = [...path, loopIndex]
      const executed = await this.executeNode(node.body, childPath)
      totalExecuted += executed

      loopIndex++
    }

    // 변수 정리
    this.state.context.variables.delete(variable)
    this.state.context.currentLoopVariable = undefined

    return totalExecuted
  }

  /**
   * If 노드 실행
   */
  private async executeIf(node: any, path: number[]): Promise<number> {
    console.log(`[Interpreter] Evaluating condition: ${node.condition}`)

    const conditionResult = evaluateCondition(node.condition, this.droneStates, this.state.context)

    if (conditionResult.error) {
      console.warn(`[Interpreter] Condition evaluation error: ${conditionResult.error}`)
    }

    console.log(`[Interpreter] Condition result: ${conditionResult.result}`)

    if (conditionResult.result) {
      const childPath = [...path, 0]
      return await this.executeNode(node.thenBranch, childPath)
    }

    return 0
  }

  /**
   * If-Else 노드 실행
   */
  private async executeIfElse(node: any, path: number[]): Promise<number> {
    console.log(`[Interpreter] Evaluating condition: ${node.condition}`)

    const conditionResult = evaluateCondition(node.condition, this.droneStates, this.state.context)

    if (conditionResult.error) {
      console.warn(`[Interpreter] Condition evaluation error: ${conditionResult.error}`)
    }

    console.log(`[Interpreter] Condition result: ${conditionResult.result}`)

    if (conditionResult.result) {
      const childPath = [...path, 0]
      return await this.executeNode(node.thenBranch, childPath)
    } else {
      const childPath = [...path, 1]
      return await this.executeNode(node.elseBranch, childPath)
    }
  }

  /**
   * 대기 노드 실행
   */
  private async executeWait(node: any): Promise<void> {
    console.log(`[Interpreter] Waiting ${node.duration} seconds`)
    await this.delay(node.duration * 1000)
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): ExecutionState {
    return this.state
  }
}

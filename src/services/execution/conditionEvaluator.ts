/**
 * 조건 평가 엔진
 * Blockly의 조건 블록을 실제 boolean 값으로 평가
 */

import type { DroneState } from '@/types/websocket'
import type { ExecutionContext } from '@/types/execution'

/**
 * 조건 평가 결과
 */
export interface ConditionResult {
  result: boolean
  error?: string
}

/**
 * 조건 평가기
 */
export class ConditionEvaluator {
  private droneStates: DroneState[]
  private context: ExecutionContext

  constructor(droneStates: DroneState[], context: ExecutionContext) {
    this.droneStates = droneStates
    this.context = context
  }

  /**
   * 조건 문자열을 평가하여 boolean 반환
   */
  evaluate(condition: string): ConditionResult {
    try {
      const result = this._evaluateCondition(condition)
      return { result }
    } catch (error) {
      console.error('[ConditionEvaluator] Error evaluating condition:', condition, error)
      return {
        result: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 내부 조건 평가 로직
   */
  private _evaluateCondition(condition: string): boolean {
    const trimmed = condition.trim()

    // 1. 드론 연결 상태 조건
    if (trimmed === 'all_connected') {
      return this.droneStates.length > 0 && this.droneStates.every(d => d.connected)
    }

    if (trimmed === 'any_connected') {
      return this.droneStates.some(d => d.connected)
    }

    if (trimmed === 'none_connected') {
      return this.droneStates.every(d => !d.connected)
    }

    // 2. 배터리 조건 (battery > 20, battery < 50, battery >= 30)
    const batteryMatch = trimmed.match(/^battery\s*([><=]+)\s*(\d+)$/)
    if (batteryMatch) {
      const operator = batteryMatch[1]
      const threshold = parseFloat(batteryMatch[2])
      return this._evaluateBatteryCondition(operator, threshold)
    }

    // 3. 고도 조건 (altitude > 5, altitude < 10)
    const altitudeMatch = trimmed.match(/^altitude\s*([><=]+)\s*([0-9.]+)$/)
    if (altitudeMatch) {
      const operator = altitudeMatch[1]
      const threshold = parseFloat(altitudeMatch[2])
      return this._evaluateAltitudeCondition(operator, threshold)
    }

    // 3a. 개별 드론 배터리 조건 (Phase 6-A) (drone_1_battery > 50)
    const droneBatteryMatch = trimmed.match(/^drone_(\d+)_battery\s*([><=]+)\s*(\d+)$/)
    if (droneBatteryMatch) {
      const droneId = parseInt(droneBatteryMatch[1], 10)
      const operator = droneBatteryMatch[2]
      const threshold = parseFloat(droneBatteryMatch[3])
      return this._evaluateDroneBatteryCondition(droneId, operator, threshold)
    }

    // 3b. 개별 드론 고도 조건 (Phase 6-A) (drone_1_altitude > 10)
    const droneAltitudeMatch = trimmed.match(/^drone_(\d+)_altitude\s*([><=]+)\s*([0-9.]+)$/)
    if (droneAltitudeMatch) {
      const droneId = parseInt(droneAltitudeMatch[1], 10)
      const operator = droneAltitudeMatch[2]
      const threshold = parseFloat(droneAltitudeMatch[3])
      return this._evaluateDroneAltitudeCondition(droneId, operator, threshold)
    }

    // 3c. 경과 시간 조건 (Phase 6-A) (elapsed_time > 30)
    const elapsedTimeMatch = trimmed.match(/^elapsed_time\s*([><=]+)\s*([0-9.]+)$/)
    if (elapsedTimeMatch) {
      const operator = elapsedTimeMatch[1]
      const threshold = parseFloat(elapsedTimeMatch[2])
      return this._evaluateElapsedTimeCondition(operator, threshold)
    }

    // 4. 변수 비교 (x > 5, count <= 10)
    const variableMatch = trimmed.match(/^(\w+)\s*([><=]+)\s*([0-9.]+)$/)
    if (variableMatch) {
      const varName = variableMatch[1]
      const operator = variableMatch[2]
      const threshold = parseFloat(variableMatch[3])
      return this._evaluateVariableCondition(varName, operator, threshold)
    }

    // 5. 논리 연산자 (AND, OR)
    if (trimmed.includes('AND') || trimmed.includes('&&')) {
      const parts = trimmed.split(/\s+(?:AND|&&)\s+/)
      return parts.every(part => this._evaluateCondition(part))
    }

    if (trimmed.includes('OR') || trimmed.includes('||')) {
      const parts = trimmed.split(/\s+(?:OR|\|\|)\s+/)
      return parts.some(part => this._evaluateCondition(part))
    }

    // 6. Boolean 리터럴
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    // 알 수 없는 조건 - 기본값 false
    console.warn(`[ConditionEvaluator] Unknown condition: ${condition}`)
    return false
  }

  /**
   * 배터리 조건 평가
   */
  private _evaluateBatteryCondition(operator: string, threshold: number): boolean {
    if (this.droneStates.length === 0) {
      return false
    }

    // 모든 드론의 평균 배터리
    const avgBattery = this.droneStates.reduce((sum, d) => sum + d.battery, 0) / this.droneStates.length

    return this._compareNumbers(avgBattery, operator, threshold)
  }

  /**
   * 고도 조건 평가
   */
  private _evaluateAltitudeCondition(operator: string, threshold: number): boolean {
    if (this.droneStates.length === 0) {
      return false
    }

    // 모든 드론의 평균 고도
    const avgAltitude = this.droneStates.reduce((sum, d) => sum + d.position.z, 0) / this.droneStates.length

    return this._compareNumbers(avgAltitude, operator, threshold)
  }

  /**
   * 변수 조건 평가
   */
  private _evaluateVariableCondition(varName: string, operator: string, threshold: number): boolean {
    const value = this.context.variables.get(varName)

    if (value === undefined) {
      console.warn(`[ConditionEvaluator] Variable not found: ${varName}`)
      return false
    }

    return this._compareNumbers(value, operator, threshold)
  }

  /**
   * 개별 드론 배터리 조건 평가 (Phase 6-A)
   */
  private _evaluateDroneBatteryCondition(droneId: number, operator: string, threshold: number): boolean {
    const drone = this.droneStates.find(d => d.id === droneId)

    if (!drone) {
      console.warn(`[ConditionEvaluator] Drone ${droneId} not found`)
      return false
    }

    return this._compareNumbers(drone.battery, operator, threshold)
  }

  /**
   * 개별 드론 고도 조건 평가 (Phase 6-A)
   */
  private _evaluateDroneAltitudeCondition(droneId: number, operator: string, threshold: number): boolean {
    const drone = this.droneStates.find(d => d.id === droneId)

    if (!drone) {
      console.warn(`[ConditionEvaluator] Drone ${droneId} not found`)
      return false
    }

    return this._compareNumbers(drone.position.z, operator, threshold)
  }

  /**
   * 경과 시간 조건 평가 (Phase 6-A)
   */
  private _evaluateElapsedTimeCondition(operator: string, threshold: number): boolean {
    const startTime = this.context.executionStartTime

    if (!startTime) {
      console.warn('[ConditionEvaluator] Execution start time not set')
      return false
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000

    return this._compareNumbers(elapsedSeconds, operator, threshold)
  }

  /**
   * 숫자 비교 유틸리티
   */
  private _compareNumbers(a: number, operator: string, b: number): boolean {
    switch (operator) {
      case '>':
        return a > b
      case '>=':
        return a >= b
      case '<':
        return a < b
      case '<=':
        return a <= b
      case '==':
      case '===':
        return a === b
      case '!=':
      case '!==':
        return a !== b
      default:
        console.warn(`[ConditionEvaluator] Unknown operator: ${operator}`)
        return false
    }
  }
}

/**
 * 조건 평가 헬퍼 함수
 */
export function evaluateCondition(
  condition: string,
  droneStates: DroneState[],
  context: ExecutionContext
): ConditionResult {
  const evaluator = new ConditionEvaluator(droneStates, context)
  return evaluator.evaluate(condition)
}

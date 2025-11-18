/**
 * ConditionEvaluator Unit Tests
 */

import { describe, test, expect } from 'vitest'
import { evaluateCondition, ConditionEvaluator } from '@/services/execution/conditionEvaluator'
import type { DroneState } from '@/types/websocket'
import type { ExecutionContext } from '@/types/execution'

describe('ConditionEvaluator', () => {
  // Mock drone states
  const mockDroneStates: DroneState[] = [
    {
      id: 1,
      isActive: true,
      battery: 80,
      position: { x: 0, y: 0, z: 10 },
      velocity: { x: 0, y: 0, z: 0 },
      mode: 'AUTO',
    },
    {
      id: 2,
      isActive: true,
      battery: 60,
      position: { x: 5, y: 5, z: 15 },
      velocity: { x: 0, y: 0, z: 0 },
      mode: 'AUTO',
    },
    {
      id: 3,
      isActive: false,
      battery: 40,
      position: { x: 10, y: 10, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      mode: 'STABILIZE',
    },
  ]

  const mockContext: ExecutionContext = {
    variables: new Map([
      ['count', 5],
      ['threshold', 100],
    ]),
    functions: new Map(),
    callStack: [],
    executionStartTime: Date.now() - 5000, // 5 seconds ago
  }

  describe('Connection State Conditions', () => {
    test('all_connected: returns true when all drones are active', () => {
      const activeStates = mockDroneStates.map(d => ({ ...d, isActive: true }))
      const result = evaluateCondition('all_connected', activeStates, mockContext)
      expect(result.result).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('all_connected: returns false when some drones are inactive', () => {
      const result = evaluateCondition('all_connected', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('all_connected: returns false when no drones', () => {
      const result = evaluateCondition('all_connected', [], mockContext)
      expect(result.result).toBe(false)
    })

    test('any_connected: returns true when at least one drone is active', () => {
      const result = evaluateCondition('any_connected', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('any_connected: returns false when no drones are active', () => {
      const inactiveStates = mockDroneStates.map(d => ({ ...d, isActive: false }))
      const result = evaluateCondition('any_connected', inactiveStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('none_connected: returns true when all drones are inactive', () => {
      const inactiveStates = mockDroneStates.map(d => ({ ...d, isActive: false }))
      const result = evaluateCondition('none_connected', inactiveStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('none_connected: returns false when any drone is active', () => {
      const result = evaluateCondition('none_connected', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Battery Conditions (Average)', () => {
    test('battery > threshold: true when average exceeds threshold', () => {
      // Average battery: (80 + 60 + 40) / 3 = 60
      const result = evaluateCondition('battery > 50', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('battery > threshold: false when average below threshold', () => {
      const result = evaluateCondition('battery > 70', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('battery < threshold: works correctly', () => {
      const result = evaluateCondition('battery < 70', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('battery >= threshold: works with equality', () => {
      const result = evaluateCondition('battery >= 60', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('battery <= threshold: works with equality', () => {
      const result = evaluateCondition('battery <= 60', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('battery condition: returns false when no drones', () => {
      const result = evaluateCondition('battery > 50', [], mockContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Altitude Conditions (Average)', () => {
    test('altitude > threshold: true when average exceeds threshold', () => {
      // Average altitude: (10 + 15 + 5) / 3 = 10
      const result = evaluateCondition('altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('altitude < threshold: false when average exceeds threshold', () => {
      const result = evaluateCondition('altitude < 8', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('altitude with decimal threshold: works correctly', () => {
      const result = evaluateCondition('altitude >= 10.0', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('altitude condition: returns false when no drones', () => {
      const result = evaluateCondition('altitude > 5', [], mockContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Individual Drone Conditions', () => {
    test('drone_N_battery: evaluates specific drone battery', () => {
      const result = evaluateCondition('drone_1_battery > 70', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('drone_N_battery: returns false for non-existent drone', () => {
      const result = evaluateCondition('drone_999_battery > 50', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('drone_N_altitude: evaluates specific drone altitude', () => {
      const result = evaluateCondition('drone_2_altitude > 10', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('drone_N_altitude: works with various operators', () => {
      expect(evaluateCondition('drone_1_altitude >= 10', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('drone_3_altitude < 10', mockDroneStates, mockContext).result).toBe(true)
    })
  })

  describe('Variable Conditions', () => {
    test('variable > threshold: evaluates correctly', () => {
      const result = evaluateCondition('count > 3', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('variable < threshold: evaluates correctly', () => {
      const result = evaluateCondition('threshold < 200', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('variable with decimal: handles floating point', () => {
      const contextWithDecimal: ExecutionContext = {
        ...mockContext,
        variables: new Map([['temperature', 25.5]]),
      }
      const result = evaluateCondition('temperature > 25.0', mockDroneStates, contextWithDecimal)
      expect(result.result).toBe(true)
    })

    test('undefined variable: returns false', () => {
      const result = evaluateCondition('unknown_var > 10', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('variable with various operators: all work', () => {
      expect(evaluateCondition('count == 5', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count === 5', mockDroneStates, mockContext).result).toBe(true)
      // Note: != and !== operators not supported by regex pattern
    })
  })

  describe('Elapsed Time Conditions', () => {
    test('elapsed_time > threshold: evaluates correctly', () => {
      const result = evaluateCondition('elapsed_time > 4', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('elapsed_time < threshold: evaluates correctly', () => {
      const result = evaluateCondition('elapsed_time < 10', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('elapsed_time: returns false when start time not set', () => {
      const noStartContext: ExecutionContext = {
        ...mockContext,
        executionStartTime: undefined,
      }
      const result = evaluateCondition('elapsed_time > 5', mockDroneStates, noStartContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Logical Operators', () => {
    test('AND operator: both conditions must be true', () => {
      const result = evaluateCondition('battery > 50 AND altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('AND operator: false when one condition fails', () => {
      const result = evaluateCondition('battery > 70 AND altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('&& operator: works like AND', () => {
      const result = evaluateCondition('battery > 50 && altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('OR operator: true when any condition is true', () => {
      const result = evaluateCondition('battery > 70 OR altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('OR operator: false when both conditions fail', () => {
      const result = evaluateCondition('battery > 100 OR altitude > 100', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('|| operator: works like OR', () => {
      const result = evaluateCondition('battery > 70 || altitude > 8', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('complex nested conditions: evaluates correctly', () => {
      const result = evaluateCondition('count > 3 AND threshold < 200 OR battery > 100', mockDroneStates, mockContext)
      // (count > 3 AND threshold < 200) OR (battery > 100)
      // (true AND true) OR (false) = true
      expect(result.result).toBe(true)
    })
  })

  describe('Boolean Literals', () => {
    test('true literal: returns true', () => {
      const result = evaluateCondition('true', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('false literal: returns false', () => {
      const result = evaluateCondition('false', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Unknown Conditions', () => {
    test('unknown condition: returns false', () => {
      const result = evaluateCondition('some_unknown_condition', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })

    test('malformed condition: returns false', () => {
      const result = evaluateCondition('battery >> 50', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })
  })

  describe('Operator Comparison Tests', () => {
    test('> operator: works correctly', () => {
      expect(evaluateCondition('count > 4', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count > 5', mockDroneStates, mockContext).result).toBe(false)
    })

    test('>= operator: works correctly', () => {
      expect(evaluateCondition('count >= 5', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count >= 6', mockDroneStates, mockContext).result).toBe(false)
    })

    test('< operator: works correctly', () => {
      expect(evaluateCondition('count < 6', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count < 5', mockDroneStates, mockContext).result).toBe(false)
    })

    test('<= operator: works correctly', () => {
      expect(evaluateCondition('count <= 5', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count <= 4', mockDroneStates, mockContext).result).toBe(false)
    })

    test('== operator: works correctly', () => {
      expect(evaluateCondition('count == 5', mockDroneStates, mockContext).result).toBe(true)
      expect(evaluateCondition('count == 6', mockDroneStates, mockContext).result).toBe(false)
    })

    test('!= operator: not supported by variable regex pattern', () => {
      // The regex /^(\w+)\s*([><=]+)\s*([0-9.]+)$/ doesn't capture ! character
      // So != operator falls through to "unknown condition"
      expect(evaluateCondition('count != 6', mockDroneStates, mockContext).result).toBe(false)
      expect(evaluateCondition('count != 5', mockDroneStates, mockContext).result).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    test('whitespace handling: trims correctly', () => {
      const result = evaluateCondition('  count > 3  ', mockDroneStates, mockContext)
      expect(result.result).toBe(true)
    })

    test('case sensitivity: condition keywords', () => {
      const result1 = evaluateCondition('all_connected', mockDroneStates.map(d => ({ ...d, isActive: true })), mockContext)
      const result2 = evaluateCondition('ALL_CONNECTED', mockDroneStates.map(d => ({ ...d, isActive: true })), mockContext)
      expect(result1.result).toBe(true)
      expect(result2.result).toBe(false) // Case sensitive
    })

    test('empty condition: returns false', () => {
      const result = evaluateCondition('', mockDroneStates, mockContext)
      expect(result.result).toBe(false)
    })
  })
})

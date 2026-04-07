/**
 * Interpreter Unit Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Interpreter } from '@/services/execution/interpreter'
import type { IConnectionService } from '@/services/connection'
import { MAVLinkConnectionService } from '@/services/connection/MAVLinkConnectionService'
import type {
  ExecutableNode,
  CommandNode,
  SequenceNode,
  RepeatNode,
  ForLoopNode,
  WhileLoopNode,
  UntilLoopNode,
  IfNode,
  IfElseNode,
  WaitNode,
  VariableSetNode,
  FunctionDefNode,
  FunctionCallNode,
} from '@/types/execution'
import type { Command, CommandResponse, DroneState } from '@/types/websocket'
import { CommandAction } from '@/constants/commands'

describe('Interpreter', () => {
  let mockConnectionService: IConnectionService
  let interpreter: Interpreter
  let mockDroneStates: DroneState[]

  beforeEach(() => {
    // Mock connection service
    mockConnectionService = {
      sendCommands: vi.fn().mockResolvedValue({ success: true } as CommandResponse),
    } as unknown as IConnectionService

    interpreter = new Interpreter(mockConnectionService)

    mockDroneStates = [
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
    ]

    interpreter.updateDroneStates(mockDroneStates)
  })

  describe('Execution State Management', () => {
    test('initial state is idle', () => {
      const state = interpreter.getState()
      expect(state.status).toBe('idle')
      expect(state.currentNodeId).toBeNull()
      expect(state.error).toBeNull()
    })

    test('state changes to running when executing', async () => {
      const stateChanges: string[] = []
      interpreter.setStateListener((state) => {
        stateChanges.push(state.status)
      })

      const commandNode: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
      }

      await interpreter.execute(commandNode)

      expect(stateChanges).toContain('running')
      expect(stateChanges).toContain('completed')
    })

    test('state changes to completed after successful execution', async () => {
      const commandNode: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.LAND_ALL, params: {} },
      }

      const result = await interpreter.execute(commandNode)

      expect(result.success).toBe(true)
      expect(interpreter.getState().status).toBe('completed')
    })

    test('state changes to error on failed command', async () => {
      mockConnectionService.sendCommands = vi.fn().mockResolvedValue({
        success: false,
        error: 'Connection failed',
      })

      const commandNode: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
      }

      const result = await interpreter.execute(commandNode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Command failed')
      expect(interpreter.getState().status).toBe('error')
    })
  })

  describe('Command Execution', () => {
    test('executes single command node', async () => {
      const commandNode: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
      }

      const result = await interpreter.execute(commandNode)

      expect(result.success).toBe(true)
      expect(result.executedNodes).toBe(1)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledWith([commandNode.command], undefined)
    })

    test('executes multiple commands in sequence', async () => {
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'cmd1',
            type: 'command',
            command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
          },
          {
            id: 'cmd2',
            type: 'command',
            command: { action: CommandAction.HOVER, params: {} },
          },
          {
            id: 'cmd3',
            type: 'command',
            command: { action: CommandAction.LAND_ALL, params: {} },
          },
        ],
      }

      const result = await interpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(3)
    })
  })

  describe('Repeat Loop Execution', () => {
    test('executes repeat loop correct number of times', async () => {
      const repeatNode: RepeatNode = {
        id: 'repeat1',
        type: 'repeat',
        times: 3,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(repeatNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(3)
    })

    test('executes nested repeats correctly', async () => {
      const nestedRepeat: RepeatNode = {
        id: 'repeat1',
        type: 'repeat',
        times: 2,
        body: {
          id: 'repeat2',
          type: 'repeat',
          times: 3,
          body: {
            id: 'cmd1',
            type: 'command',
            command: { action: CommandAction.HOVER, params: {} },
          },
        },
      }

      const result = await interpreter.execute(nestedRepeat)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(2 * 3) // 6 times
    })

    test('flattens repeated commands into a single MAVLink batch', async () => {
      const mavlinkService = new MAVLinkConnectionService()
      const sendCommandsSpy = vi
        .spyOn(mavlinkService, 'sendCommands')
        .mockResolvedValue({ success: true, timestamp: Date.now() })

      const mavlinkInterpreter = new Interpreter(mavlinkService)
      mavlinkInterpreter.updateDroneStates(mockDroneStates)

      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'cmd1',
            type: 'command',
            command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
          },
          {
            id: 'repeat1',
            type: 'repeat',
            times: 2,
            body: {
              id: 'seq2',
              type: 'sequence',
              children: [
                {
                  id: 'cmd2',
                  type: 'command',
                  command: { action: CommandAction.HOVER, params: {} },
                },
                {
                  id: 'cmd3',
                  type: 'command',
                  command: { action: CommandAction.LAND_ALL, params: {} },
                },
              ],
            },
          },
        ],
      }

      const result = await mavlinkInterpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      expect(sendCommandsSpy).toHaveBeenCalledTimes(1)
      expect(sendCommandsSpy).toHaveBeenCalledWith([
        { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        { action: CommandAction.HOVER, params: {} },
        { action: CommandAction.LAND_ALL, params: {} },
        { action: CommandAction.HOVER, params: {} },
        { action: CommandAction.LAND_ALL, params: {} },
      ])
    })
  })

  describe('For Loop Execution', () => {
    test('executes for loop with incrementing variable', async () => {
      const stateChanges: Map<string, number>[] = []
      interpreter.setStateListener((state) => {
        stateChanges.push(new Map(state.context.variables))
      })

      const forLoopNode: ForLoopNode = {
        id: 'for1',
        type: 'for_loop',
        variable: 'i',
        from: 1,
        to: 3,
        by: 1,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(forLoopNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(3)
    })

    test('for loop with decrementing variable', async () => {
      const forLoopNode: ForLoopNode = {
        id: 'for1',
        type: 'for_loop',
        variable: 'i',
        from: 5,
        to: 1,
        by: -1,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(forLoopNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(5) // 5, 4, 3, 2, 1
    })

    test('for loop with step size > 1', async () => {
      const forLoopNode: ForLoopNode = {
        id: 'for1',
        type: 'for_loop',
        variable: 'i',
        from: 0,
        to: 10,
        by: 2,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(forLoopNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(6) // 0, 2, 4, 6, 8, 10
    })
  })

  describe('While Loop Execution', () => {
    test('executes while loop until condition becomes false', async () => {
      // Create a sequence that initializes the variable first, then runs the while loop
      const sequenceNode: SequenceNode = {
        id: 'seq_root',
        type: 'sequence',
        children: [
          {
            id: 'init',
            type: 'variable_set',
            variableName: 'count',
            value: 3,
          },
          {
            id: 'while1',
            type: 'while_loop',
            condition: 'count > 0',
            maxIterations: 5,
            body: {
              id: 'seq1',
              type: 'sequence',
              children: [
                {
                  id: 'var1',
                  type: 'variable_set',
                  variableName: 'count',
                  value: 0, // This will set count to 0, ending the loop
                },
                {
                  id: 'cmd1',
                  type: 'command',
                  command: { action: CommandAction.HOVER, params: {} },
                },
              ],
            },
          },
        ],
      }

      const result = await interpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      // Should execute once: condition is true, then sets count to 0
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })

    test('while loop respects maxIterations', async () => {
      const whileLoop: WhileLoopNode = {
        id: 'while1',
        type: 'while_loop',
        condition: 'true', // Always true
        maxIterations: 5,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(whileLoop)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(5) // Max 5 iterations
    })

    test('while loop exits immediately if condition is false', async () => {
      const whileLoop: WhileLoopNode = {
        id: 'while1',
        type: 'while_loop',
        condition: 'false',
        maxIterations: 10,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(whileLoop)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).not.toHaveBeenCalled()
    })
  })

  describe('Until Loop Execution', () => {
    test('executes until loop body at least once', async () => {
      const untilLoop: UntilLoopNode = {
        id: 'until1',
        type: 'until_loop',
        condition: 'true', // Condition immediately true
        maxIterations: 10,
        body: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.HOVER, params: {} },
        },
      }

      const result = await interpreter.execute(untilLoop)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1) // Executes once, then condition is true
    })

    test('until loop repeats while condition is false', async () => {
      const untilLoop: UntilLoopNode = {
        id: 'until1',
        type: 'until_loop',
        condition: 'count > 3',
        maxIterations: 10,
        body: {
          id: 'seq1',
          type: 'sequence',
          children: [
            {
              id: 'cmd1',
              type: 'command',
              command: { action: CommandAction.HOVER, params: {} },
            },
            {
              id: 'var1',
              type: 'variable_set',
              variableName: 'count',
              value: 5, // This will make condition true
            },
          ],
        },
      }

      interpreter.getState().context.variables.set('count', 0)

      const result = await interpreter.execute(untilLoop)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })
  })

  describe('If Conditional Execution', () => {
    test('executes then branch when condition is true', async () => {
      const ifNode: IfNode = {
        id: 'if1',
        type: 'if',
        condition: 'true',
        thenBranch: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        },
      }

      const result = await interpreter.execute(ifNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })

    test('skips then branch when condition is false', async () => {
      const ifNode: IfNode = {
        id: 'if1',
        type: 'if',
        condition: 'false',
        thenBranch: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        },
      }

      const result = await interpreter.execute(ifNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).not.toHaveBeenCalled()
    })

    test('evaluates drone state conditions', async () => {
      const ifNode: IfNode = {
        id: 'if1',
        type: 'if',
        condition: 'all_connected',
        thenBranch: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        },
      }

      const result = await interpreter.execute(ifNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })
  })

  describe('If-Else Conditional Execution', () => {
    test('executes then branch when condition is true', async () => {
      const ifElseNode: IfElseNode = {
        id: 'ifelse1',
        type: 'if_else',
        condition: 'true',
        thenBranch: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        },
        elseBranch: {
          id: 'cmd2',
          type: 'command',
          command: { action: CommandAction.LAND_ALL, params: {} },
        },
      }

      const result = await interpreter.execute(ifElseNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledWith([
        {
          action: CommandAction.TAKEOFF_ALL,
          params: { altitude: 10 },
        },
      ], undefined)
    })

    test('executes else branch when condition is false', async () => {
      const ifElseNode: IfElseNode = {
        id: 'ifelse1',
        type: 'if_else',
        condition: 'false',
        thenBranch: {
          id: 'cmd1',
          type: 'command',
          command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
        },
        elseBranch: {
          id: 'cmd2',
          type: 'command',
          command: { action: CommandAction.LAND_ALL, params: {} },
        },
      }

      const result = await interpreter.execute(ifElseNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledWith([
        {
          action: CommandAction.LAND_ALL,
          params: {},
        },
      ], undefined)
    })

    test('evaluates condition before flattening MAVLink repeats', async () => {
      const mavlinkService = new MAVLinkConnectionService()
      const sendCommandsSpy = vi
        .spyOn(mavlinkService, 'sendCommands')
        .mockResolvedValue({ success: true, timestamp: Date.now() })

      const mavlinkInterpreter = new Interpreter(mavlinkService)
      mavlinkInterpreter.updateDroneStates(mockDroneStates)

      const sequenceNode: SequenceNode = {
        id: 'seq_if_repeat',
        type: 'sequence',
        children: [
          {
            id: 'ifelse1',
            type: 'if_else',
            condition: 'false',
            thenBranch: {
              id: 'cmd_then',
              type: 'command',
              command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 5 } },
            },
            elseBranch: {
              id: 'cmd_else',
              type: 'command',
              command: { action: CommandAction.LAND_ALL, params: {} },
            },
          },
          {
            id: 'repeat1',
            type: 'repeat',
            times: 2,
            body: {
              id: 'cmd_hover',
              type: 'command',
              command: { action: CommandAction.HOVER, params: {} },
            },
          },
        ],
      }

      const result = await mavlinkInterpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      expect(sendCommandsSpy).toHaveBeenCalledWith([
        { action: CommandAction.LAND_ALL, params: {} },
        { action: CommandAction.HOVER, params: {} },
        { action: CommandAction.HOVER, params: {} },
      ])
    })
  })

  describe('Wait Node Execution', () => {
    test('waits for specified duration', async () => {
      const waitNode: WaitNode = {
        id: 'wait1',
        type: 'wait',
        duration: 0.1, // 100ms
      }

      const start = Date.now()
      const result = await interpreter.execute(waitNode)
      const elapsed = Date.now() - start

      expect(result.success).toBe(true)
      expect(elapsed).toBeGreaterThanOrEqual(95) // Allow some margin
    })
  })

  describe('Variable Management', () => {
    test('sets and retrieves variables', async () => {
      const varSetNode: VariableSetNode = {
        id: 'var1',
        type: 'variable_set',
        variableName: 'myVar',
        value: 42,
      }

      await interpreter.execute(varSetNode)

      const state = interpreter.getState()
      expect(state.context.variables.get('myVar')).toBe(42)
    })

    test('variables are accessible in conditions', async () => {
      // Set variable and use it in the same execution tree
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'var1',
            type: 'variable_set',
            variableName: 'threshold',
            value: 100,
          },
          {
            id: 'if1',
            type: 'if',
            condition: 'threshold > 50',
            thenBranch: {
              id: 'cmd1',
              type: 'command',
              command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
            },
          },
        ],
      }

      const result = await interpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })
  })

  describe('Function Definition and Calls', () => {
    test('defines and calls a function', async () => {
      // Define and call function in single execution tree
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'func1',
            type: 'function_def',
            functionName: 'myFunc',
            body: {
              id: 'cmd1',
              type: 'command',
              command: { action: CommandAction.HOVER, params: {} },
            },
          },
          {
            id: 'call1',
            type: 'function_call',
            functionName: 'myFunc',
          },
        ],
      }

      const result = await interpreter.execute(sequenceNode)

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(1)
    })

    test('throws error when calling undefined function', async () => {
      const funcCallNode: FunctionCallNode = {
        id: 'call1',
        type: 'function_call',
        functionName: 'unknownFunc',
      }

      const result = await interpreter.execute(funcCallNode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not defined')
    })

    test('prevents infinite recursion with max call depth', async () => {
      // Define and call recursive function in single tree
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'func1',
            type: 'function_def',
            functionName: 'recursiveFunc',
            body: {
              id: 'call1',
              type: 'function_call',
              functionName: 'recursiveFunc', // Calls itself
            },
          },
          {
            id: 'call2',
            type: 'function_call',
            functionName: 'recursiveFunc',
          },
        ],
      }

      const result = await interpreter.execute(sequenceNode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Maximum function call depth')
    })
  })

  describe('Stop and Pause Controls', () => {
    test('stop() interrupts execution', async () => {
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: Array.from({ length: 10 }, (_, i) => ({
          id: `cmd${i}`,
          type: 'command' as const,
          command: { action: CommandAction.HOVER, params: {} },
        })),
      }

      // Start execution
      const executionPromise = interpreter.execute(sequenceNode)

      // Stop after a small delay
      setTimeout(() => interpreter.stop(), 50)

      const result = await executionPromise

      expect(result.success).toBe(false)
      expect(result.error).toContain('stopped')
      // Should have executed fewer than 10 commands
      expect(mockConnectionService.sendCommands).toHaveBeenCalled()
    })

    test('pause() and resume() work correctly', async () => {
      const sequenceNode: SequenceNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          {
            id: 'cmd1',
            type: 'command',
            command: { action: CommandAction.HOVER, params: {} },
          },
          {
            id: 'cmd2',
            type: 'command',
            command: { action: CommandAction.HOVER, params: {} },
          },
        ],
      }

      const executionPromise = interpreter.execute(sequenceNode)

      // Pause after first command
      setTimeout(() => interpreter.pause(), 150)
      // Resume after pause
      setTimeout(() => interpreter.resume(), 300)

      const result = await executionPromise

      expect(result.success).toBe(true)
      expect(mockConnectionService.sendCommands).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    test('handles command execution errors', async () => {
      mockConnectionService.sendCommands = vi.fn().mockResolvedValue({
        success: false,
        error: 'Drone connection lost',
      })

      const commandNode: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.TAKEOFF_ALL, params: { altitude: 10 } },
      }

      const result = await interpreter.execute(commandNode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Command failed')
      expect(interpreter.getState().status).toBe('error')
    })

    test('execution continues after resetting from error state', async () => {
      // First execution fails
      mockConnectionService.sendCommands = vi.fn().mockResolvedValue({
        success: false,
        error: 'Error',
      })

      const cmdNode1: CommandNode = {
        id: 'cmd1',
        type: 'command',
        command: { action: CommandAction.HOVER, params: {} },
      }

      const result1 = await interpreter.execute(cmdNode1)
      expect(result1.success).toBe(false)

      // Fix the service and execute again
      mockConnectionService.sendCommands = vi.fn().mockResolvedValue({ success: true })

      const cmdNode2: CommandNode = {
        id: 'cmd2',
        type: 'command',
        command: { action: CommandAction.HOVER, params: {} },
      }

      const result2 = await interpreter.execute(cmdNode2)
      expect(result2.success).toBe(true)
    })
  })
})

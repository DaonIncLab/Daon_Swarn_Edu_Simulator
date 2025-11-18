/**
 * Test Connection Service
 *
 * Simulates Unity server for testing without Unity
 * - Multiple drone simulation
 * - Command execution simulation
 * - Telemetry generation matching Unity format
 */

import { ConnectionStatus } from '@/constants/connection'
import { MessageType, CommandAction } from '@/constants/commands'
import type { Command } from '@/types/websocket'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  CommandResponse,
} from './types'
import { DroneSimulator } from './DroneSimulator'
import { log } from '@/utils/logger'

/**
 * Test Connection Service
 */
export class TestConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}
  private simulator: DroneSimulator | null = null
  private messageListener: ((message: any) => void) | null = null
  private droneCount: number = 4

  constructor(droneCount: number = 4) {
    this.droneCount = droneCount
  }

  async connect(config: ConnectionConfig): Promise<void> {
    log.info('Connecting to test mode...')

    this._updateStatus(ConnectionStatus.CONNECTING)

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Initialize simulator
    this.simulator = new DroneSimulator(this.droneCount)

    // Start telemetry updates
    this.simulator.start((drones) => {
      if (this.messageListener) {
        this.messageListener({
          type: MessageType.TELEMETRY,
          drones,
          timestamp: Date.now(),
        })
      }
    })

    this._updateStatus(ConnectionStatus.CONNECTED)

    // Send ACK message
    if (this.messageListener) {
      this.messageListener({
        type: MessageType.ACK,
        message: 'Test mode connected successfully',
        timestamp: Date.now(),
      })
    }

    log.info('Connected successfully (simulating drones)', { droneCount: this.droneCount })
  }

  async disconnect(): Promise<void> {
    log.info('Disconnecting...')

    if (this.simulator) {
      this.simulator.stop()
      this.simulator = null
    }

    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    log.debug('Command sent', { command })

    if (!this.simulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    // Execute command on simulator
    this._executeCommand(command)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      success: true,
      commandId: `test-${Date.now()}`,
      timestamp: Date.now(),
    }
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    log.info('Executing script', { commandCount: commands.length })

    if (!this.simulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    // Send ACK for script received
    if (this.messageListener) {
      this.messageListener({
        type: MessageType.ACK,
        message: `Received script with ${commands.length} commands`,
        timestamp: Date.now(),
      })
    }

    // Execute commands sequentially with delays
    this._executeCommandSequence(commands)

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  /**
   * Execute commands sequentially (async)
   */
  private async _executeCommandSequence(commands: Command[]): Promise<void> {
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]

      // Log command start
      if (this.listeners.onLog) {
        this.listeners.onLog(`[Test] Executing command ${i + 1}/${commands.length}: ${command.action}`)
      }

      // Execute command
      this._executeCommand(command)

      // Wait based on command type
      const delay = this._getCommandDelay(command)
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Send command_finish message
      if (this.messageListener) {
        this.messageListener({
          type: MessageType.COMMAND_FINISH,
          commandIndex: i,
          message: `Command ${command.action} completed`,
          timestamp: Date.now(),
        })
      }

      // Log command completion
      if (this.listeners.onLog) {
        this.listeners.onLog(`[Test] Command ${i + 1} completed: ${command.action}`)
      }
    }

    log.info('All commands completed')
  }

  /**
   * Execute single command on simulator
   */
  private _executeCommand(command: Command): void {
    if (!this.simulator) return

    const { action, params } = command

    switch (action) {
      case CommandAction.TAKEOFF_ALL:
        this.simulator.executeTakeoffAll((params as any).altitude || 2)
        break

      case CommandAction.LAND_ALL:
        this.simulator.executeLandAll()
        break

      case CommandAction.SET_FORMATION:
        this.simulator.executeSetFormation(
          (params as any).type,
          {
            rows: (params as any).rows,
            cols: (params as any).cols,
            spacing: (params as any).spacing,
            radius: (params as any).radius,
          }
        )
        break

      case CommandAction.MOVE_FORMATION:
        this.simulator.executeMoveFormation(
          (params as any).direction,
          (params as any).distance
        )
        break

      case CommandAction.MOVE_DRONE:
        this.simulator.executeMoveDrone(
          (params as any).droneId,
          (params as any).x,
          (params as any).y,
          (params as any).z
        )
        break

      case CommandAction.ROTATE_DRONE:
        this.simulator.executeRotateDrone(
          (params as any).droneId,
          (params as any).yaw
        )
        break

      case CommandAction.WAIT:
        // Wait is handled by delay, no action needed
        break

      default:
        log.warn('Unknown command action', { action })
    }
  }

  /**
   * Get delay for command execution simulation
   */
  private _getCommandDelay(command: Command): number {
    const { action, params } = command

    switch (action) {
      case CommandAction.TAKEOFF_ALL:
        return 3000 // 3 seconds to takeoff

      case CommandAction.LAND_ALL:
        return 3000 // 3 seconds to land

      case CommandAction.SET_FORMATION:
        return 2000 // 2 seconds to set formation

      case CommandAction.MOVE_FORMATION:
        const distance = (params as any).distance || 1
        return Math.max(1000, distance * 500) // 500ms per meter, min 1s

      case CommandAction.MOVE_DRONE:
        return 2000 // 2 seconds to move single drone

      case CommandAction.ROTATE_DRONE:
        return 1000 // 1 second to rotate

      case CommandAction.WAIT:
        return ((params as any).duration || 1) * 1000 // duration in seconds

      default:
        return 1000 // 1 second default
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

  /**
   * Set message listener for WebSocket-style messages
   */
  setMessageListener(listener: (message: any) => void): void {
    this.messageListener = listener
  }

  async emergencyStop(): Promise<CommandResponse> {
    log.warn('EMERGENCY STOP')

    if (this.simulator) {
      this.simulator.emergencyStop()
    }

    if (this.listeners.onLog) {
      this.listeners.onLog('[Test] Emergency stop activated!')
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  async ping(): Promise<number> {
    // Simulate ping latency (10-50ms random)
    const latency = Math.random() * 40 + 10
    return Promise.resolve(latency)
  }

  cleanup(): void {
    if (this.simulator) {
      this.simulator.stop()
      this.simulator = null
    }
    this.listeners = {}
    this.messageListener = null
  }

  /**
   * Set number of drones for simulation
   */
  setDroneCount(count: number): void {
    this.droneCount = count

    if (this.simulator) {
      this.simulator.setDroneCount(count)
    }
  }

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }
}

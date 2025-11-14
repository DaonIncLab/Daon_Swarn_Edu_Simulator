/**
 * MAVLink Connection Service
 *
 * Implements IConnectionService using MAVLink protocol
 * Supports both simulation and real drone connection
 */

import { ConnectionStatus } from '@/constants/connection'
import { CommandAction } from '@/constants/commands'
import type { Command } from '@/types/websocket'
import type { DroneState } from '@/types/websocket'
import type { IConnectionService } from './IConnectionService'
import type {
  ConnectionConfig,
  ConnectionEventListeners,
  CommandResponse,
} from './types'
import { MAVLinkSimulator, type MAVLinkTelemetry } from './MAVLinkSimulator'
import { MAVLinkConverter } from '@/services/mavlink/MAVLinkConverter'
import { coordinateConverter } from '@/services/mavlink/CoordinateConverter'

/**
 * MAVLink Connection Service
 */
export class MAVLinkConnectionService implements IConnectionService {
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private listeners: ConnectionEventListeners = {}
  private mavlinkSimulator: MAVLinkSimulator | null = null
  private droneCount: number = 4
  private lastTelemetry: Map<number, Partial<DroneState>> = new Map()
  private isSimulation: boolean = true

  constructor(droneCount: number = 4) {
    this.droneCount = droneCount
  }

  async connect(config: ConnectionConfig): Promise<void> {
    console.log('[MAVLink] Connecting...', config)

    if (!config.mavlink) {
      throw new Error('MAVLink configuration is required')
    }

    this._updateStatus(ConnectionStatus.CONNECTING)

    // Set home position for coordinate conversion
    // Default: San Francisco (37.7749, -122.4194)
    coordinateConverter.setHome(37.7749, -122.4194, 0)

    // Determine connection type
    const connType = config.mavlink.connectionType || 'simulation'
    this.isSimulation = connType === 'simulation'

    if (this.isSimulation) {
      await this._initializeSimulation(config)
    } else {
      // Real drone connection (Phase 2)
      throw new Error(
        'Real MAVLink hardware connection not yet implemented. ' +
          'Please use connectionType: "simulation"'
      )
    }

    this._updateStatus(ConnectionStatus.CONNECTED)

    if (this.listeners.onLog) {
      this.listeners.onLog(
        `[MAVLink] Connected (${this.isSimulation ? 'Simulation' : 'Real'}) with ${this.droneCount} drones`
      )
    }
  }

  /**
   * Initialize MAVLink simulation
   */
  private async _initializeSimulation(config: ConnectionConfig): Promise<void> {
    console.log('[MAVLink] Initializing simulator...')

    // Override drone count from config if provided
    if (config.mavlink?.droneCount) {
      this.droneCount = config.mavlink.droneCount
    }

    // Create simulator
    this.mavlinkSimulator = new MAVLinkSimulator(this.droneCount)

    // Start telemetry streaming
    this.mavlinkSimulator.start((telemetry: MAVLinkTelemetry[]) => {
      this._handleTelemetry(telemetry)
    })

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('[MAVLink] Simulator ready')
  }

  /**
   * Handle incoming MAVLink telemetry messages
   */
  private _handleTelemetry(telemetry: MAVLinkTelemetry[]): void {
    for (const msg of telemetry) {
      const systemId = msg.systemId
      const droneId = systemId - 1 // Convert to 0-based

      // Initialize telemetry entry if needed
      if (!this.lastTelemetry.has(droneId)) {
        this.lastTelemetry.set(droneId, {
          id: droneId,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          battery: 100,
          status: 'landed',
          isActive: false,
        })
      }

      const state = this.lastTelemetry.get(droneId)!

      // Update based on message type
      switch (msg.msgType) {
        case 'GLOBAL_POSITION_INT':
          try {
            // Convert GPS to local coordinates
            const localPos = coordinateConverter.mavlinkGlobalToLocal(
              msg.data.lat,
              msg.data.lon,
              msg.data.alt,
              msg.data.relative_alt
            )

            state.position = {
              x: localPos.x,
              y: localPos.y,
              z: localPos.z,
            }

            state.velocity = {
              x: msg.data.vx / 100, // cm/s to m/s
              y: msg.data.vy / 100,
              z: msg.data.vz / 100,
            }
          } catch (error) {
            // If coordinate conversion fails, use simulation defaults
            console.warn('[MAVLink] Coordinate conversion error:', error)
          }
          break

        case 'BATTERY_STATUS':
          state.battery = msg.data.battery_remaining
          break

        case 'ATTITUDE':
          state.rotation = {
            x: (msg.data.roll * 180) / Math.PI,
            y: (msg.data.pitch * 180) / Math.PI,
            z: (msg.data.yaw * 180) / Math.PI,
          }
          break

        case 'HEARTBEAT':
          state.status = MAVLinkConverter.mavStateTodroneStatus(msg.data.system_status)
          state.isActive = (msg.data.base_mode & 0x80) !== 0
          break
      }
    }

    // Emit telemetry updates
    this._emitTelemetryUpdates()
  }

  /**
   * Emit telemetry updates to listeners
   */
  private _emitTelemetryUpdates(): void {
    if (!this.listeners.onTelemetry) return

    for (const [droneId, state] of this.lastTelemetry) {
      this.listeners.onTelemetry({
        droneId: String(droneId),
        position: state.position,
        battery: state.battery,
        status: state.status,
        timestamp: Date.now(),
      })
    }
  }

  async disconnect(): Promise<void> {
    console.log('[MAVLink] Disconnecting...')

    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.stop()
      this.mavlinkSimulator = null
    }

    this.lastTelemetry.clear()
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    console.log('[MAVLink] Sending command:', command.action)

    if (!this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    try {
      // Handle formation commands specially
      if (
        command.action === CommandAction.SET_FORMATION ||
        command.action === CommandAction.MOVE_FORMATION
      ) {
        return await this._handleFormationCommand(command)
      }

      // Convert Blockly command to MAVLink
      const mavlinkCmds = MAVLinkConverter.blocklyToMAVLink(command, 0)

      if (mavlinkCmds.length === 0) {
        // Commands like WAIT are handled by GCS timing
        return {
          success: true,
          timestamp: Date.now(),
        }
      }

      // Execute each MAVLink command
      for (const params of mavlinkCmds) {
        this.mavlinkSimulator.executeMAVLinkCommand({
          command: params.command,
          targetSystem: params.target_system || 1,
          targetComponent: 1,
          params,
        })
      }

      return {
        success: true,
        commandId: `mavlink-${Date.now()}`,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[MAVLink] Command execution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Handle formation commands (SET_FORMATION, MOVE_FORMATION)
   */
  private async _handleFormationCommand(command: Command): Promise<CommandResponse> {
    if (!this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    try {
      // Get all drone IDs
      const droneIds = Array.from({ length: this.droneCount }, (_, i) => i)

      // Convert formation command to individual waypoints
      const formationWaypoints = MAVLinkConverter.convertFormationCommand(command, droneIds)

      // Execute waypoint for each drone
      for (const [droneId, params] of formationWaypoints) {
        this.mavlinkSimulator.executeMAVLinkCommand({
          command: params.command,
          targetSystem: droneId + 1,
          targetComponent: 1,
          params,
        })
      }

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] Formation command executed: ${command.action} for ${droneIds.length} drones`
        )
      }

      return {
        success: true,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[MAVLink] Formation command error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    console.log('[MAVLink] Sending command sequence:', commands.length)

    if (!this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    try {
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i]

        if (this.listeners.onLog) {
          this.listeners.onLog(
            `[MAVLink] Executing ${i + 1}/${commands.length}: ${command.action}`
          )
        }

        // Execute command
        const response = await this.sendCommand(command)

        if (!response.success) {
          return response // Return first error
        }

        // Wait for command execution
        const delay = this._getCommandDelay(command)
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      if (this.listeners.onLog) {
        this.listeners.onLog(`[MAVLink] All ${commands.length} commands executed successfully`)
      }

      return {
        success: true,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('[MAVLink] Command sequence error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Get execution delay for command (in milliseconds)
   */
  private _getCommandDelay(command: Command): number {
    switch (command.action) {
      case CommandAction.TAKEOFF_ALL:
        return 3000 // 3 seconds for takeoff

      case CommandAction.LAND_ALL:
        return 3000 // 3 seconds for landing

      case CommandAction.SET_FORMATION: {
        // Delay based on formation size
        const droneCount = this.droneCount
        return Math.max(2000, droneCount * 200) // 200ms per drone, min 2s
      }

      case CommandAction.MOVE_FORMATION:
      case CommandAction.MOVE_DRONE: {
        // Delay based on distance (assuming 2 m/s speed)
        const distance = (command.params as any)?.distance || 1
        return Math.max(1000, distance * 500) // 500ms per meter, min 1s
      }

      case CommandAction.WAIT: {
        const duration = (command.params as any)?.duration || 1
        return duration * 1000
      }

      default:
        return 1000 // Default 1 second
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

  async emergencyStop(): Promise<CommandResponse> {
    console.warn('[MAVLink] EMERGENCY STOP!')

    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.emergencyStop()

      if (this.listeners.onLog) {
        this.listeners.onLog('[MAVLink] Emergency stop - all drones landing immediately!')
      }

      return {
        success: true,
        timestamp: Date.now(),
      }
    }

    return {
      success: false,
      error: 'Simulator not initialized',
      timestamp: Date.now(),
    }
  }

  async ping(): Promise<number> {
    // Simulate MAVLink ping latency
    const latency = this.isSimulation ? Math.random() * 20 + 10 : Math.random() * 100 + 50
    return Promise.resolve(latency)
  }

  cleanup(): void {
    console.log('[MAVLink] Cleanup')

    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.stop()
      this.mavlinkSimulator = null
    }

    this.lastTelemetry.clear()
    this.listeners = {}
  }

  // Private helpers

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }
}

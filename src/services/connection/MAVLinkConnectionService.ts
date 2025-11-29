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
import type { MAVLinkTransport } from '@/services/mavlink/MAVLinkTransport'
import { UDPTransport } from '@/services/mavlink/UDPTransport'
import { SerialTransport } from '@/services/mavlink/SerialTransport'
import {
  createHeartbeat,
  createCommandLong,
} from '@/services/mavlink/MAVLinkMessages'
import {
  serializePacket,
  parsePacket,
} from '@/services/mavlink/MAVLinkProtocol'
import { log } from '@/utils/logger'
import { VirtualLeaderFormationController } from '@/services/execution/VirtualLeaderFormation'
import type { PositionSetpointCallback } from '@/services/execution/VirtualLeaderFormation'

/**
 * Formation Control Mode
 * Determines how formation commands are executed
 */
export enum FormationControlMode {
  /**
   * GCS-Coordinated: GCS calculates each drone's position individually
   * - Existing implementation using MAVLinkConverter
   * - Each drone receives independent position setpoints
   */
  GCS_COORDINATED = 'gcs_coordinated',

  /**
   * Virtual Leader: Virtual point moves, drones follow with formation offsets
   * - Smooth synchronized movement
   * - Easier trajectory planning
   * - Formation moves as one cohesive unit
   */
  VIRTUAL_LEADER = 'virtual_leader',
}

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

  // Real connection infrastructure
  private transport: MAVLinkTransport | null = null
  private heartbeatInterval: number | null = null
  private systemId: number = 255 // GCS system ID
  private componentId: number = 190 // GCS component ID

  // Formation control
  private formationMode: FormationControlMode = FormationControlMode.GCS_COORDINATED
  private virtualLeaderController: VirtualLeaderFormationController | null = null

  constructor(droneCount: number = 4) {
    this.droneCount = droneCount
  }

  async connect(config: ConnectionConfig): Promise<void> {
    log.info('Connecting...', { config })

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
      // Real drone connection
      await this._initializeRealConnection(config)
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
    log.info('Initializing simulator...')

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

    log.info('Simulator ready')
  }

  /**
   * Initialize real MAVLink hardware connection
   */
  private async _initializeRealConnection(config: ConnectionConfig): Promise<void> {
    log.info('Initializing real connection...')

    if (!config.mavlink) {
      throw new Error('MAVLink configuration is required')
    }

    const mavConfig = config.mavlink

    // Create appropriate transport
    const transportType = mavConfig.transportType || 'udp'

    if (transportType === 'udp') {
      this.transport = new UDPTransport()
    } else if (transportType === 'serial') {
      this.transport = new SerialTransport()
    } else {
      throw new Error(`Unsupported transport type: ${transportType}`)
    }

    // Set up packet handler
    this.transport.onPacket((packet: Uint8Array) => {
      this._handleIncomingPacket(packet)
    })

    // Set up error handler
    this.transport.onError((error: Error) => {
      log.error('Transport error', { error })
      if (this.listeners.onLog) {
        this.listeners.onLog(`[MAVLink] Error: ${error.message}`)
      }
    })

    // Set up disconnect handler
    this.transport.onDisconnect(() => {
      log.info('Transport disconnected')
      this._stopHeartbeat()
      this._updateStatus(ConnectionStatus.DISCONNECTED)
    })

    // Connect transport
    await this.transport.connect({
      type: transportType,
      host: mavConfig.host,
      port: mavConfig.port,
      device: mavConfig.device,
      baudRate: mavConfig.baudRate,
    })

    // Start heartbeat (1Hz as per MAVLink spec)
    this._startHeartbeat()

    log.info('Real connection established')
  }

  /**
   * Handle incoming MAVLink packet from transport
   */
  private _handleIncomingPacket(packet: Uint8Array): void {
    try {
      // Parse MAVLink packet
      const parsed = parsePacket(packet)

      if (!parsed) {
        log.warn('Failed to parse packet')
        return
      }

      const systemId = parsed.sysid
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

      // Process message based on type
      switch (parsed.msgid) {
        case 33: // GLOBAL_POSITION_INT
          this._processGlobalPosition(state, parsed.payload)
          break

        case 30: // ATTITUDE
          this._processAttitude(state, parsed.payload)
          break

        case 0: // HEARTBEAT
          this._processHeartbeat(state, parsed.payload)
          break

        case 147: // BATTERY_STATUS
          this._processBatteryStatus(state, parsed.payload)
          break

        case 77: // COMMAND_ACK
          this._processCommandAck(parsed.payload)
          break
      }

      // Emit telemetry updates
      this._emitTelemetryUpdates()
    } catch (error) {
      log.error('Packet processing error', { error })
    }
  }

  /**
   * Process GLOBAL_POSITION_INT message
   */
  private _processGlobalPosition(state: Partial<DroneState>, payload: Uint8Array): void {
    // Parse GLOBAL_POSITION_INT (message ID 33)
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

    const lat = view.getInt32(4, true) / 1e7 // degE7 to degrees
    const lon = view.getInt32(8, true) / 1e7
    const alt = view.getInt32(12, true) / 1000 // mm to m
    const relativeAlt = view.getInt32(16, true) / 1000
    const vx = view.getInt16(20, true) / 100 // cm/s to m/s
    const vy = view.getInt16(22, true) / 100
    const vz = view.getInt16(24, true) / 100

    try {
      const localPos = coordinateConverter.mavlinkGlobalToLocal(lat, lon, alt, relativeAlt)
      state.position = { x: localPos.x, y: localPos.y, z: localPos.z }
      state.velocity = { x: vx, y: vy, z: vz }
    } catch (error) {
      log.warn('Coordinate conversion error', { error })
    }
  }

  /**
   * Process ATTITUDE message
   */
  private _processAttitude(state: Partial<DroneState>, payload: Uint8Array): void {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

    const roll = view.getFloat32(4, true)
    const pitch = view.getFloat32(8, true)
    const yaw = view.getFloat32(12, true)

    state.rotation = {
      x: (roll * 180) / Math.PI,
      y: (pitch * 180) / Math.PI,
      z: (yaw * 180) / Math.PI,
    }
  }

  /**
   * Process HEARTBEAT message
   */
  private _processHeartbeat(state: Partial<DroneState>, payload: Uint8Array): void {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

    const baseMode = view.getUint8(6)
    const systemStatus = view.getUint8(8)

    state.status = MAVLinkConverter.mavStateTodroneStatus(systemStatus)
    state.isActive = (baseMode & 0x80) !== 0 // MAV_MODE_FLAG_SAFETY_ARMED
  }

  /**
   * Process BATTERY_STATUS message
   */
  private _processBatteryStatus(state: Partial<DroneState>, payload: Uint8Array): void {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

    const batteryRemaining = view.getInt8(33) // Battery remaining percentage
    state.battery = batteryRemaining
  }

  /**
   * Process COMMAND_ACK message
   */
  private _processCommandAck(payload: Uint8Array): void {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

    const command = view.getUint16(0, true)
    const result = view.getUint8(2)

    if (this.listeners.onLog) {
      const resultStr = result === 0 ? 'ACCEPTED' : `FAILED (${result})`
      this.listeners.onLog(`[MAVLink] Command ${command} ${resultStr}`)
    }
  }

  /**
   * Start sending heartbeat messages (1Hz)
   */
  private _startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      return
    }

    const sendHeartbeat = () => {
      if (!this.transport || !this.transport.isOpen()) {
        return
      }

      // Create HEARTBEAT message
      const heartbeatPacket = createHeartbeat(
        6, // MAV_TYPE_GCS
        0, // MAV_AUTOPILOT_GENERIC
        0, // base_mode
        0, // custom_mode
        4  // MAV_STATE_ACTIVE
      )

      const packet = {
        ...heartbeatPacket,
        sysid: this.systemId,
        compid: this.componentId,
      }

      this.transport.sendPacket(serializePacket(packet)).catch((err) => {
        log.error('Failed to send heartbeat', { error: err })
      })
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Send heartbeat every second
    this.heartbeatInterval = window.setInterval(sendHeartbeat, 1000)
    log.info('Heartbeat started (1Hz)')
  }

  /**
   * Stop heartbeat
   */
  private _stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      log.info('Heartbeat stopped')
    }
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
            log.warn('Coordinate conversion error', { error })
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
        timestamp: Date.now(),
      })
    }
  }

  async disconnect(): Promise<void> {
    log.info('Disconnecting...')

    // Stop heartbeat
    this._stopHeartbeat()

    // Disconnect simulator
    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.stop()
      this.mavlinkSimulator = null
    }

    // Disconnect transport
    if (this.transport) {
      await this.transport.disconnect()
      this.transport = null
    }

    this.lastTelemetry.clear()
    this._updateStatus(ConnectionStatus.DISCONNECTED)
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    log.debug('Sending command', { action: command.action })

    // Check connection
    if (this.isSimulation && !this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    if (!this.isSimulation && !this.transport) {
      return {
        success: false,
        error: 'Transport not connected',
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
        if (this.isSimulation) {
          // Send to simulator
          this.mavlinkSimulator!.executeMAVLinkCommand({
            command: params.command,
            targetSystem: params.target_system || 1,
            targetComponent: 1,
            params,
          })
        } else {
          // Send to real drone via transport
          await this._sendRealCommand(params)
        }
      }

      return {
        success: true,
        commandId: `mavlink-${Date.now()}`,
        timestamp: Date.now(),
      }
    } catch (error) {
      log.error('Command execution error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Send real MAVLink command via transport
   */
  private async _sendRealCommand(params: any): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not connected')
    }

    // Create COMMAND_LONG message
    const commandLongPacket = createCommandLong(
      params.command,
      params.param1 || 0,
      params.param2 || 0,
      params.param3 || 0,
      params.param4 || 0,
      params.param5 || 0,
      params.param6 || 0,
      params.param7 || 0,
      params.target_system || 1,
      params.target_component || 1,
      0 // confirmation
    )

    const packet = {
      ...commandLongPacket,
      sysid: this.systemId,
      compid: this.componentId,
    }

    // Send packet
    await this.transport.sendPacket(serializePacket(packet))
  }

  /**
   * Handle formation commands (SET_FORMATION, MOVE_FORMATION)
   * Routes to appropriate formation controller based on mode
   */
  private async _handleFormationCommand(command: Command): Promise<CommandResponse> {
    // Check connection
    if (this.isSimulation && !this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    if (!this.isSimulation && !this.transport) {
      return {
        success: false,
        error: 'Transport not connected',
        timestamp: Date.now(),
      }
    }

    try {
      // Route based on formation control mode
      if (this.formationMode === FormationControlMode.VIRTUAL_LEADER) {
        return await this._handleFormationCommandVirtualLeader(command)
      } else {
        return await this._handleFormationCommandGCS(command)
      }
    } catch (error) {
      log.error('Formation command error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Handle formation command using GCS-Coordinated mode (existing implementation)
   */
  private async _handleFormationCommandGCS(command: Command): Promise<CommandResponse> {
    // Get all drone IDs
    const droneIds = Array.from({ length: this.droneCount }, (_, i) => i)

    // Convert formation command to individual waypoints
    const formationWaypoints = MAVLinkConverter.convertFormationCommand(command, droneIds)

    // Execute waypoint for each drone
    for (const [droneId, params] of formationWaypoints) {
      if (this.isSimulation) {
        // Send to simulator
        this.mavlinkSimulator!.executeMAVLinkCommand({
          command: params.command,
          targetSystem: droneId + 1,
          targetComponent: 1,
          params,
        })
      } else {
        // Send to real drone via transport
        await this._sendRealCommand(params)
      }
    }

    if (this.listeners.onLog) {
      this.listeners.onLog(
        `[MAVLink] Formation command executed (GCS mode): ${command.action} for ${droneIds.length} drones`
      )
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  /**
   * Handle formation command using Virtual Leader mode (new implementation)
   */
  private async _handleFormationCommandVirtualLeader(command: Command): Promise<CommandResponse> {
    // Initialize controller if needed
    if (!this.virtualLeaderController) {
      this._initializeVirtualLeaderController()
    }

    // Extract command parameters
    const params = command.params as any

    if (command.action === CommandAction.SET_FORMATION) {
      // SET_FORMATION: Set formation shape and position
      const formationType = params.formationType || 'line'
      const spacing = params.spacing || 2.0
      const centerX = params.centerX || 0
      const centerY = params.centerY || 0
      const centerZ = params.centerZ || 3.0
      const leaderDroneId = params.leaderDroneId

      this.virtualLeaderController!.setFormation(
        formationType,
        spacing,
        { x: centerX, y: centerY, z: centerZ },
        leaderDroneId
      )

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] Formation set (Virtual Leader): ${formationType} at (${centerX}, ${centerY}, ${centerZ})`
        )
      }
    } else if (command.action === CommandAction.MOVE_FORMATION) {
      // MOVE_FORMATION: Move virtual leader (all drones follow)
      const direction = params.direction || 'forward'
      const distance = params.distance || 1.0
      const speed = params.speed || 2.0

      this.virtualLeaderController!.moveVirtualLeader(direction, distance, speed)

      if (this.listeners.onLog) {
        this.listeners.onLog(
          `[MAVLink] Formation moving (Virtual Leader): ${direction} ${distance}m at ${speed}m/s`
        )
      }
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  async sendCommands(commands: Command[]): Promise<CommandResponse> {
    log.info('Sending command sequence', { count: commands.length })

    // Check connection
    if (this.isSimulation && !this.mavlinkSimulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    if (!this.isSimulation && !this.transport) {
      return {
        success: false,
        error: 'Transport not connected',
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
      log.error('Command sequence error', { error })
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
    log.warn('EMERGENCY STOP!')

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

  async reset(): Promise<CommandResponse> {
    log.info('MAVLinkConnectionService', 'Resetting drone positions')

    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.reset()
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
  }

  cleanup(): void {
    log.info('Cleanup')

    if (this.mavlinkSimulator) {
      this.mavlinkSimulator.stop()
      this.mavlinkSimulator = null
    }

    if (this.virtualLeaderController) {
      this.virtualLeaderController.stop()
      this.virtualLeaderController = null
    }

    this.lastTelemetry.clear()
    this.listeners = {}
  }

  /**
   * Set formation control mode
   */
  setFormationMode(mode: FormationControlMode): void {
    log.info('Setting formation mode', { mode })
    this.formationMode = mode

    // Initialize Virtual Leader controller if needed
    if (mode === FormationControlMode.VIRTUAL_LEADER && !this.virtualLeaderController) {
      this._initializeVirtualLeaderController()
    }

    // Stop Virtual Leader controller if switching away
    if (mode === FormationControlMode.GCS_COORDINATED && this.virtualLeaderController) {
      this.virtualLeaderController.stop()
      this.virtualLeaderController = null
    }

    if (this.listeners.onLog) {
      this.listeners.onLog(`[MAVLink] Formation mode set to: ${mode}`)
    }
  }

  /**
   * Get current formation control mode
   */
  getFormationMode(): FormationControlMode {
    return this.formationMode
  }

  /**
   * Initialize Virtual Leader Formation Controller
   */
  private _initializeVirtualLeaderController(): void {
    log.info('Initializing Virtual Leader Controller', { droneCount: this.droneCount })

    // Create position setpoint callback
    const sendPositionSetpoint: PositionSetpointCallback = (droneId, position, velocity, yaw) => {
      // Convert to MAVLink SET_POSITION_TARGET_LOCAL_NED command
      const params = MAVLinkConverter.positionSetpointToMAVLink(
        droneId,
        position,
        velocity,
        yaw
      )

      // Send command
      if (this.isSimulation && this.mavlinkSimulator) {
        this.mavlinkSimulator.executeMAVLinkCommand({
          command: params.command,
          targetSystem: droneId + 1,
          targetComponent: 1,
          params,
        })
      } else if (!this.isSimulation && this.transport) {
        this._sendRealCommand(params).catch((err) => {
          log.error('Failed to send position setpoint', { droneId, error: err })
        })
      }
    }

    // Create controller
    this.virtualLeaderController = new VirtualLeaderFormationController(
      this.droneCount,
      sendPositionSetpoint,
      10 // 10Hz update rate
    )

    log.info('Virtual Leader Controller initialized')
  }

  // Private helpers

  private _updateStatus(status: ConnectionStatus): void {
    this.status = status
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status)
    }
  }
}

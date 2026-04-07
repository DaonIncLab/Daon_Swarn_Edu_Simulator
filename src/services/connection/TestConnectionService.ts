/**
 * Test Connection Service
 *
 * Local simulator service for testing without Unity or hardware
 * - Multiple drone simulation
 * - Command execution simulation
 * - Telemetry generation matching Unity format
 */

import { ConnectionStatus } from '@/constants/connection'
import { MessageType, CommandAction } from '@/constants/commands'
import type { Command } from '@/types/websocket'
import type { IConnectionService } from './IConnectionService'
import type {
  CommandBatchContext,
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

  async sendCommands(
    commands: Command[],
    _context?: CommandBatchContext
  ): Promise<CommandResponse> {
    log.info('Executing script', { commandCount: commands.length })

    if (!this.simulator) {
      return {
        success: false,
        error: 'Simulator not initialized',
        timestamp: Date.now(),
      }
    }

    if (commands.length === 1) {
      const [command] = commands
      log.debug('Command sent', { command })
      this._executeCommand(command)
      await new Promise((resolve) => setTimeout(resolve, 100))

      return {
        success: true,
        commandId: `test-${Date.now()}`,
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
          (params as any).type || (params as any).formationType,
          {
            rows: (params as any).rows,
            cols: (params as any).cols,
            spacing: (params as any).spacing,
            radius: (params as any).radius,
          }
        )
        break

      case CommandAction.SET_LED_COLOR:
      case CommandAction.SET_COLOR:
        // Color command is acknowledged in test mode, but simulator has no LED model yet.
        log.info('SET_LED_COLOR', {
          r: (params as any).r,
          g: (params as any).g,
          b: (params as any).b,
        })
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

      case CommandAction.ADD_WAYPOINT:
        this.simulator.addWaypoint((params as any).waypoint)
        break

      case CommandAction.GOTO_WAYPOINT:
        this.simulator.gotoWaypoint(
          (params as any).waypointId,
          (params as any).speed
        )
        break

      case CommandAction.EXECUTE_MISSION:
        // Note: executeMission is async but we don't await here
        // The mission runs in background
        this.simulator.executeMission(
          (params as any).loop,
          (params as any).speed
        )
        break

      case CommandAction.CLEAR_WAYPOINTS:
        this.simulator.clearWaypoints()
        break

      // ============= 새로운 드론 명령들 =============
      case 'DRONE_TAKEOFF':
        // 개별 드론 이륙 - 시뮬레이터가 지원하면 구현
        log.info('DRONE_TAKEOFF', { droneId: (params as any).droneId, altitude: (params as any).altitude })
        break

      case 'DRONE_LAND':
        // 개별 드론 착륙
        log.info('DRONE_LAND', { droneId: (params as any).droneId })
        break

      case 'DRONE_HOVER':
        // 호버링
        log.info('DRONE_HOVER', { droneId: (params as any).droneId })
        break

      case 'DRONE_EMERGENCY':
        // 긴급 정지
        log.warn('DRONE_EMERGENCY', { droneId: (params as any).droneId })
        break

      case 'DRONE_MOVE_DIRECTION': {
        // 개별 드론 방향 이동 (상대 좌표)
        const droneId = (params as any).droneId
        const direction = (params as any).direction
        const distance = (params as any).distance

        let dx = 0, dy = 0, dz = 0

        switch (direction) {
          case 'up':
            dz = distance
            break
          case 'down':
            dz = -distance
            break
          case 'left':
            dx = -distance
            break
          case 'right':
            dx = distance
            break
          case 'forward':
            dy = distance
            break
          case 'backward':
            dy = -distance
            break
        }

        // 현재 위치에서 상대적으로 이동
        const droneStates = this.simulator.getDroneStates()
        const droneState = droneStates.find(d => d.id === droneId)

        if (droneState) {
          const newX = droneState.position.x + dx
          const newY = droneState.position.y + dy
          const newZ = droneState.position.z + dz

          log.info('DRONE_MOVE_DIRECTION', { droneId, direction, distance, dx, dy, dz, newPos: { x: newX, y: newY, z: newZ } })
          this.simulator.executeMoveDrone(droneId, newX, newY, newZ)
        }
        break
      }

      case 'DRONE_MOVE_DIRECTION_ALL': {
        // 모든 드론 방향 이동 (상대 좌표)
        const direction = (params as any).direction
        const distance = (params as any).distance

        let dx = 0, dy = 0, dz = 0

        switch (direction) {
          case 'up':
            dz = distance
            break
          case 'down':
            dz = -distance
            break
          case 'left':
            dx = -distance
            break
          case 'right':
            dx = distance
            break
          case 'forward':
            dy = distance
            break
          case 'backward':
            dy = -distance
            break
        }

        log.info('DRONE_MOVE_DIRECTION_ALL', { direction, distance, dx, dy, dz })

        // 모든 드론을 현재 위치에서 상대적으로 이동
        const droneStates = this.simulator.getDroneStates()
        droneStates.forEach((droneState) => {
          const newX = droneState.position.x + dx
          const newY = droneState.position.y + dy
          const newZ = droneState.position.z + dz
          this.simulator.executeMoveDrone(droneState.id, newX, newY, newZ)
        })
        break
      }

      case 'DRONE_MOVE_XYZ': {
        // XYZ 상대 좌표 이동
        const droneId = (params as any).droneId
        const dx = (params as any).x
        const dy = (params as any).y
        const dz = (params as any).z

        // 현재 위치에서 상대적으로 이동
        const droneStates = this.simulator.getDroneStates()
        const droneState = droneStates.find(d => d.id === droneId)

        if (droneState) {
          const newX = droneState.position.x + dx
          const newY = droneState.position.y + dy
          const newZ = droneState.position.z + dz

          log.info('DRONE_MOVE_XYZ', { droneId, dx, dy, dz, newPos: { x: newX, y: newY, z: newZ } })
          this.simulator.executeMoveDrone(droneId, newX, newY, newZ)
        }
        break
      }

      case 'DRONE_ROTATE':
        // 회전
        this.simulator.executeRotateDrone(
          (params as any).droneId,
          (params as any).degrees * ((params as any).direction === 'CW' ? 1 : -1)
        )
        break

      case 'DRONE_RC_CONTROL':
        // RC 제어
        log.info('DRONE_RC_CONTROL', {
          droneId: (params as any).droneId,
          roll: (params as any).roll,
          pitch: (params as any).pitch,
          yaw: (params as any).yaw,
          throttle: (params as any).throttle
        })
        break

      case 'DRONE_SET_SPEED':
        // 속도 설정
        log.info('DRONE_SET_SPEED', {
          droneId: (params as any).droneId,
          speed: (params as any).speed
        })
        break

      case 'MISSION_ADD_WAYPOINT':
        this.simulator.addWaypoint((params as any).waypoint)
        break

      case 'MISSION_GOTO_WAYPOINT':
        // waypointIndex를 사용하는 경우
        log.info('MISSION_GOTO_WAYPOINT', {
          waypointIndex: (params as any).waypointIndex,
          speed: (params as any).speed
        })
        break

      case 'MISSION_EXECUTE':
        this.simulator.executeMission(
          (params as any).loop,
          (params as any).speed || 2
        )
        break

      case 'MISSION_CLEAR':
        this.simulator.clearWaypoints()
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

      case CommandAction.SET_FORMATION: {
        // Calculate delay based on formation size
        const spacing = (params as any).spacing || 2
        const rows = (params as any).rows || 1
        const cols = (params as any).cols || 4

        // Estimate max distance a drone might need to travel
        // Worst case: drone moves from one corner to opposite corner
        const maxWidth = (cols - 1) * spacing
        const maxHeight = (rows - 1) * spacing
        const maxDistance = Math.sqrt(maxWidth * maxWidth + maxHeight * maxHeight)

        // Drone speed is 2 m/s, add buffer
        const droneSpeed = 2.0 // m/s
        const estimatedTime = (maxDistance / droneSpeed) * 1000 // ms
        const bufferTime = 1000 // 1 second buffer

        return Math.max(2000, estimatedTime + bufferTime) // minimum 2s
      }

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

  async reset(): Promise<CommandResponse> {
    log.info('Resetting drone simulator to initial state')

    if (this.simulator) {
      this.simulator.reset()
    }

    if (this.listeners.onLog) {
      this.listeners.onLog('[Test] Drone positions reset to initial state')
    }

    return {
      success: true,
      timestamp: Date.now(),
    }
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

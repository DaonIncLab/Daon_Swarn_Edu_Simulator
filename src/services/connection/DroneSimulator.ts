/**
 * Drone Simulator
 *
 * Simulates individual drone behavior for test mode
 * - Position, velocity, and battery state
 * - Command execution (takeoff, land, move, etc.)
 * - State transitions (idle, flying, hovering, landed, error)
 */

import type { DroneState, Waypoint } from '@/types/websocket'
import { CommandAction, FormationType, Direction } from '@/constants/commands'
import { log } from '@/utils/logger'

export interface SimulatedDrone {
  id: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  battery: number
  status: DroneState['status']
  isActive: boolean
  targetPosition: { x: number; y: number; z: number } | null
  isMoving: boolean
}

/**
 * Drone Simulator Class
 */
export class DroneSimulator {
  private drones: Map<number, SimulatedDrone> = new Map()
  private updateInterval: number | null = null
  private lastUpdateTime: number = Date.now()
  private formationType: FormationType = FormationType.LINE
  private formationSpacing: number = 2

  // Waypoint mission support
  private waypoints: Map<string, Waypoint> = new Map()
  private waypointOrder: string[] = []

  constructor(private droneCount: number = 4) {
    this.initializeDrones()
  }

  /**
   * Get drone count
   */
  getDroneCount(): number {
    return this.droneCount
  }

  /**
   * Initialize drones in a line formation on the ground
   */
  private initializeDrones(): void {
    for (let i = 0; i < this.droneCount; i++) {
      const drone: SimulatedDrone = {
        id: i,
        position: { x: i * 2, y: 0, z: 0 }, // Line formation on ground
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        battery: 100,
        status: 'landed',
        isActive: true,
        targetPosition: null,
        isMoving: false,
      }
      this.drones.set(i, drone)
    }
  }

  /**
   * Start simulation loop
   */
  start(onUpdate: (drones: DroneState[]) => void): void {
    this.lastUpdateTime = Date.now()

    this.updateInterval = window.setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - this.lastUpdateTime) / 1000 // seconds
      this.lastUpdateTime = now

      this.updateDrones(deltaTime)
      onUpdate(this.getDroneStates())
    }, 100) // 10Hz update rate
  }

  /**
   * Stop simulation loop
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Update all drones (physics, battery, movement)
   */
  private updateDrones(deltaTime: number): void {
    for (const drone of this.drones.values()) {
      // Update battery based on status
      this.updateBattery(drone, deltaTime)

      // Update movement if drone has a target
      if (drone.targetPosition && drone.isMoving) {
        this.updateMovement(drone, deltaTime)
      }

      // Update velocity decay (friction)
      this.updateVelocityDecay(drone, deltaTime)

      // Update status based on movement
      this.updateStatus(drone)
    }
  }

  /**
   * Update battery consumption
   */
  private updateBattery(drone: SimulatedDrone, deltaTime: number): void {
    if (drone.status === 'flying') {
      drone.battery = Math.max(0, drone.battery - 1.0 * (deltaTime / 60)) // 1% per minute
    } else if (drone.status === 'hovering') {
      drone.battery = Math.max(0, drone.battery - 0.5 * (deltaTime / 60)) // 0.5% per minute
    }
    // landed: no consumption
  }

  /**
   * Update drone movement towards target
   */
  private updateMovement(drone: SimulatedDrone, deltaTime: number): void {
    if (!drone.targetPosition) return

    const dx = drone.targetPosition.x - drone.position.x
    const dy = drone.targetPosition.y - drone.position.y
    const dz = drone.targetPosition.z - drone.position.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Check if reached target
    if (distance < 0.1) {
      drone.position = { ...drone.targetPosition }
      drone.velocity = { x: 0, y: 0, z: 0 }
      drone.targetPosition = null
      drone.isMoving = false
      return
    }

    // Move towards target with constant speed
    const speed = 2.0 // m/s
    const dirX = dx / distance
    const dirY = dy / distance
    const dirZ = dz / distance

    drone.velocity.x = dirX * speed
    drone.velocity.y = dirY * speed
    drone.velocity.z = dirZ * speed

    // Update position
    drone.position.x += drone.velocity.x * deltaTime
    drone.position.y += drone.velocity.y * deltaTime
    drone.position.z += drone.velocity.z * deltaTime

    // Update rotation to face movement direction
    if (Math.abs(dirX) > 0.01 || Math.abs(dirZ) > 0.01) {
      drone.rotation.y = Math.atan2(dirX, dirZ) * (180 / Math.PI)
    }
  }

  /**
   * Update velocity decay (air resistance)
   */
  private updateVelocityDecay(drone: SimulatedDrone, deltaTime: number): void {
    if (!drone.isMoving) {
      const decay = 0.9
      drone.velocity.x *= Math.pow(decay, deltaTime * 10)
      drone.velocity.y *= Math.pow(decay, deltaTime * 10)
      drone.velocity.z *= Math.pow(decay, deltaTime * 10)

      // Stop if velocity is very small
      if (
        Math.abs(drone.velocity.x) < 0.01 &&
        Math.abs(drone.velocity.y) < 0.01 &&
        Math.abs(drone.velocity.z) < 0.01
      ) {
        drone.velocity = { x: 0, y: 0, z: 0 }
      }
    }
  }

  /**
   * Update drone status based on movement and position
   */
  private updateStatus(drone: SimulatedDrone): void {
    if (drone.battery <= 0) {
      drone.status = 'error'
      drone.isActive = false
      return
    }

    // On ground
    if (drone.position.z < 0.1) {
      drone.status = 'landed'
      return
    }

    // In air
    const speed = Math.sqrt(
      drone.velocity.x ** 2 + drone.velocity.y ** 2 + drone.velocity.z ** 2
    )

    if (speed > 0.5) {
      drone.status = 'flying'
    } else if (drone.position.z > 0.5) {
      drone.status = 'hovering'
    } else {
      drone.status = 'idle'
    }
  }

  /**
   * Get current drone states
   */
  getDroneStates(): DroneState[] {
    return Array.from(this.drones.values()).map((drone) => ({
      id: drone.id,
      position: { ...drone.position },
      rotation: { ...drone.rotation },
      velocity: { ...drone.velocity },
      battery: Math.round(drone.battery * 10) / 10, // Round to 1 decimal
      status: drone.status,
      isActive: drone.isActive,
    }))
  }

  /**
   * Execute takeoff_all command
   */
  executeTakeoffAll(altitude: number = 2): void {
    log.debug('DroneSimulator', `Takeoff all to ${altitude}m`)

    for (const drone of this.drones.values()) {
      if (drone.status === 'landed' || drone.status === 'idle') {
        drone.targetPosition = {
          x: drone.position.x,
          y: drone.position.y,
          z: altitude,
        }
        drone.isMoving = true
        drone.status = 'flying'
      }
    }
  }

  /**
   * Execute land_all command
   */
  executeLandAll(): void {
    log.debug('DroneSimulator', 'Land all')

    for (const drone of this.drones.values()) {
      if (drone.status !== 'landed') {
        drone.targetPosition = {
          x: drone.position.x,
          y: drone.position.y,
          z: 0,
        }
        drone.isMoving = true
      }
    }
  }

  /**
   * Execute set_formation command
   */
  executeSetFormation(
    type: FormationType,
    options: { rows?: number; cols?: number; spacing?: number; radius?: number } = {}
  ): void {
    log.info('DroneSimulator', `🔷 Set formation: ${type}`, options)

    this.formationType = type
    this.formationSpacing = options.spacing || 2

    const droneArray = Array.from(this.drones.values())
    const centerAltitude = droneArray[0]?.position.z || 2

    log.debug('DroneSimulator', `Formation center altitude: ${centerAltitude}m (from drone 0 z=${droneArray[0]?.position.z})`)
    log.debug('DroneSimulator', `Formation spacing: ${this.formationSpacing}m, drone count: ${droneArray.length}`)

    switch (type) {
      case FormationType.LINE:
        droneArray.forEach((drone, i) => {
          drone.targetPosition = {
            x: i * this.formationSpacing,
            y: 0,
            z: centerAltitude,
          }
          drone.isMoving = true
          log.debug('DroneSimulator', `  Drone ${drone.id}: (${drone.position.x.toFixed(1)}, ${drone.position.y.toFixed(1)}, ${drone.position.z.toFixed(1)}) → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
        })
        break

      case FormationType.GRID: {
        const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
        log.debug('DroneSimulator', `Grid formation: ${cols} cols`)
        droneArray.forEach((drone, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          drone.targetPosition = {
            x: col * this.formationSpacing,
            y: row * this.formationSpacing,
            z: centerAltitude,
          }
          drone.isMoving = true
          log.debug('DroneSimulator', `  Drone ${drone.id}: row ${row}, col ${col} → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
        })
        break
      }

      case FormationType.CIRCLE: {
        const radius = options.radius || 5
        const angleStep = (2 * Math.PI) / droneArray.length
        log.debug('DroneSimulator', `Circle formation: radius ${radius}m, angle step ${(angleStep * 180 / Math.PI).toFixed(1)}°`)
        droneArray.forEach((drone, i) => {
          const angle = i * angleStep
          drone.targetPosition = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: centerAltitude,
          }
          drone.isMoving = true
          log.debug('DroneSimulator', `  Drone ${drone.id}: angle ${(angle * 180 / Math.PI).toFixed(1)}° → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
        })
        break
      }

      case FormationType.V_SHAPE: {
        const spacing = this.formationSpacing
        const halfCount = Math.floor(droneArray.length / 2)
        log.debug('DroneSimulator', `V-Shape formation: spacing ${spacing}m`)
        droneArray.forEach((drone, i) => {
          if (i === 0) {
            // Leader at front
            drone.targetPosition = { x: 0, y: 0, z: centerAltitude }
            log.debug('DroneSimulator', `  Drone ${drone.id}: leader → target (0.0, 0.0, ${centerAltitude.toFixed(1)})`)
          } else {
            const side = i % 2 === 0 ? 1 : -1
            const offset = Math.ceil(i / 2)
            drone.targetPosition = {
              x: side * offset * spacing,
              y: -offset * spacing,
              z: centerAltitude,
            }
            log.debug('DroneSimulator', `  Drone ${drone.id}: ${side > 0 ? 'right' : 'left'} wing, offset ${offset} → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
          }
          drone.isMoving = true
        })
        break
      }

      case FormationType.TRIANGLE: {
        // Triangle/pyramid formation - rows increase in size
        const spacing = this.formationSpacing
        const rowCount = Math.ceil((-1 + Math.sqrt(1 + 8 * droneArray.length)) / 2)
        log.debug('DroneSimulator', `Triangle formation: spacing ${spacing}m, ${rowCount} rows`)

        let droneIdx = 0
        for (let row = 0; row < rowCount && droneIdx < droneArray.length; row++) {
          const dronesInRow = row + 1
          for (let col = 0; col < dronesInRow && droneIdx < droneArray.length; col++) {
            const drone = droneArray[droneIdx]
            drone.targetPosition = {
              x: (col - row / 2) * spacing,
              y: row * spacing,
              z: centerAltitude,
            }
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id}: row ${row}, col ${col} → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
            droneIdx++
          }
        }
        break
      }

      case FormationType.SQUARE: {
        // Square formation - evenly distributed
        const spacing = this.formationSpacing
        const sideLength = Math.ceil(Math.sqrt(droneArray.length))
        log.debug('DroneSimulator', `Square formation: spacing ${spacing}m, ${sideLength}x${sideLength}`)

        droneArray.forEach((drone, i) => {
          const row = Math.floor(i / sideLength)
          const col = i % sideLength
          drone.targetPosition = {
            x: (col - (sideLength - 1) / 2) * spacing,
            y: (row - (sideLength - 1) / 2) * spacing,
            z: centerAltitude,
          }
          drone.isMoving = true
          log.debug('DroneSimulator', `  Drone ${drone.id}: row ${row}, col ${col} → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
        })
        break
      }

      case FormationType.DIAMOND: {
        // Diamond/rhombus formation
        const spacing = this.formationSpacing
        const half = Math.ceil(droneArray.length / 2)
        log.debug('DroneSimulator', `Diamond formation: spacing ${spacing}m, ${droneArray.length} drones`)

        droneArray.forEach((drone, i) => {
          let x: number, y: number

          if (i < half) {
            // Top half - expanding
            const row = i
            x = 0
            y = row * spacing
          } else {
            // Bottom half - contracting
            x = 0
            y = -(droneArray.length - 1 - i) * spacing
          }

          // Offset alternating drones left/right for diamond shape
          if (i > 0 && i < droneArray.length - 1) {
            const offset = Math.min(i, droneArray.length - 1 - i)
            x = (i % 2 === 0 ? 1 : -1) * offset * spacing * 0.5
          }

          drone.targetPosition = { x, y, z: centerAltitude }
          drone.isMoving = true
          log.debug('DroneSimulator', `  Drone ${drone.id}: → target (${drone.targetPosition.x.toFixed(1)}, ${drone.targetPosition.y.toFixed(1)}, ${drone.targetPosition.z.toFixed(1)})`)
        })
        break
      }
    }
  }

  /**
   * Execute move_formation command
   */
  executeMoveFormation(direction: Direction, distance: number): void {
    log.debug('DroneSimulator', `Move formation: ${direction} by ${distance}m`)

    let dx = 0,
      dy = 0

    switch (direction) {
      case Direction.FORWARD:
        dy = distance
        break
      case Direction.BACKWARD:
        dy = -distance
        break
      case Direction.LEFT:
        dx = -distance
        break
      case Direction.RIGHT:
        dx = distance
        break
    }

    for (const drone of this.drones.values()) {
      drone.targetPosition = {
        x: drone.position.x + dx,
        y: drone.position.y + dy,
        z: drone.position.z,
      }
      drone.isMoving = true
    }
  }

  /**
   * Execute move_drone command (single drone)
   */
  executeMoveDrone(droneId: number, x: number, y: number, z: number): void {
    log.debug('DroneSimulator', `Move drone ${droneId} to (${x}, ${y}, ${z})`)

    const drone = this.drones.get(droneId)
    if (drone) {
      drone.targetPosition = { x, y, z }
      drone.isMoving = true
    }
  }

  /**
   * Execute rotate_drone command (single drone)
   */
  executeRotateDrone(droneId: number, yaw: number): void {
    log.debug('DroneSimulator', `Rotate drone ${droneId} to ${yaw}°`)

    const drone = this.drones.get(droneId)
    if (drone) {
      drone.rotation.y = yaw
    }
  }

  /**
   * Emergency stop - land all immediately
   */
  emergencyStop(): void {
    log.warn('DroneSimulator', 'EMERGENCY STOP')

    for (const drone of this.drones.values()) {
      drone.targetPosition = {
        x: drone.position.x,
        y: drone.position.y,
        z: 0,
      }
      drone.isMoving = true
      drone.velocity = { x: 0, y: 0, z: 0 }
    }
  }

  /**
   * Reset all drones to initial state
   */
  reset(): void {
    this.drones.clear()
    this.initializeDrones()
  }

  /**
   * Set number of drones (requires reset)
   */
  setDroneCount(count: number): void {
    this.droneCount = count
    this.stop()
    this.reset()
  }

  // ============================================
  // Waypoint Mission Methods
  // ============================================

  /**
   * Add a waypoint to the mission
   */
  addWaypoint(waypoint: Waypoint): void {
    log.info('DroneSimulator', `Adding waypoint: ${waypoint.name} at (${waypoint.x}, ${waypoint.y}, ${waypoint.z})`)

    // Store by name for easy lookup
    this.waypoints.set(waypoint.name || waypoint.id, waypoint)
    this.waypointOrder.push(waypoint.name || waypoint.id)
  }

  /**
   * Move all drones to a specific waypoint
   */
  gotoWaypoint(waypointName: string, speed?: number): boolean {
    const waypoint = this.waypoints.get(waypointName)

    if (!waypoint) {
      log.warn('DroneSimulator', `Waypoint not found: ${waypointName}`)
      return false
    }

    log.info('DroneSimulator', `Going to waypoint: ${waypointName} at (${waypoint.x}, ${waypoint.y}, ${waypoint.z})`)

    // Move all drones to the waypoint position (maintaining formation offset)
    const droneArray = Array.from(this.drones.values())
    const centerX = droneArray.reduce((sum, d) => sum + d.position.x, 0) / droneArray.length
    const centerY = droneArray.reduce((sum, d) => sum + d.position.y, 0) / droneArray.length

    for (const drone of this.drones.values()) {
      // Calculate offset from formation center
      const offsetX = drone.position.x - centerX
      const offsetY = drone.position.y - centerY

      drone.targetPosition = {
        x: waypoint.x + offsetX,
        y: waypoint.y + offsetY,
        z: waypoint.z,
      }
      drone.isMoving = true
    }

    return true
  }

  /**
   * Execute the entire mission (all waypoints in order)
   */
  async executeMission(loop: boolean = false, speed?: number): Promise<void> {
    if (this.waypointOrder.length === 0) {
      log.warn('DroneSimulator', 'No waypoints in mission')
      return
    }

    log.info('DroneSimulator', `Executing mission with ${this.waypointOrder.length} waypoints, loop=${loop}`)

    do {
      for (const waypointName of this.waypointOrder) {
        const waypoint = this.waypoints.get(waypointName)
        if (!waypoint) continue

        this.gotoWaypoint(waypointName, speed || waypoint.speed)

        // Wait for drones to reach waypoint (simplified - check every 100ms)
        await this.waitForDronesToReachTarget()

        // Hold at waypoint if specified
        if (waypoint.holdTime && waypoint.holdTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waypoint.holdTime! * 1000))
        }
      }
    } while (loop)

    log.info('DroneSimulator', 'Mission complete')
  }

  /**
   * Wait for all drones to reach their target positions
   */
  private waitForDronesToReachTarget(): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        let allReached = true
        for (const drone of this.drones.values()) {
          if (drone.isMoving) {
            allReached = false
            break
          }
        }
        if (allReached) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  /**
   * Clear all waypoints
   */
  clearWaypoints(): void {
    log.info('DroneSimulator', 'Clearing all waypoints')
    this.waypoints.clear()
    this.waypointOrder = []
  }

  /**
   * Get all waypoints (for visualization)
   */
  getWaypoints(): Waypoint[] {
    return this.waypointOrder.map(name => this.waypoints.get(name)!).filter(Boolean)
  }

  /**
   * Get waypoint by name
   */
  getWaypoint(name: string): Waypoint | undefined {
    return this.waypoints.get(name)
  }
}

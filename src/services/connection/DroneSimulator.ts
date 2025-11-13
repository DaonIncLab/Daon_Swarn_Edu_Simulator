/**
 * Drone Simulator
 *
 * Simulates individual drone behavior for test mode
 * - Position, velocity, and battery state
 * - Command execution (takeoff, land, move, etc.)
 * - State transitions (idle, flying, hovering, landed, error)
 */

import type { DroneState } from '@/types/websocket'
import { CommandAction, FormationType, Direction } from '@/constants/commands'

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

  constructor(private droneCount: number = 4) {
    this.initializeDrones()
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
    console.log(`[DroneSimulator] Takeoff all to ${altitude}m`)

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
    console.log('[DroneSimulator] Land all')

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
    console.log(`[DroneSimulator] Set formation: ${type}`)

    this.formationType = type
    this.formationSpacing = options.spacing || 2

    const droneArray = Array.from(this.drones.values())
    const centerAltitude = droneArray[0]?.position.z || 2

    switch (type) {
      case FormationType.LINE:
        droneArray.forEach((drone, i) => {
          drone.targetPosition = {
            x: i * this.formationSpacing,
            y: 0,
            z: centerAltitude,
          }
          drone.isMoving = true
        })
        break

      case FormationType.GRID: {
        const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
        droneArray.forEach((drone, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          drone.targetPosition = {
            x: col * this.formationSpacing,
            y: row * this.formationSpacing,
            z: centerAltitude,
          }
          drone.isMoving = true
        })
        break
      }

      case FormationType.CIRCLE: {
        const radius = options.radius || 5
        const angleStep = (2 * Math.PI) / droneArray.length
        droneArray.forEach((drone, i) => {
          const angle = i * angleStep
          drone.targetPosition = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: centerAltitude,
          }
          drone.isMoving = true
        })
        break
      }

      case FormationType.V: {
        const spacing = this.formationSpacing
        const halfCount = Math.floor(droneArray.length / 2)
        droneArray.forEach((drone, i) => {
          if (i === 0) {
            // Leader at front
            drone.targetPosition = { x: 0, y: 0, z: centerAltitude }
          } else {
            const side = i % 2 === 0 ? 1 : -1
            const offset = Math.ceil(i / 2)
            drone.targetPosition = {
              x: side * offset * spacing,
              y: -offset * spacing,
              z: centerAltitude,
            }
          }
          drone.isMoving = true
        })
        break
      }
    }
  }

  /**
   * Execute move_formation command
   */
  executeMoveFormation(direction: Direction, distance: number): void {
    console.log(`[DroneSimulator] Move formation: ${direction} by ${distance}m`)

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
    console.log(`[DroneSimulator] Move drone ${droneId} to (${x}, ${y}, ${z})`)

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
    console.log(`[DroneSimulator] Rotate drone ${droneId} to ${yaw}°`)

    const drone = this.drones.get(droneId)
    if (drone) {
      drone.rotation.y = yaw
    }
  }

  /**
   * Emergency stop - land all immediately
   */
  emergencyStop(): void {
    console.warn('[DroneSimulator] EMERGENCY STOP')

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
}

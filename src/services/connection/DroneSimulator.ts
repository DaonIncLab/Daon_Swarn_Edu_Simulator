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
   * Optimize formation assignment: assign each drone to nearest position
   * This prevents drones from crossing paths unnecessarily
   */
  private optimizeFormationAssignment(
    drones: SimulatedDrone[],
    positions: Array<{ x: number; y: number; z: number }>,
    centerPos: { x: number; y: number; z: number }
  ): Map<number, { x: number; y: number; z: number }> {
    const used = new Set<number>()
    const assignments = new Map<number, { x: number; y: number; z: number }>()

    // Sort drones by distance to center (process closer drones first)
    const sortedDrones = [...drones].sort((a, b) => {
      const distA = Math.sqrt(
        (a.position.x - centerPos.x) ** 2 +
        (a.position.y - centerPos.y) ** 2 +
        (a.position.z - centerPos.z) ** 2
      )
      const distB = Math.sqrt(
        (b.position.x - centerPos.x) ** 2 +
        (b.position.y - centerPos.y) ** 2 +
        (b.position.z - centerPos.z) ** 2
      )
      return distA - distB
    })

    // Greedy assignment: each drone gets nearest available position
    for (const drone of sortedDrones) {
      let minDist = Infinity
      let bestPos: { x: number; y: number; z: number } | null = null
      let bestIdx = -1

      for (let i = 0; i < positions.length; i++) {
        if (used.has(i)) continue

        const pos = positions[i]
        const dist = Math.sqrt(
          (drone.position.x - pos.x) ** 2 +
          (drone.position.y - pos.y) ** 2 +
          (drone.position.z - pos.z) ** 2
        )

        if (dist < minDist) {
          minDist = dist
          bestPos = pos
          bestIdx = i
        }
      }

      if (bestPos) {
        used.add(bestIdx)
        assignments.set(drone.id, bestPos)
      }
    }

    return assignments
  }

  /**
   * Execute set_formation command
   */
  executeSetFormation(
    type: FormationType,
    options: { rows?: number; cols?: number; spacing?: number; radius?: number; leaderDroneId?: number } = {}
  ): void {
    log.info('DroneSimulator', `🔷 Set formation: ${type}`, options)

    this.formationType = type
    this.formationSpacing = options.spacing || 2

    const droneArray = Array.from(this.drones.values())

    // Calculate center position - use leader drone if specified, otherwise use average
    let centerX: number, centerY: number, centerZ: number

    if (options.leaderDroneId !== undefined) {
      const leaderDrone = this.drones.get(options.leaderDroneId)
      if (leaderDrone) {
        centerX = leaderDrone.position.x
        centerY = leaderDrone.position.y
        centerZ = leaderDrone.position.z
        log.debug('DroneSimulator', `Using leader drone #${options.leaderDroneId + 1} as center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)})`)
      } else {
        log.warn('DroneSimulator', `Leader drone #${options.leaderDroneId + 1} not found, using average center`)
        centerX = droneArray.reduce((sum, d) => sum + d.position.x, 0) / droneArray.length
        centerY = droneArray.reduce((sum, d) => sum + d.position.y, 0) / droneArray.length
        centerZ = droneArray.reduce((sum, d) => sum + d.position.z, 0) / droneArray.length
      }
    } else {
      // Default: use average of all drone positions
      centerX = droneArray.reduce((sum, d) => sum + d.position.x, 0) / droneArray.length
      centerY = droneArray.reduce((sum, d) => sum + d.position.y, 0) / droneArray.length
      centerZ = droneArray.reduce((sum, d) => sum + d.position.z, 0) / droneArray.length
      log.debug('DroneSimulator', `Using average center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)})`)
    }

    log.debug('DroneSimulator', `Formation spacing: ${this.formationSpacing}m, drone count: ${droneArray.length}`)

    switch (type) {
      case FormationType.LINE: {
        // LINE: cols = drones per line, rows = number of lines
        const cols = options.cols || droneArray.length
        const rows = options.rows || 1
        log.debug('DroneSimulator', `Line formation: ${rows} rows × ${cols} cols`)

        // Calculate offset to center the formation
        const totalWidth = (cols - 1) * this.formationSpacing
        const totalHeight = (rows - 1) * this.formationSpacing
        const offsetX = -totalWidth / 2

        // Generate all line positions with leader flag
        const linePositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []
        for (let i = 0; i < droneArray.length; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          linePositions.push({
            x: centerX + offsetX + col * this.formationSpacing,
            y: centerY + totalHeight / 2 - row * this.formationSpacing, // row=0 at top
            z: centerZ,
            isLeader: i === 0 // First position (top-left) is leader
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          leaderDrone = droneArray[0]
          log.debug('DroneSimulator', `Using first drone as leader: Drone #${leaderDrone.id + 1}`)
        }

        // Assign leader to leader position (top-left)
        const leaderPos = linePositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (top-left) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = linePositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id + 1}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.GRID: {
        // GRID: rows × cols grid (both parameters used)
        const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
        const rows = options.rows || Math.ceil(droneArray.length / cols)
        log.debug('DroneSimulator', `Grid formation: ${rows} rows × ${cols} cols`)

        // Calculate offset to center the formation
        const totalWidth = (cols - 1) * this.formationSpacing
        const totalHeight = (rows - 1) * this.formationSpacing
        const offsetX = -totalWidth / 2

        // Generate all grid positions with leader flag
        const gridPositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []
        for (let i = 0; i < droneArray.length; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          gridPositions.push({
            x: centerX + offsetX + col * this.formationSpacing,
            y: centerY + totalHeight / 2 - row * this.formationSpacing, // row=0 at top
            z: centerZ,
            isLeader: i === 0 // First position (top-left) is leader
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          leaderDrone = droneArray[0]
          log.debug('DroneSimulator', `Using first drone as leader: Drone #${leaderDrone.id + 1}`)
        }

        // Assign leader to leader position (top-left)
        const leaderPos = gridPositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (top-left) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = gridPositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id + 1}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.CIRCLE: {
        // CIRCLE: cols parameter used as radius (in meters)
        // If cols not provided, calculate radius based on spacing and drone count
        const radius = options.cols ? options.cols * this.formationSpacing :
                       (droneArray.length * this.formationSpacing) / (2 * Math.PI)
        const angleStep = (2 * Math.PI) / droneArray.length
        log.debug('DroneSimulator', `Circle formation: radius ${radius.toFixed(1)}m, angle step ${(angleStep * 180 / Math.PI).toFixed(1)}°`)

        // Generate all circle positions with leader flag
        const circlePositions: Array<{ x: number; y: number; z: number; angle: number; isLeader: boolean }> = []
        for (let i = 0; i < droneArray.length; i++) {
          const angle = i * angleStep
          circlePositions.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            z: centerZ,
            angle: angle,
            isLeader: i === 0 // First position (0 degrees) is leader
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          leaderDrone = droneArray[0]
          log.debug('DroneSimulator', `Using first drone as leader: Drone #${leaderDrone.id + 1}`)
        }

        // Assign leader to leader position (0 degrees)
        const leaderPos = circlePositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (0°) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = circlePositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id + 1}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.V_SHAPE: {
        // V_SHAPE: rows parameter determines depth of V
        const spacing = this.formationSpacing
        const depth = options.rows || Math.ceil(droneArray.length / 2)
        log.debug('DroneSimulator', `V-Shape formation: spacing ${spacing}m, depth ${depth}`)

        // Generate V-Shape positions
        const vPositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []

        // Leader position at front
        vPositions.push({
          x: centerX,
          y: centerY,
          z: centerZ,
          isLeader: true
        })

        // Wing positions
        for (let i = 1; i < droneArray.length; i++) {
          const side = i % 2 === 0 ? 1 : -1
          const offset = Math.ceil(i / 2)
          vPositions.push({
            x: centerX + side * offset * spacing,
            y: centerY - offset * spacing,
            z: centerZ,
            isLeader: false
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          // Auto-select: find drone closest to center
          leaderDrone = droneArray[0]
          let minDistToCenter = Infinity

          for (const drone of droneArray) {
            const dist = Math.sqrt(
              Math.pow(drone.position.x - centerX, 2) +
              Math.pow(drone.position.y - centerY, 2) +
              Math.pow(drone.position.z - centerZ, 2)
            )
            if (dist < minDistToCenter) {
              minDistToCenter = dist
              leaderDrone = drone
            }
          }
          log.debug('DroneSimulator', `Auto-selected leader: Drone #${leaderDrone.id + 1} (closest to center)`)
        }

        // Assign leader to leader position
        const leaderPos = vPositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to wing positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const wingPositions = vPositions.filter(p => !p.isLeader)

        const wingAssignments = this.optimizeFormationAssignment(
          remainingDrones,
          wingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply wing assignments
        remainingDrones.forEach((drone) => {
          const pos = wingAssignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id}: wing → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.TRIANGLE: {
        // TRIANGLE: rows parameter determines number of rows in triangle
        const spacing = this.formationSpacing
        const maxRows = options.rows || Math.ceil((-1 + Math.sqrt(1 + 8 * droneArray.length)) / 2)
        log.debug('DroneSimulator', `Triangle formation: spacing ${spacing}m, max ${maxRows} rows`)

        // Generate triangle positions
        const trianglePositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []
        let posIdx = 0

        for (let row = 0; row < maxRows && posIdx < droneArray.length; row++) {
          const dronesInRow = Math.min(row + 1, droneArray.length - posIdx)
          for (let col = 0; col < dronesInRow; col++) {
            trianglePositions.push({
              x: centerX + (col - (dronesInRow - 1) / 2) * spacing,
              y: centerY + row * spacing,
              z: centerZ,
              isLeader: row === 0 && col === 0 // First position is leader
            })
            posIdx++
          }
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          // Auto-select: find drone closest to center
          leaderDrone = droneArray[0]
          let minDistToCenter = Infinity

          for (const drone of droneArray) {
            const dist = Math.sqrt(
              Math.pow(drone.position.x - centerX, 2) +
              Math.pow(drone.position.y - centerY, 2) +
              Math.pow(drone.position.z - centerZ, 2)
            )
            if (dist < minDistToCenter) {
              minDistToCenter = dist
              leaderDrone = drone
            }
          }
          log.debug('DroneSimulator', `Auto-selected leader: Drone #${leaderDrone.id + 1} (closest to center)`)
        }

        // Assign leader to leader position (front of triangle)
        const leaderPos = trianglePositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (front) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = trianglePositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.SQUARE: {
        // SQUARE: rows × cols square/rectangle
        const cols = options.cols || Math.ceil(Math.sqrt(droneArray.length))
        const rows = options.rows || Math.ceil(droneArray.length / cols)
        log.debug('DroneSimulator', `Square formation: ${rows} rows × ${cols} cols, spacing ${this.formationSpacing}m`)

        // Generate all square positions with leader flag
        const squarePositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []
        for (let i = 0; i < droneArray.length; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          squarePositions.push({
            x: centerX + (col - (cols - 1) / 2) * this.formationSpacing,
            y: centerY + ((rows - 1) / 2 - row) * this.formationSpacing, // row=0 at top
            z: centerZ,
            isLeader: i === 0 // First position (top-left) is leader
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          leaderDrone = droneArray[0]
          log.debug('DroneSimulator', `Using first drone as leader: Drone #${leaderDrone.id + 1}`)
        }

        // Assign leader to leader position (top-left)
        const leaderPos = squarePositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (top-left) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = squarePositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id + 1}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
        })
        break
      }

      case FormationType.DIAMOND: {
        // DIAMOND: rows parameter determines size
        const spacing = this.formationSpacing
        const size = options.rows || Math.ceil(droneArray.length / 2)
        log.debug('DroneSimulator', `Diamond formation: spacing ${spacing}m, size ${size}`)

        // Generate diamond positions with leader flag
        const diamondPositions: Array<{ x: number; y: number; z: number; isLeader: boolean }> = []
        const half = Math.ceil(droneArray.length / 2)

        for (let i = 0; i < droneArray.length; i++) {
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

          diamondPositions.push({
            x: centerX + x,
            y: centerY + y,
            z: centerZ,
            isLeader: i === 0 // First position (front) is leader
          })
        }

        // Determine leader drone - use specified leader or find closest to center
        let leaderDrone: SimulatedDrone
        if (options.leaderDroneId !== undefined) {
          const specifiedLeader = this.drones.get(options.leaderDroneId)
          if (specifiedLeader) {
            leaderDrone = specifiedLeader
            log.debug('DroneSimulator', `Using specified leader: Drone #${leaderDrone.id + 1}`)
          } else {
            leaderDrone = droneArray[0]
            log.warn('DroneSimulator', `Specified leader #${options.leaderDroneId + 1} not found, using Drone #${leaderDrone.id + 1}`)
          }
        } else {
          leaderDrone = droneArray[0]
          log.debug('DroneSimulator', `Using first drone as leader: Drone #${leaderDrone.id + 1}`)
        }

        // Assign leader to leader position (front)
        const leaderPos = diamondPositions.find(p => p.isLeader)!
        leaderDrone.targetPosition = { x: leaderPos.x, y: leaderPos.y, z: leaderPos.z }
        leaderDrone.isMoving = true
        log.debug('DroneSimulator', `  Drone ${leaderDrone.id + 1}: LEADER (front) → target (${leaderPos.x.toFixed(1)}, ${leaderPos.y.toFixed(1)}, ${leaderPos.z.toFixed(1)})`)

        // Optimize remaining drones to remaining positions
        const remainingDrones = droneArray.filter(d => d.id !== leaderDrone.id)
        const remainingPositions = diamondPositions.filter(p => !p.isLeader)

        const assignments = this.optimizeFormationAssignment(
          remainingDrones,
          remainingPositions,
          { x: centerX, y: centerY, z: centerZ }
        )

        // Apply assignments
        remainingDrones.forEach((drone) => {
          const pos = assignments.get(drone.id)
          if (pos) {
            drone.targetPosition = pos
            drone.isMoving = true
            log.debug('DroneSimulator', `  Drone ${drone.id + 1}: → target (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
          }
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
      dy = 0,
      dz = 0

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
      case Direction.UP:
        dz = distance
        break
      case Direction.DOWN:
        dz = -distance
        break
    }

    for (const drone of this.drones.values()) {
      drone.targetPosition = {
        x: drone.position.x + dx,
        y: drone.position.y + dy,
        z: drone.position.z + dz,
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

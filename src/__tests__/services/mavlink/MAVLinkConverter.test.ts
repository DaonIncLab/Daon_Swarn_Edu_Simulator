/**
 * MAVLink Converter Unit Tests
 *
 * Tests Blockly command conversion, formation calculations, and telemetry conversion
 */

import { MAVLinkConverter } from '@/services/mavlink/MAVLinkConverter'
import { CommandAction, FormationType, Direction } from '@/constants/commands'
import { MAV_CMD } from '@/services/mavlink/MAVLinkCommands'
import { MAV_STATE } from '@/types/mavlink'
import type { Command } from '@/types/websocket'
import type { DroneState } from '@/types/websocket'
import { coordinateConverter } from '@/services/mavlink/CoordinateConverter'

describe('MAVLinkConverter - Blockly to MAVLink', () => {
  describe('TAKEOFF_ALL', () => {
    test('converts to NAV_TAKEOFF with altitude', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.TAKEOFF_ALL,
        params: { altitude: 5 },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.blocklyToMAVLink(command, 1)

      expect(result).toHaveLength(1)
      expect(result[0].command).toBe(MAV_CMD.NAV_TAKEOFF)
      expect(result[0].param7).toBe(5)
      expect(result[0].target_system).toBe(1)
    })

    test('uses default altitude of 2m', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.TAKEOFF_ALL,
        params: {},
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.blocklyToMAVLink(command)
      expect(result[0].param7).toBe(2)
    })
  })

  describe('LAND_ALL', () => {
    test('converts to NAV_LAND', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.LAND_ALL,
        params: {},
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.blocklyToMAVLink(command, 2)

      expect(result).toHaveLength(1)
      expect(result[0].command).toBe(MAV_CMD.NAV_LAND)
      expect(result[0].target_system).toBe(2)
    })
  })

  describe('HOVER', () => {
    test('converts to NAV_LOITER_UNLIM', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.HOVER,
        params: {},
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.blocklyToMAVLink(command, 3)

      expect(result).toHaveLength(1)
      expect(result[0].command).toBe(MAV_CMD.NAV_LOITER_UNLIM)
      expect(result[0].target_system).toBe(3)
    })
  })

  describe('MOVE_DRONE', () => {
    test('converts to NAV_WAYPOINT with coordinates', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.MOVE_DRONE,
        params: { x: 10, y: 20, z: 5 },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.blocklyToMAVLink(command, 4)

      expect(result).toHaveLength(1)
      expect(result[0].command).toBe(MAV_CMD.NAV_WAYPOINT)
      expect(result[0].param5).toBe(10)
      expect(result[0].param6).toBe(20)
      expect(result[0].param7).toBe(5)
      expect(result[0].target_system).toBe(4)
    })
  })

  describe('Formation Commands', () => {
    test('SET_FORMATION and MOVE_FORMATION return empty array', () => {
      const setCmd: Command = {
        id: '1',
        action: CommandAction.SET_FORMATION,
        params: {},
        timestamp: Date.now(),
      }

      const moveCmd: Command = {
        id: '2',
        action: CommandAction.MOVE_FORMATION,
        params: {},
        timestamp: Date.now(),
      }

      expect(MAVLinkConverter.blocklyToMAVLink(setCmd)).toEqual([])
      expect(MAVLinkConverter.blocklyToMAVLink(moveCmd)).toEqual([])
    })
  })

  describe('WAIT commands', () => {
    test('WAIT returns empty array', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.WAIT,
        params: { duration: 5 },
        timestamp: Date.now(),
      }

      expect(MAVLinkConverter.blocklyToMAVLink(command)).toEqual([])
    })

    test('SYNC_ALL returns empty array', () => {
      const command: Command = {
        id: '1',
        action: 'sync_all' as CommandAction,
        params: {},
        timestamp: Date.now(),
      }

      expect(MAVLinkConverter.blocklyToMAVLink(command)).toEqual([])
    })
  })
})

describe('MAVLinkConverter - Formation Commands', () => {
  const droneIds = [1, 2, 3, 4]

  describe('SET_FORMATION', () => {
    test('creates LINE formation', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.SET_FORMATION,
        params: {
          formationType: FormationType.LINE,
          spacing: 3,
          x: 0,
          y: 0,
          z: 2,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      expect(result.size).toBe(4)

      // Verify all drones have waypoints
      for (const droneId of droneIds) {
        const waypoint = result.get(droneId)
        expect(waypoint).toBeDefined()
        expect(waypoint!.command).toBe(MAV_CMD.NAV_WAYPOINT)
        expect(waypoint!.target_system).toBe(droneId)
      }

      // Verify LINE spacing
      const wp0 = result.get(1)!
      const wp1 = result.get(2)!
      const distance = Math.abs(wp1.param5! - wp0.param5!)
      expect(distance).toBeCloseTo(3, 0.1)
    })

    test('creates GRID formation (2x2)', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.SET_FORMATION,
        params: {
          formationType: FormationType.GRID,
          spacing: 2,
          rows: 2,
          cols: 2,
          x: 0,
          y: 0,
          z: 3,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      expect(result.size).toBe(4)

      // All waypoints should have altitude = 3
      for (const waypoint of result.values()) {
        expect(waypoint.param7).toBe(3)
      }
    })

    test('creates CIRCLE formation', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.SET_FORMATION,
        params: {
          formationType: FormationType.CIRCLE,
          spacing: 2,
          x: 10,
          y: 10,
          z: 2,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      expect(result.size).toBe(4)

      // Verify all drones are roughly equidistant from center
      const center = { x: 10, y: 10 }
      const distances: number[] = []

      for (const waypoint of result.values()) {
        const dx = waypoint.param5! - center.x
        const dy = waypoint.param6! - center.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        distances.push(distance)
      }

      // All distances should be similar (within 0.1m)
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length
      for (const distance of distances) {
        expect(Math.abs(distance - avgDistance)).toBeLessThan(0.1)
      }
    })
  })

  describe('MOVE_FORMATION', () => {
    test('moves formation FORWARD', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.MOVE_FORMATION,
        params: {
          direction: Direction.FORWARD,
          distance: 5,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      expect(result.size).toBe(4)

      // FORWARD = +Y in coordinate system
      for (const waypoint of result.values()) {
        expect(waypoint.param5).toBe(0) // x offset
        expect(waypoint.param6).toBe(5) // y offset (forward)
        expect(waypoint.param7).toBe(0) // z offset
      }
    })

    test('moves formation UP', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.MOVE_FORMATION,
        params: {
          direction: Direction.UP,
          distance: 3,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      for (const waypoint of result.values()) {
        expect(waypoint.param5).toBe(0)
        expect(waypoint.param6).toBe(0)
        expect(waypoint.param7).toBe(3) // z offset (up)
      }
    })

    test('moves formation LEFT', () => {
      const command: Command = {
        id: '1',
        action: CommandAction.MOVE_FORMATION,
        params: {
          direction: Direction.LEFT,
          distance: 2,
        },
        timestamp: Date.now(),
      }

      const result = MAVLinkConverter.convertFormationCommand(command, droneIds)

      for (const waypoint of result.values()) {
        expect(waypoint.param5).toBe(-2) // x offset (left)
        expect(waypoint.param6).toBe(0)
        expect(waypoint.param7).toBe(0)
      }
    })
  })
})

describe('MAVLinkConverter - Formation Position Calculations', () => {
  test('LINE formation positions', () => {
    const positions = MAVLinkConverter.calculateFormationPositions(
      FormationType.LINE,
      4,
      2, // spacing
      undefined,
      undefined,
      0,
      0,
      2
    )

    expect(positions).toHaveLength(4)

    // Should be centered: [-3, -1, 1, 3]
    expect(positions[0].x).toBeCloseTo(-3, 0.1)
    expect(positions[1].x).toBeCloseTo(-1, 0.1)
    expect(positions[2].x).toBeCloseTo(1, 0.1)
    expect(positions[3].x).toBeCloseTo(3, 0.1)

    // All at same y, z
    for (const pos of positions) {
      expect(pos.y).toBe(0)
      expect(pos.z).toBe(2)
    }
  })

  test('GRID formation positions', () => {
    const positions = MAVLinkConverter.calculateFormationPositions(
      FormationType.GRID,
      4,
      3, // spacing
      2, // rows
      2, // cols
      0,
      0,
      2
    )

    expect(positions).toHaveLength(4)

    // Check distances between adjacent drones
    const dist01 = Math.hypot(
      positions[1].x - positions[0].x,
      positions[1].y - positions[0].y
    )
    expect(dist01).toBeCloseTo(3, 0.1)
  })

  test('CIRCLE formation positions', () => {
    const positions = MAVLinkConverter.calculateFormationPositions(
      FormationType.CIRCLE,
      8,
      2, // spacing (affects radius)
      undefined,
      undefined,
      0,
      0,
      2
    )

    expect(positions).toHaveLength(8)

    // All should be equidistant from center
    const distances = positions.map(p => Math.sqrt(p.x * p.x + p.y * p.y))
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length

    for (const distance of distances) {
      expect(Math.abs(distance - avgDistance)).toBeLessThan(0.01)
    }
  })

  test('V_SHAPE formation', () => {
    const positions = MAVLinkConverter.calculateFormationPositions(
      FormationType.V_SHAPE,
      4,
      2,
      undefined,
      undefined,
      0,
      0,
      2
    )

    expect(positions).toHaveLength(4)

    // V-shape: y should decrease as we go outward
    expect(positions[0].y).toBeGreaterThanOrEqual(positions[1].y)
  })
})

describe('MAVLinkConverter - Direction Offset', () => {
  test('FORWARD direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.FORWARD, 5)
    expect(offset).toEqual({ x: 0, y: 5, z: 0 })
  })

  test('BACKWARD direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.BACKWARD, 3)
    expect(offset).toEqual({ x: 0, y: -3, z: 0 })
  })

  test('LEFT direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.LEFT, 2)
    expect(offset).toEqual({ x: -2, y: 0, z: 0 })
  })

  test('RIGHT direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.RIGHT, 4)
    expect(offset).toEqual({ x: 4, y: 0, z: 0 })
  })

  test('UP direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.UP, 1.5)
    expect(offset).toEqual({ x: 0, y: 0, z: 1.5 })
  })

  test('DOWN direction', () => {
    const offset = MAVLinkConverter.getDirectionOffset(Direction.DOWN, 2.5)
    expect(offset).toEqual({ x: 0, y: 0, z: -2.5 })
  })
})

describe('MAVLinkConverter - Telemetry Conversion', () => {
  beforeEach(() => {
    // Set home position for coordinate conversion
    coordinateConverter.setHome(37.7749, -122.4194, 0)
  })

  describe('MAVLink to DroneState', () => {
    test('converts GLOBAL_POSITION_INT to DroneState', () => {
      const globalPos = {
        msgid: 33,
        time_boot_ms: 10000,
        lat: 377749000, // 37.7749 * 1E7
        lon: -1224194000, // -122.4194 * 1E7
        alt: 100000, // 100m in mm
        relative_alt: 50000, // 50m in mm
        vx: -200, // -2 m/s in cm/s
        vy: 300, // 3 m/s
        vz: -100, // -1 m/s
        hdg: 9000, // 90 degrees in cdeg
      }

      const state = MAVLinkConverter.mavlinkToTelemetry(1, globalPos, 85, 'flying')

      expect(state.id).toBe(1)
      expect(state.battery).toBe(85)
      expect(state.status).toBe('flying')

      // Position converted to local coordinates
      expect(state.position).toBeDefined()
      expect(state.position!.z).toBeCloseTo(50, 0.1) // relative altitude

      // Velocity converted from cm/s to m/s
      expect(state.velocity).toBeDefined()
      expect(state.velocity!.x).toBeCloseTo(-2, 0.01)
      expect(state.velocity!.y).toBeCloseTo(3, 0.01)
      expect(state.velocity!.z).toBeCloseTo(-1, 0.01)

      // Rotation (heading)
      expect(state.rotation).toBeDefined()
      expect(state.rotation!.z).toBeCloseTo(90, 0.01)
    })

    test('handles missing optional parameters', () => {
      const state = MAVLinkConverter.mavlinkToTelemetry(2)

      expect(state.id).toBe(2)
      expect(state.battery).toBeUndefined()
      expect(state.status).toBeUndefined()
      expect(state.position).toBeUndefined()
    })
  })

  describe('DroneState to MAVLink', () => {
    test('converts DroneState to MAVLink format', () => {
      const drone: DroneState = {
        id: 1,
        position: { x: 10, y: 20, z: 5 },
        velocity: { x: 2, y: -1, z: 0.5 },
        rotation: { x: 0, y: 0, z: 45 },
        battery: 80,
        status: 'flying',
        isActive: true,
      }

      const mavlink = MAVLinkConverter.telemetryToMAVLink(drone)

      expect(mavlink.timeBootMs).toBeGreaterThan(0)

      // Coordinates converted to GPS format
      expect(mavlink.lat).toBeDefined()
      expect(mavlink.lon).toBeDefined()
      expect(mavlink.alt).toBeDefined()
      expect(mavlink.relativeAlt).toBeDefined()

      // Velocity
      expect(mavlink.vx).toBe(2)
      expect(mavlink.vy).toBe(-1)
      expect(mavlink.vz).toBe(0.5)

      // Heading
      expect(mavlink.hdg).toBe(45)
    })
  })

  describe('Status Mapping', () => {
    test('droneStatusToMAVState', () => {
      expect(MAVLinkConverter.droneStatusToMAVState('landed')).toBe(MAV_STATE.STANDBY)
      expect(MAVLinkConverter.droneStatusToMAVState('flying')).toBe(MAV_STATE.ACTIVE)
      expect(MAVLinkConverter.droneStatusToMAVState('hovering')).toBe(MAV_STATE.ACTIVE)
      expect(MAVLinkConverter.droneStatusToMAVState('error')).toBe(MAV_STATE.CRITICAL)
      expect(MAVLinkConverter.droneStatusToMAVState('idle' as any)).toBe(MAV_STATE.UNINIT)
    })

    test('mavStateTodroneStatus', () => {
      expect(MAVLinkConverter.mavStateTodroneStatus(MAV_STATE.STANDBY)).toBe('landed')
      expect(MAVLinkConverter.mavStateTodroneStatus(MAV_STATE.ACTIVE)).toBe('flying')
      expect(MAVLinkConverter.mavStateTodroneStatus(MAV_STATE.CRITICAL)).toBe('error')
      expect(MAVLinkConverter.mavStateTodroneStatus(MAV_STATE.EMERGENCY)).toBe('error')
      expect(MAVLinkConverter.mavStateTodroneStatus(MAV_STATE.UNINIT)).toBe('landed')
    })
  })
})

/**
 * MAVLink Integration Tests
 *
 * End-to-end tests for complete MAVLink workflows
 */

import { MAVLinkConverter } from '@/services/mavlink/MAVLinkConverter'
import {
  createHeartbeat,
  createGlobalPositionInt,
  createSysStatus,
  createCommandLong,
  createCommandAck,
  parseHeartbeat,
  parseGlobalPositionInt,
  parseSysStatus,
  parseCommandLong,
  parseCommandAck,
} from '@/services/mavlink/MAVLinkMessages'
import { serializePacket, parsePacket } from '@/services/mavlink/MAVLinkProtocol'
import { MAV_TYPE, MAV_AUTOPILOT, MAV_STATE, MAV_MODE_FLAG, MAV_RESULT } from '@/types/mavlink'
import { MAV_CMD } from '@/services/mavlink/MAVLinkCommands'
import { CommandAction, FormationType, Direction } from '@/constants/commands'
import { coordinateConverter } from '@/services/mavlink/CoordinateConverter'
import type { Command } from '@/types/websocket'

describe('MAVLink Integration - Basic Flight Scenario', () => {
  beforeAll(() => {
    // Set home position
    coordinateConverter.setHome(37.7749, -122.4194, 0)
  })

  test('Complete flight cycle: HEARTBEAT → TAKEOFF → STATUS → LAND', () => {
    // 1. Generate HEARTBEAT
    const heartbeatPacket = createHeartbeat(
      MAV_TYPE.QUADROTOR,
      MAV_AUTOPILOT.GENERIC,
      MAV_MODE_FLAG.GUIDED_ENABLED | MAV_MODE_FLAG.STABILIZE_ENABLED,
      0,
      MAV_STATE.STANDBY
    )

    // Serialize and parse
    const heartbeatSerialized = serializePacket(heartbeatPacket)
    const heartbeatParsed = parsePacket(heartbeatSerialized)
    const heartbeatMsg = parseHeartbeat(heartbeatParsed!.payload)

    expect(heartbeatMsg.type).toBe(MAV_TYPE.QUADROTOR)
    expect(heartbeatMsg.autopilot).toBe(MAV_AUTOPILOT.GENERIC)
    expect(heartbeatMsg.system_status).toBe(MAV_STATE.STANDBY)

    // 2. Send TAKEOFF command
    const takeoffCmd: Command = {
      id: '1',
      action: CommandAction.TAKEOFF_ALL,
      params: { altitude: 10 },
      timestamp: Date.now(),
    }

    const takeoffMAVLink = MAVLinkConverter.blocklyToMAVLink(takeoffCmd, 1)
    expect(takeoffMAVLink[0].command).toBe(MAV_CMD.NAV_TAKEOFF)
    expect(takeoffMAVLink[0].param7).toBe(10)

    // Create MAVLink packet
    const commandPacket = createCommandLong(
      takeoffMAVLink[0].command,
      takeoffMAVLink[0].param1,
      takeoffMAVLink[0].param2,
      takeoffMAVLink[0].param3,
      takeoffMAVLink[0].param4,
      takeoffMAVLink[0].param5,
      takeoffMAVLink[0].param6,
      takeoffMAVLink[0].param7,
      takeoffMAVLink[0].target_system
    )

    const commandSerialized = serializePacket(commandPacket)
    const commandParsed = parsePacket(commandSerialized)
    const commandMsg = parseCommandLong(commandParsed!.payload)

    expect(commandMsg.command).toBe(MAV_CMD.NAV_TAKEOFF)
    expect(commandMsg.param7).toBe(10)

    // 3. Receive COMMAND_ACK
    const ackPacket = createCommandAck(MAV_CMD.NAV_TAKEOFF, MAV_RESULT.ACCEPTED)
    const ackSerialized = serializePacket(ackPacket)
    const ackParsed = parsePacket(ackSerialized)
    const ackMsg = parseCommandAck(ackParsed!.payload)

    expect(ackMsg.command).toBe(MAV_CMD.NAV_TAKEOFF)
    expect(ackMsg.result).toBe(MAV_RESULT.ACCEPTED)

    // 4. Receive telemetry at altitude 10m
    const telemetryPacket = createGlobalPositionInt(
      15000, // time_boot_ms
      37.7749, // lat
      -122.4194, // lon
      10, // alt (MSL)
      10, // relative_alt
      0, // vx
      0, // vy
      0, // vz (hovering)
      90 // hdg (facing east)
    )

    const telemetrySerialized = serializePacket(telemetryPacket)
    const telemetryParsed = parsePacket(telemetrySerialized)
    const telemetryMsg = parseGlobalPositionInt(telemetryParsed!.payload)

    expect(telemetryMsg.relative_alt).toBe(10000) // 10m in mm
    expect(telemetryMsg.vz).toBe(0) // hovering

    // Convert to DroneState
    const droneState = MAVLinkConverter.mavlinkToTelemetry(1, telemetryMsg, 85, 'flying')
    expect(droneState.status).toBe('flying')
    expect(droneState.battery).toBe(85)
    expect(droneState.position?.z).toBeCloseTo(10, 0.1)

    // 5. Send LAND command
    const landCmd: Command = {
      id: '2',
      action: CommandAction.LAND_ALL,
      params: {},
      timestamp: Date.now(),
    }

    const landMAVLink = MAVLinkConverter.blocklyToMAVLink(landCmd, 1)
    expect(landMAVLink[0].command).toBe(MAV_CMD.NAV_LAND)
  })

  test('Battery status telemetry flow', () => {
    // Create SYS_STATUS with battery info
    const sysStatusPacket = createSysStatus(
      14800, // 14.8V in mV
      75 // 75% remaining
    )

    const serialized = serializePacket(sysStatusPacket)
    const parsed = parsePacket(serialized)
    const sysStatus = parseSysStatus(parsed!.payload)

    expect(sysStatus.voltage_battery).toBe(14800)
    expect(sysStatus.battery_remaining).toBe(75)
  })
})

describe('MAVLink Integration - Formation Flight Scenario', () => {
  const droneIds = [1, 2, 3, 4]

  test('Complete formation scenario: SET → MOVE → LAND', () => {
    // 1. SET_FORMATION to LINE
    const setFormationCmd: Command = {
      id: '1',
      action: CommandAction.SET_FORMATION,
      params: {
        formationType: FormationType.LINE,
        spacing: 3,
        x: 0,
        y: 0,
        z: 5,
      },
      timestamp: Date.now(),
    }

    const formationWaypoints = MAVLinkConverter.convertFormationCommand(
      setFormationCmd,
      droneIds
    )

    expect(formationWaypoints.size).toBe(4)

    // Verify each drone gets a waypoint
    const waypoints = Array.from(formationWaypoints.values())
    expect(waypoints.every(wp => wp.command === MAV_CMD.NAV_WAYPOINT)).toBe(true)
    expect(waypoints.every(wp => wp.param7 === 5)).toBe(true) // altitude

    // Create packets for each drone
    const packets = waypoints.map(wp =>
      createCommandLong(
        wp.command,
        wp.param1,
        wp.param2,
        wp.param3,
        wp.param4,
        wp.param5,
        wp.param6,
        wp.param7,
        wp.target_system
      )
    )

    expect(packets).toHaveLength(4)

    // 2. MOVE_FORMATION forward
    const moveFormationCmd: Command = {
      id: '2',
      action: CommandAction.MOVE_FORMATION,
      params: {
        direction: Direction.FORWARD,
        distance: 10,
      },
      timestamp: Date.now(),
    }

    const moveWaypoints = MAVLinkConverter.convertFormationCommand(
      moveFormationCmd,
      droneIds
    )

    expect(moveWaypoints.size).toBe(4)

    // All drones should have same offset
    for (const wp of moveWaypoints.values()) {
      expect(wp.param5).toBe(0) // x
      expect(wp.param6).toBe(10) // y (forward)
      expect(wp.param7).toBe(0) // z
    }

    // 3. LAND_ALL
    const landCmd: Command = {
      id: '3',
      action: CommandAction.LAND_ALL,
      params: {},
      timestamp: Date.now(),
    }

    // Send to each drone
    for (const droneId of droneIds) {
      const landMAVLink = MAVLinkConverter.blocklyToMAVLink(landCmd, droneId)
      expect(landMAVLink[0].command).toBe(MAV_CMD.NAV_LAND)
      expect(landMAVLink[0].target_system).toBe(droneId)
    }
  })

  test('Formation change: LINE → GRID → CIRCLE', () => {
    // 1. LINE formation
    const lineCmd: Command = {
      id: '1',
      action: CommandAction.SET_FORMATION,
      params: {
        formationType: FormationType.LINE,
        spacing: 2,
        x: 0,
        y: 0,
        z: 3,
      },
      timestamp: Date.now(),
    }

    const lineWaypoints = MAVLinkConverter.convertFormationCommand(lineCmd, droneIds)
    const linePositions = Array.from(lineWaypoints.values()).map(wp => ({
      x: wp.param5!,
      y: wp.param6!,
      z: wp.param7!,
    }))

    // All should be on same y-axis
    expect(linePositions.every(p => p.y === 0)).toBe(true)

    // 2. GRID formation (2x2)
    const gridCmd: Command = {
      id: '2',
      action: CommandAction.SET_FORMATION,
      params: {
        formationType: FormationType.GRID,
        spacing: 3,
        rows: 2,
        cols: 2,
        x: 10,
        y: 10,
        z: 3,
      },
      timestamp: Date.now(),
    }

    const gridWaypoints = MAVLinkConverter.convertFormationCommand(gridCmd, droneIds)
    const gridPositions = Array.from(gridWaypoints.values()).map(wp => ({
      x: wp.param5!,
      y: wp.param6!,
      z: wp.param7!,
    }))

    // Should form 2x2 grid around (10, 10, 3)
    expect(gridPositions.every(p => p.z === 3)).toBe(true)

    // 3. CIRCLE formation
    const circleCmd: Command = {
      id: '3',
      action: CommandAction.SET_FORMATION,
      params: {
        formationType: FormationType.CIRCLE,
        spacing: 2,
        x: 0,
        y: 0,
        z: 5,
      },
      timestamp: Date.now(),
    }

    const circleWaypoints = MAVLinkConverter.convertFormationCommand(circleCmd, droneIds)
    const circlePositions = Array.from(circleWaypoints.values()).map(wp => ({
      x: wp.param5!,
      y: wp.param6!,
      z: wp.param7!,
    }))

    // All should be equidistant from center (0, 0)
    const distances = circlePositions.map(p => Math.sqrt(p.x * p.x + p.y * p.y))
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length

    for (const distance of distances) {
      expect(Math.abs(distance - avgDistance)).toBeLessThan(0.1)
    }
  })
})

describe('MAVLink Integration - Telemetry Stream Simulation', () => {
  test('Simulate 10-second telemetry stream at 1Hz', () => {
    const droneId = 1
    const startTime = 0
    const duration = 10 // seconds
    const frequency = 1 // Hz

    const telemetryMessages = []

    for (let t = 0; t <= duration; t += 1 / frequency) {
      const timeBootMs = startTime + t * 1000

      // Simulate drone ascending from 0 to 10m
      const altitude = (t / duration) * 10

      // Simulate forward movement
      const forwardDistance = (t / duration) * 20

      const packet = createGlobalPositionInt(
        timeBootMs,
        37.7749,
        -122.4194,
        altitude,
        altitude,
        2, // vx = 2 m/s
        0,
        altitude > 9.5 ? 0 : 1, // vz = 1 m/s climbing, 0 at top
        0 // heading
      )

      telemetryMessages.push(packet)
    }

    expect(telemetryMessages).toHaveLength(11) // 0-10 seconds at 1Hz

    // Verify first and last
    const first = parseGlobalPositionInt(telemetryMessages[0].payload)
    const last = parseGlobalPositionInt(telemetryMessages[telemetryMessages.length - 1].payload)

    expect(first.relative_alt).toBe(0)
    expect(last.relative_alt).toBeCloseTo(10000, -2) // ~10m in mm

    // Verify all can be serialized and parsed
    for (const packet of telemetryMessages) {
      const serialized = serializePacket(packet)
      const parsed = parsePacket(serialized)
      expect(parsed).not.toBeNull()
      expect(parsed!.msgid).toBe(33) // GLOBAL_POSITION_INT
    }
  })

  test('Simulate multi-drone telemetry', () => {
    const droneCount = 4
    const packets = []

    for (let droneId = 1; droneId <= droneCount; droneId++) {
      // Each drone at different position
      const packet = createGlobalPositionInt(
        10000,
        37.7749,
        -122.4194 + droneId * 0.0001, // Slightly different longitude
        5,
        5,
        1,
        0,
        0,
        droneId * 90 // Different headings
      )

      packets.push({ droneId, packet })
    }

    expect(packets).toHaveLength(4)

    // Verify each can be processed independently
    for (const { droneId, packet } of packets) {
      const serialized = serializePacket(packet)
      const parsed = parsePacket(serialized)
      const msg = parseGlobalPositionInt(parsed!.payload)

      const state = MAVLinkConverter.mavlinkToTelemetry(droneId, msg, 90, 'flying')
      expect(state.id).toBe(droneId)
      expect(state.rotation?.z).toBeCloseTo(droneId * 90, 0.1)
    }
  })
})

describe('MAVLink Integration - Error Scenarios', () => {
  test('Handles corrupted packet gracefully', () => {
    const packet = createHeartbeat()
    const serialized = serializePacket(packet)

    // Corrupt the checksum
    serialized[serialized.length - 1] ^= 0xFF

    expect(() => parsePacket(serialized)).toThrow()

    // parsePacketSafe should not throw
    const result = parsePacket(serialized, false) // disable CRC
    expect(result).not.toBeNull()
  })

  test('Handles command rejection', () => {
    const ackPacket = createCommandAck(
      MAV_CMD.NAV_TAKEOFF,
      MAV_RESULT.DENIED, // Command rejected
      0,
      0,
      1,
      0
    )

    const serialized = serializePacket(ackPacket)
    const parsed = parsePacket(serialized)
    const ack = parseCommandAck(parsed!.payload)

    expect(ack.result).toBe(MAV_RESULT.DENIED)
    expect(ack.command).toBe(MAV_CMD.NAV_TAKEOFF)
  })

  test('Handles negative velocities correctly', () => {
    // Descending drone
    const packet = createGlobalPositionInt(
      5000,
      37.7749,
      -122.4194,
      50,
      50,
      -3, // moving backward
      2, // moving right
      -5, // descending
      180 // heading south
    )

    const serialized = serializePacket(packet)
    const parsed = parsePacket(serialized)
    const msg = parseGlobalPositionInt(parsed!.payload)

    // Verify signed values
    expect(msg.vx).toBe(-300) // -3 m/s in cm/s
    expect(msg.vy).toBe(200) // 2 m/s
    expect(msg.vz).toBe(-500) // -5 m/s in cm/s

    const state = MAVLinkConverter.mavlinkToTelemetry(1, msg, 80, 'flying')
    expect(state.velocity?.x).toBeCloseTo(-3, 0.01)
    expect(state.velocity?.y).toBeCloseTo(2, 0.01)
    expect(state.velocity?.z).toBeCloseTo(-5, 0.01)
  })
})

describe('MAVLink Integration - Performance Tests', () => {
  test('Handles high-frequency telemetry (100 messages)', () => {
    const startTime = Date.now()
    const packets = []

    for (let i = 0; i < 100; i++) {
      const packet = createGlobalPositionInt(
        i * 100,
        37.7749,
        -122.4194,
        i / 10,
        i / 10,
        1,
        0,
        0,
        0
      )
      packets.push(packet)
    }

    const elapsedTime = Date.now() - startTime
    expect(elapsedTime).toBeLessThan(100) // Should complete in < 100ms
    expect(packets).toHaveLength(100)
  })

  test('Handles large formation (16 drones)', () => {
    const droneIds = Array.from({ length: 16 }, (_, i) => i + 1)

    const formationCmd: Command = {
      id: '1',
      action: CommandAction.SET_FORMATION,
      params: {
        formationType: FormationType.GRID,
        spacing: 2,
        rows: 4,
        cols: 4,
        x: 0,
        y: 0,
        z: 3,
      },
      timestamp: Date.now(),
    }

    const startTime = Date.now()
    const waypoints = MAVLinkConverter.convertFormationCommand(formationCmd, droneIds)
    const elapsedTime = Date.now() - startTime

    expect(waypoints.size).toBe(16)
    expect(elapsedTime).toBeLessThan(50) // Should complete in < 50ms
  })
})

/**
 * MAVLink Message Construction Utilities
 *
 * High-level functions to create common MAVLink messages
 */

import type {
  HeartbeatMessage,
  SysStatusMessage,
  GlobalPositionIntMessage,
  CommandLongMessage,
  CommandAckMessage,
  MissionCountMessage,
  MissionItemIntMessage,
  MissionAckMessage,
  MissionRequestIntMessage,
  MissionRequestMessage,
  MissionCurrentMessage,
  MissionItemReachedMessage,
} from "@/types/mavlink";
import {
  MAV_TYPE,
  MAV_AUTOPILOT,
  MAV_STATE,
  MAV_MODE_FLAG,
  MAV_RESULT,
} from "@/types/mavlink";
import { MAV_CMD } from "./MAVLinkCommands";
import {
  createMAVLinkPacket,
  MAV_MSG_ID,
  packUint8,
  packUint16,
  packInt16,
  packUint32,
  packInt32,
  packFloat,
  unpackUint8,
  unpackUint16,
  unpackInt16,
  unpackUint32,
  unpackInt32,
  unpackFloat,
} from "./MAVLinkProtocol";

/**
 * Create HEARTBEAT message (#0)
 */
export function createHeartbeat(
  type: number = MAV_TYPE.QUADROTOR,
  autopilot: number = MAV_AUTOPILOT.GENERIC,
  baseMode: number = MAV_MODE_FLAG.GUIDED_ENABLED |
    MAV_MODE_FLAG.STABILIZE_ENABLED,
  customMode: number = 0,
  systemStatus: number = MAV_STATE.ACTIVE,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(9);
  let offset = 0;

  // custom_mode (uint32)
  payload.set(packUint32(customMode), offset);
  offset += 4;

  // type (uint8)
  payload.set(packUint8(type), offset);
  offset += 1;

  // autopilot (uint8)
  payload.set(packUint8(autopilot), offset);
  offset += 1;

  // base_mode (uint8)
  payload.set(packUint8(baseMode), offset);
  offset += 1;

  // system_status (uint8)
  payload.set(packUint8(systemStatus), offset);
  offset += 1;

  // mavlink_version (uint8) - always 3 for MAVLink 2
  payload.set(packUint8(3), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.HEARTBEAT,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

/**
 * Create SYS_STATUS message (#1)
 */
export function createSysStatus(
  batteryVoltage: number, // mV
  batteryRemaining: number, // % (0-100)
) {
  const payload = new Uint8Array(31);
  let offset = 0;

  // onboard_control_sensors_present (uint32)
  payload.set(packUint32(0), offset);
  offset += 4;

  // onboard_control_sensors_enabled (uint32)
  payload.set(packUint32(0), offset);
  offset += 4;

  // onboard_control_sensors_health (uint32)
  payload.set(packUint32(0), offset);
  offset += 4;

  // load (uint16) - CPU load in 0.1%
  payload.set(packUint16(0), offset);
  offset += 2;

  // voltage_battery (uint16) - Battery voltage in mV
  payload.set(packUint16(batteryVoltage), offset);
  offset += 2;

  // current_battery (int16) - Battery current in cA
  payload.set(packUint16(0), offset);
  offset += 2;

  // battery_remaining (int8) - Battery remaining %
  payload.set(packUint8(batteryRemaining), offset);
  offset += 1;

  // drop_rate_comm (uint16)
  payload.set(packUint16(0), offset);
  offset += 2;

  // errors_comm (uint16)
  payload.set(packUint16(0), offset);
  offset += 2;

  // errors_count1-4 (uint16 each)
  payload.set(packUint16(0), offset);
  offset += 2;
  payload.set(packUint16(0), offset);
  offset += 2;
  payload.set(packUint16(0), offset);
  offset += 2;
  payload.set(packUint16(0), offset);

  return createMAVLinkPacket(MAV_MSG_ID.SYS_STATUS, payload);
}

/**
 * Create GLOBAL_POSITION_INT message (#33)
 */
export function createGlobalPositionInt(
  timeBootMs: number,
  lat: number, // degrees
  lon: number, // degrees
  alt: number, // meters (MSL)
  relativeAlt: number, // meters (above ground)
  vx: number, // m/s
  vy: number, // m/s
  vz: number, // m/s
  hdg: number, // degrees
) {
  const payload = new Uint8Array(28);
  let offset = 0;

  // time_boot_ms (uint32)
  payload.set(packUint32(timeBootMs), offset);
  offset += 4;

  // lat (int32) - Latitude in degrees * 1E7
  payload.set(packInt32(Math.round(lat * 1e7)), offset);
  offset += 4;

  // lon (int32) - Longitude in degrees * 1E7
  payload.set(packInt32(Math.round(lon * 1e7)), offset);
  offset += 4;

  // alt (int32) - Altitude MSL in mm
  payload.set(packInt32(Math.round(alt * 1000)), offset);
  offset += 4;

  // relative_alt (int32) - Altitude above ground in mm
  payload.set(packInt32(Math.round(relativeAlt * 1000)), offset);
  offset += 4;

  // vx (int16) - Ground X speed in cm/s (SIGNED for negative velocities)
  payload.set(packInt16(Math.round(vx * 100)), offset);
  offset += 2;

  // vy (int16) - Ground Y speed in cm/s (SIGNED for negative velocities)
  payload.set(packInt16(Math.round(vy * 100)), offset);
  offset += 2;

  // vz (int16) - Ground Z speed in cm/s (SIGNED for negative velocities)
  payload.set(packInt16(Math.round(vz * 100)), offset);
  offset += 2;

  // hdg (uint16) - Heading in cdeg (0-36000)
  payload.set(packUint16(Math.round(hdg * 100)), offset);

  return createMAVLinkPacket(MAV_MSG_ID.GLOBAL_POSITION_INT, payload);
}

/**
 * Create COMMAND_LONG message (#76)
 */
export function createCommandLong(
  command: number,
  param1: number = 0,
  param2: number = 0,
  param3: number = 0,
  param4: number = 0,
  param5: number = 0,
  param6: number = 0,
  param7: number = 0,
  targetSystem: number = 0,
  targetComponent: number = 0,
  confirmation: number = 0,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(33);
  let offset = 0;

  // param1-7 (float)
  payload.set(packFloat(param1), offset);
  offset += 4;
  payload.set(packFloat(param2), offset);
  offset += 4;
  payload.set(packFloat(param3), offset);
  offset += 4;
  payload.set(packFloat(param4), offset);
  offset += 4;
  payload.set(packFloat(param5), offset);
  offset += 4;
  payload.set(packFloat(param6), offset);
  offset += 4;
  payload.set(packFloat(param7), offset);
  offset += 4;

  // command (uint16)
  payload.set(packUint16(command), offset);
  offset += 2;

  // target_system (uint8)
  payload.set(packUint8(targetSystem), offset);
  offset += 1;

  // target_component (uint8)
  payload.set(packUint8(targetComponent), offset);
  offset += 1;

  // confirmation (uint8)
  payload.set(packUint8(confirmation), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.COMMAND_LONG,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

/**
 * Create COMMAND_ACK message (#77)
 */
export function createCommandAck(
  command: number,
  result: number = MAV_RESULT.ACCEPTED,
  progress: number = 255,
  resultParam2: number = 0,
  targetSystem: number = 0,
  targetComponent: number = 0,
) {
  const payload = new Uint8Array(10);
  let offset = 0;

  // command (uint16)
  payload.set(packUint16(command), offset);
  offset += 2;

  // result (uint8)
  payload.set(packUint8(result), offset);
  offset += 1;

  // progress (uint8)
  payload.set(packUint8(progress), offset);
  offset += 1;

  // result_param2 (int32)
  payload.set(packInt32(resultParam2), offset);
  offset += 4;

  // target_system (uint8)
  payload.set(packUint8(targetSystem), offset);
  offset += 1;

  // target_component (uint8)
  payload.set(packUint8(targetComponent), offset);

  return createMAVLinkPacket(MAV_MSG_ID.COMMAND_ACK, payload);
}

export function createMissionCount(
  count: number,
  targetSystem: number = 0,
  targetComponent: number = 0,
  missionType: number = 0,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(5);
  let offset = 0;

  payload.set(packUint16(count), offset);
  offset += 2;
  payload.set(packUint8(targetSystem), offset);
  offset += 1;
  payload.set(packUint8(targetComponent), offset);
  offset += 1;
  payload.set(packUint8(missionType), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.MISSION_COUNT,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

export function createMissionItemInt(
  message: MissionItemIntMessage,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(38);
  let offset = 0;

  payload.set(packFloat(message.param1), offset);
  offset += 4;
  payload.set(packFloat(message.param2), offset);
  offset += 4;
  payload.set(packFloat(message.param3), offset);
  offset += 4;
  payload.set(packFloat(message.param4), offset);
  offset += 4;
  payload.set(packInt32(message.x), offset);
  offset += 4;
  payload.set(packInt32(message.y), offset);
  offset += 4;
  payload.set(packFloat(message.z), offset);
  offset += 4;
  payload.set(packUint16(message.seq), offset);
  offset += 2;
  payload.set(packUint16(message.command), offset);
  offset += 2;
  payload.set(packUint8(message.target_system), offset);
  offset += 1;
  payload.set(packUint8(message.target_component), offset);
  offset += 1;
  payload.set(packUint8(message.frame), offset);
  offset += 1;
  payload.set(packUint8(message.current), offset);
  offset += 1;
  payload.set(packUint8(message.autocontinue), offset);
  offset += 1;
  payload.set(packUint8(message.mission_type), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.MISSION_ITEM_INT,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

export function createMissionClearAll(
  targetSystem: number = 0,
  targetComponent: number = 0,
  missionType: number = 0,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(3);
  let offset = 0;

  payload.set(packUint8(targetSystem), offset);
  offset += 1;
  payload.set(packUint8(targetComponent), offset);
  offset += 1;
  payload.set(packUint8(missionType), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.MISSION_CLEAR_ALL,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

export function createMissionSetCurrent(
  missionSeq: number,
  targetSystem: number = 0,
  targetComponent: number = 0,
  missionType: number = 0,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  const payload = new Uint8Array(5);
  let offset = 0;

  payload.set(packUint16(missionSeq), offset);
  offset += 2;
  payload.set(packUint8(targetSystem), offset);
  offset += 1;
  payload.set(packUint8(targetComponent), offset);
  offset += 1;
  payload.set(packUint8(missionType), offset);

  return createMAVLinkPacket(
    MAV_MSG_ID.MISSION_SET_CURRENT,
    payload,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

export function createMissionStart(
  targetSystem: number = 0,
  targetComponent: number = 0,
  firstItem: number = 0,
  lastItem: number = 0,
  sourceSystem: number = 1,
  sourceComponent: number = 1,
  seq: number = 0,
) {
  return createCommandLong(
    MAV_CMD.MISSION_START,
    firstItem,
    lastItem,
    0,
    0,
    0,
    0,
    0,
    targetSystem,
    targetComponent,
    0,
    sourceSystem,
    sourceComponent,
    seq,
  );
}

/**
 * Parse HEARTBEAT message
 */
export function parseHeartbeat(payload: Uint8Array): HeartbeatMessage {
  return {
    msgid: 0,
    custom_mode: unpackUint32(payload, 0),
    type: unpackUint8(payload, 4),
    autopilot: unpackUint8(payload, 5),
    base_mode: unpackUint8(payload, 6),
    system_status: unpackUint8(payload, 7),
    mavlink_version: unpackUint8(payload, 8),
  };
}

/**
 * Parse SYS_STATUS message
 */
export function parseSysStatus(payload: Uint8Array): SysStatusMessage {
  return {
    msgid: 1,
    onboard_control_sensors_present: unpackUint32(payload, 0),
    onboard_control_sensors_enabled: unpackUint32(payload, 4),
    onboard_control_sensors_health: unpackUint32(payload, 8),
    load: unpackUint16(payload, 12),
    voltage_battery: unpackUint16(payload, 14),
    current_battery: unpackUint16(payload, 16),
    battery_remaining: unpackUint8(payload, 18),
    drop_rate_comm: unpackUint16(payload, 19),
    errors_comm: unpackUint16(payload, 21),
    errors_count1: unpackUint16(payload, 23),
    errors_count2: unpackUint16(payload, 25),
    errors_count3: unpackUint16(payload, 27),
    errors_count4: unpackUint16(payload, 29),
  };
}

/**
 * Parse GLOBAL_POSITION_INT message
 */
export function parseGlobalPositionInt(
  payload: Uint8Array,
): GlobalPositionIntMessage {
  if (payload.byteLength < 20) {
    throw new Error(
      `GLOBAL_POSITION_INT payload too short: expected at least 20 bytes, received ${payload.byteLength}`,
    );
  }

  return {
    msgid: 33,
    time_boot_ms: unpackUint32(payload, 0),
    lat: unpackInt32(payload, 4),
    lon: unpackInt32(payload, 8),
    alt: unpackInt32(payload, 12),
    relative_alt: unpackInt32(payload, 16),
    vx: payload.byteLength >= 22 ? unpackInt16(payload, 20) : 0, // SIGNED
    vy: payload.byteLength >= 24 ? unpackInt16(payload, 22) : 0, // SIGNED
    vz: payload.byteLength >= 26 ? unpackInt16(payload, 24) : 0, // SIGNED
    hdg: payload.byteLength >= 28 ? unpackUint16(payload, 26) : 0,
  };
}

/**
 * Parse COMMAND_LONG message
 */
export function parseCommandLong(payload: Uint8Array): CommandLongMessage {
  return {
    msgid: 76,
    param1: unpackFloat(payload, 0),
    param2: unpackFloat(payload, 4),
    param3: unpackFloat(payload, 8),
    param4: unpackFloat(payload, 12),
    param5: unpackFloat(payload, 16),
    param6: unpackFloat(payload, 20),
    param7: unpackFloat(payload, 24),
    command: unpackUint16(payload, 28),
    target_system: unpackUint8(payload, 30),
    target_component: unpackUint8(payload, 31),
    confirmation: unpackUint8(payload, 32),
  };
}

/**
 * Parse COMMAND_ACK message
 */
export function parseCommandAck(payload: Uint8Array): CommandAckMessage {
  return {
    msgid: 77,
    command: unpackUint16(payload, 0),
    result: unpackUint8(payload, 2),
    progress: unpackUint8(payload, 3),
    result_param2: unpackInt32(payload, 4),
    target_system: unpackUint8(payload, 8),
    target_component: unpackUint8(payload, 9),
  };
}

export function parseMissionRequestInt(
  payload: Uint8Array,
): MissionRequestIntMessage {
  return {
    msgid: 51,
    seq: unpackUint16(payload, 0),
    target_system: unpackUint8(payload, 2),
    target_component: unpackUint8(payload, 3),
    mission_type: payload.byteLength > 4 ? unpackUint8(payload, 4) : 0,
  };
}

export function parseMissionRequest(
  payload: Uint8Array,
): MissionRequestMessage {
  return {
    msgid: 40,
    seq: unpackUint16(payload, 0),
    target_system: unpackUint8(payload, 2),
    target_component: unpackUint8(payload, 3),
  };
}

export function parseMissionAck(payload: Uint8Array): MissionAckMessage {
  return {
    msgid: 47,
    target_system: payload.byteLength > 0 ? unpackUint8(payload, 0) : 0,
    target_component: payload.byteLength > 1 ? unpackUint8(payload, 1) : 0,
    type: payload.byteLength > 2 ? unpackUint8(payload, 2) : 0,
    mission_type: payload.byteLength > 3 ? unpackUint8(payload, 3) : 0,
  };
}

export function parseMissionCount(payload: Uint8Array): MissionCountMessage {
  return {
    msgid: 44,
    count: unpackUint16(payload, 0),
    target_system: unpackUint8(payload, 2),
    target_component: unpackUint8(payload, 3),
    mission_type: payload.byteLength > 4 ? unpackUint8(payload, 4) : 0,
  };
}

export function parseMissionCurrent(payload: Uint8Array): MissionCurrentMessage {
  return {
    msgid: 42,
    seq: payload.byteLength >= 2 ? unpackUint16(payload, 0) : 0,
    mission_state: payload.byteLength > 2 ? unpackUint8(payload, 2) : 0,
    mission_mode: payload.byteLength > 3 ? unpackUint8(payload, 3) : 0,
    mission_id: payload.byteLength >= 8 ? unpackUint32(payload, 4) : 0,
  };
}

export function parseMissionItemReached(
  payload: Uint8Array,
): MissionItemReachedMessage {
  return {
    msgid: 46,
    seq: payload.byteLength >= 2 ? unpackUint16(payload, 0) : 0,
  };
}

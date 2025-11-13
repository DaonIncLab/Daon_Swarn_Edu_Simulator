/**
 * MAVLink v2 Protocol Implementation
 *
 * Low-level packet creation and parsing
 * Reference: https://mavlink.io/en/guide/serialization.html
 */

import type { MAVLinkPacket } from '@/types/mavlink'

/**
 * MAVLink v2 Magic Number
 */
export const MAVLINK_V2_MAGIC = 0xFD

/**
 * Message IDs for common messages
 */
export const MAV_MSG_ID = {
  HEARTBEAT: 0,
  SYS_STATUS: 1,
  SYSTEM_TIME: 2,
  PING: 4,
  CHANGE_OPERATOR_CONTROL: 5,
  CHANGE_OPERATOR_CONTROL_ACK: 6,
  AUTH_KEY: 7,
  SET_MODE: 11,
  PARAM_REQUEST_READ: 20,
  PARAM_REQUEST_LIST: 21,
  PARAM_VALUE: 22,
  PARAM_SET: 23,
  GPS_RAW_INT: 24,
  GPS_STATUS: 25,
  SCALED_IMU: 26,
  RAW_IMU: 27,
  RAW_PRESSURE: 28,
  SCALED_PRESSURE: 29,
  ATTITUDE: 30,
  ATTITUDE_QUATERNION: 31,
  LOCAL_POSITION_NED: 32,
  GLOBAL_POSITION_INT: 33,
  RC_CHANNELS_SCALED: 34,
  RC_CHANNELS_RAW: 35,
  SERVO_OUTPUT_RAW: 36,
  MISSION_REQUEST_PARTIAL_LIST: 37,
  MISSION_WRITE_PARTIAL_LIST: 38,
  MISSION_ITEM: 39,
  MISSION_REQUEST: 40,
  MISSION_SET_CURRENT: 41,
  MISSION_CURRENT: 42,
  MISSION_REQUEST_LIST: 43,
  MISSION_COUNT: 44,
  MISSION_CLEAR_ALL: 45,
  MISSION_ITEM_REACHED: 46,
  MISSION_ACK: 47,
  SET_GPS_GLOBAL_ORIGIN: 48,
  GPS_GLOBAL_ORIGIN: 49,
  PARAM_MAP_RC: 50,
  MISSION_REQUEST_INT: 51,
  SAFETY_SET_ALLOWED_AREA: 54,
  SAFETY_ALLOWED_AREA: 55,
  ATTITUDE_QUATERNION_COV: 61,
  NAV_CONTROLLER_OUTPUT: 62,
  GLOBAL_POSITION_INT_COV: 63,
  LOCAL_POSITION_NED_COV: 64,
  RC_CHANNELS: 65,
  REQUEST_DATA_STREAM: 66,
  DATA_STREAM: 67,
  MANUAL_CONTROL: 69,
  RC_CHANNELS_OVERRIDE: 70,
  MISSION_ITEM_INT: 73,
  VFR_HUD: 74,
  COMMAND_INT: 75,
  COMMAND_LONG: 76,
  COMMAND_ACK: 77,
  MANUAL_SETPOINT: 81,
  SET_ATTITUDE_TARGET: 82,
  ATTITUDE_TARGET: 83,
  SET_POSITION_TARGET_LOCAL_NED: 84,
  POSITION_TARGET_LOCAL_NED: 85,
  SET_POSITION_TARGET_GLOBAL_INT: 86,
  POSITION_TARGET_GLOBAL_INT: 87,
  LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET: 89,
  HIL_STATE: 90,
  HIL_CONTROLS: 91,
  HIL_RC_INPUTS_RAW: 92,
  HIL_ACTUATOR_CONTROLS: 93,
  OPTICAL_FLOW: 100,
  GLOBAL_VISION_POSITION_ESTIMATE: 101,
  VISION_POSITION_ESTIMATE: 102,
  VISION_SPEED_ESTIMATE: 103,
  VICON_POSITION_ESTIMATE: 104,
  HIGHRES_IMU: 105,
  OPTICAL_FLOW_RAD: 106,
  HIL_SENSOR: 107,
  SIM_STATE: 108,
  RADIO_STATUS: 109,
  FILE_TRANSFER_PROTOCOL: 110,
  TIMESYNC: 111,
  CAMERA_TRIGGER: 112,
  HIL_GPS: 113,
  HIL_OPTICAL_FLOW: 114,
  HIL_STATE_QUATERNION: 115,
  SCALED_IMU2: 116,
  LOG_REQUEST_LIST: 117,
  LOG_ENTRY: 118,
  LOG_REQUEST_DATA: 119,
  LOG_DATA: 120,
  LOG_ERASE: 121,
  LOG_REQUEST_END: 122,
  GPS_INJECT_DATA: 123,
  GPS2_RAW: 124,
  POWER_STATUS: 125,
  SERIAL_CONTROL: 126,
  GPS_RTK: 127,
  GPS2_RTK: 128,
  SCALED_IMU3: 129,
  DATA_TRANSMISSION_HANDSHAKE: 130,
  ENCAPSULATED_DATA: 131,
  DISTANCE_SENSOR: 132,
  TERRAIN_REQUEST: 133,
  TERRAIN_DATA: 134,
  TERRAIN_CHECK: 135,
  TERRAIN_REPORT: 136,
  SCALED_PRESSURE2: 137,
  ATT_POS_MOCAP: 138,
  SET_ACTUATOR_CONTROL_TARGET: 139,
  ACTUATOR_CONTROL_TARGET: 140,
  ALTITUDE: 141,
  RESOURCE_REQUEST: 142,
  SCALED_PRESSURE3: 143,
  FOLLOW_TARGET: 144,
  CONTROL_SYSTEM_STATE: 146,
  BATTERY_STATUS: 147,
  AUTOPILOT_VERSION: 148,
  LANDING_TARGET: 149,
  ESTIMATOR_STATUS: 230,
  WIND_COV: 231,
  GPS_INPUT: 232,
  GPS_RTCM_DATA: 233,
  HIGH_LATENCY: 234,
  HIGH_LATENCY2: 235,
  VIBRATION: 241,
  HOME_POSITION: 242,
  SET_HOME_POSITION: 243,
  MESSAGE_INTERVAL: 244,
  EXTENDED_SYS_STATE: 245,
  ADSB_VEHICLE: 246,
  COLLISION: 247,
  V2_EXTENSION: 248,
  MEMORY_VECT: 249,
  DEBUG_VECT: 250,
  NAMED_VALUE_FLOAT: 251,
  NAMED_VALUE_INT: 252,
  STATUSTEXT: 253,
  DEBUG: 254,
  SETUP_SIGNING: 256,
  BUTTON_CHANGE: 257,
  PLAY_TUNE: 258,
  CAMERA_INFORMATION: 259,
  CAMERA_SETTINGS: 260,
  STORAGE_INFORMATION: 261,
  CAMERA_CAPTURE_STATUS: 262,
  CAMERA_IMAGE_CAPTURED: 263,
  FLIGHT_INFORMATION: 264,
  MOUNT_ORIENTATION: 265,
  LOGGING_DATA: 266,
  LOGGING_DATA_ACKED: 267,
  LOGGING_ACK: 268,
  VIDEO_STREAM_INFORMATION: 269,
  VIDEO_STREAM_STATUS: 270,
  WIFI_CONFIG_AP: 299,
  PROTOCOL_VERSION: 300,
  AIS_VESSEL: 301,
  UAVCAN_NODE_STATUS: 310,
  UAVCAN_NODE_INFO: 311,
  PARAM_EXT_REQUEST_READ: 320,
  PARAM_EXT_REQUEST_LIST: 321,
  PARAM_EXT_VALUE: 322,
  PARAM_EXT_SET: 323,
  PARAM_EXT_ACK: 324,
  OBSTACLE_DISTANCE: 330,
  ODOMETRY: 331,
  TRAJECTORY_REPRESENTATION_WAYPOINTS: 332,
  TRAJECTORY_REPRESENTATION_BEZIER: 333,
  CELLULAR_STATUS: 334,
  ISBD_LINK_STATUS: 335,
  CELLULAR_CONFIG: 336,
  RAW_RPM: 339,
  UTM_GLOBAL_POSITION: 340,
  DEBUG_FLOAT_ARRAY: 350,
  ORBIT_EXECUTION_STATUS: 360,
  SMART_BATTERY_INFO: 370,
  GENERATOR_STATUS: 373,
  ACTUATOR_OUTPUT_STATUS: 375,
  TIME_ESTIMATE_TO_TARGET: 380,
  TUNNEL: 385,
  ONBOARD_COMPUTER_STATUS: 390,
  COMPONENT_INFORMATION: 395,
  PLAY_TUNE_V2: 400,
  SUPPORTED_TUNES: 401,
  WHEEL_DISTANCE: 9000,
  WINCH_STATUS: 9005,
} as const

/**
 * CRC Extra values for message validation
 * These are pre-calculated for each message type
 */
export const CRC_EXTRA: Record<number, number> = {
  [MAV_MSG_ID.HEARTBEAT]: 50,
  [MAV_MSG_ID.SYS_STATUS]: 124,
  [MAV_MSG_ID.GLOBAL_POSITION_INT]: 104,
  [MAV_MSG_ID.COMMAND_LONG]: 152,
  [MAV_MSG_ID.COMMAND_ACK]: 143,
  [MAV_MSG_ID.MISSION_ITEM]: 254,
  [MAV_MSG_ID.STATUSTEXT]: 83,
  [MAV_MSG_ID.PARAM_VALUE]: 220,
  [MAV_MSG_ID.GPS_RAW_INT]: 24,
  [MAV_MSG_ID.ATTITUDE]: 39,
  [MAV_MSG_ID.LOCAL_POSITION_NED]: 185,
  [MAV_MSG_ID.VFR_HUD]: 20,
  [MAV_MSG_ID.BATTERY_STATUS]: 154,
  [MAV_MSG_ID.MISSION_COUNT]: 221,
  [MAV_MSG_ID.MISSION_ITEM_INT]: 38,
  [MAV_MSG_ID.MISSION_REQUEST]: 230,
  [MAV_MSG_ID.MISSION_CURRENT]: 28,
  [MAV_MSG_ID.MISSION_ACK]: 153,
}

/**
 * CRC-16/MCRF4XX (X.25) calculation
 */
export function crcCalculate(buffer: Uint8Array): number {
  let crc = 0xFFFF

  for (const byte of buffer) {
    let tmp = byte ^ (crc & 0xFF)
    tmp ^= (tmp << 4) & 0xFF
    crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF
  }

  return crc
}

/**
 * Accumulate CRC with extra byte
 */
export function crcAccumulate(byte: number, crc: number): number {
  let tmp = byte ^ (crc & 0xFF)
  tmp ^= (tmp << 4) & 0xFF
  return ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF
}

/**
 * Create a MAVLink v2 packet
 */
export function createMAVLinkPacket(
  msgId: number,
  payload: Uint8Array,
  sysId: number = 1,
  compId: number = 1,
  seq: number = 0
): MAVLinkPacket {
  const packet: MAVLinkPacket = {
    magic: MAVLINK_V2_MAGIC,
    len: payload.length,
    incompat_flags: 0,
    compat_flags: 0,
    seq: seq & 0xFF,
    sysid: sysId,
    compid: compId,
    msgid: msgId,
    payload,
    checksum: 0,
  }

  // Calculate checksum
  const header = new Uint8Array(10)
  header[0] = packet.magic
  header[1] = packet.len
  header[2] = packet.incompat_flags
  header[3] = packet.compat_flags
  header[4] = packet.seq
  header[5] = packet.sysid
  header[6] = packet.compid
  header[7] = msgId & 0xFF
  header[8] = (msgId >> 8) & 0xFF
  header[9] = (msgId >> 16) & 0xFF

  const checksumData = new Uint8Array(header.length + payload.length + 1)
  checksumData.set(header.slice(1)) // Skip magic byte
  checksumData.set(payload, header.length - 1)

  // Add CRC_EXTRA if available
  const crcExtra = CRC_EXTRA[msgId] ?? 0
  checksumData[checksumData.length - 1] = crcExtra

  packet.checksum = crcCalculate(checksumData)

  return packet
}

/**
 * Serialize MAVLink packet to buffer
 */
export function serializePacket(packet: MAVLinkPacket): Uint8Array {
  const buffer = new Uint8Array(10 + packet.len + 2) // header + payload + checksum

  buffer[0] = packet.magic
  buffer[1] = packet.len
  buffer[2] = packet.incompat_flags
  buffer[3] = packet.compat_flags
  buffer[4] = packet.seq
  buffer[5] = packet.sysid
  buffer[6] = packet.compid
  buffer[7] = packet.msgid & 0xFF
  buffer[8] = (packet.msgid >> 8) & 0xFF
  buffer[9] = (packet.msgid >> 16) & 0xFF

  buffer.set(packet.payload, 10)

  buffer[10 + packet.len] = packet.checksum & 0xFF
  buffer[10 + packet.len + 1] = (packet.checksum >> 8) & 0xFF

  return buffer
}

/**
 * Parse MAVLink packet from buffer
 */
export function parsePacket(buffer: Uint8Array): MAVLinkPacket | null {
  if (buffer.length < 12) return null // Minimum packet size

  if (buffer[0] !== MAVLINK_V2_MAGIC) return null

  const len = buffer[1]
  if (buffer.length < 12 + len) return null

  const packet: MAVLinkPacket = {
    magic: buffer[0],
    len,
    incompat_flags: buffer[2],
    compat_flags: buffer[3],
    seq: buffer[4],
    sysid: buffer[5],
    compid: buffer[6],
    msgid: buffer[7] | (buffer[8] << 8) | (buffer[9] << 16),
    payload: buffer.slice(10, 10 + len),
    checksum: buffer[10 + len] | (buffer[10 + len + 1] << 8),
  }

  return packet
}

/**
 * Helper: Pack uint8
 */
export function packUint8(value: number): Uint8Array {
  return new Uint8Array([value & 0xFF])
}

/**
 * Helper: Pack uint16 (little-endian)
 */
export function packUint16(value: number): Uint8Array {
  return new Uint8Array([value & 0xFF, (value >> 8) & 0xFF])
}

/**
 * Helper: Pack int16 (little-endian, signed)
 */
export function packInt16(value: number): Uint8Array {
  // Clamp to int16 range [-32768, 32767]
  const int16 = Math.max(-32768, Math.min(32767, Math.round(value)))
  // Convert to unsigned (two's complement for negative values)
  const unsigned = int16 < 0 ? 0x10000 + int16 : int16
  return new Uint8Array([unsigned & 0xFF, (unsigned >> 8) & 0xFF])
}

/**
 * Helper: Pack uint32 (little-endian)
 */
export function packUint32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xFF,
    (value >> 8) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 24) & 0xFF,
  ])
}

/**
 * Helper: Pack int32 (little-endian)
 */
export function packInt32(value: number): Uint8Array {
  return packUint32(value >>> 0)
}

/**
 * Helper: Pack float (little-endian)
 */
export function packFloat(value: number): Uint8Array {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setFloat32(0, value, true) // true = little-endian
  return new Uint8Array(buffer)
}

/**
 * Helper: Unpack uint8
 */
export function unpackUint8(buffer: Uint8Array, offset: number): number {
  return buffer[offset]
}

/**
 * Helper: Unpack uint16 (little-endian)
 */
export function unpackUint16(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8)
}

/**
 * Helper: Unpack int16 (little-endian, signed)
 */
export function unpackInt16(buffer: Uint8Array, offset: number): number {
  const unsigned = buffer[offset] | (buffer[offset + 1] << 8)
  // Convert from unsigned to signed (two's complement)
  return unsigned > 0x7FFF ? unsigned - 0x10000 : unsigned
}

/**
 * Helper: Unpack uint32 (little-endian)
 */
export function unpackUint32(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0
}

/**
 * Helper: Unpack int32 (little-endian)
 */
export function unpackInt32(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  )
}

/**
 * Helper: Unpack float (little-endian)
 */
export function unpackFloat(buffer: Uint8Array, offset: number): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4)
  return view.getFloat32(0, true) // true = little-endian
}

/**
 * MAVLink Protocol Type Definitions
 *
 * Based on MAVLink v2 protocol specification
 * Reference: https://mavlink.io/en/guide/mavlink_2.html
 */

/**
 * MAVLink v2 Packet Structure
 */
export interface MAVLinkPacket {
  /** Protocol magic marker (0xFD for MAVLink v2) */
  magic: number;
  /** Length of payload (0-255 bytes) */
  len: number;
  /** Incompatibility flags (must be understood) */
  incompat_flags: number;
  /** Compatibility flags (can be ignored) */
  compat_flags: number;
  /** Packet sequence number */
  seq: number;
  /** System ID (sender) */
  sysid: number;
  /** Component ID (sender) */
  compid: number;
  /** Message ID (24-bit in MAVLink v2) */
  msgid: number;
  /** Payload bytes */
  payload: Uint8Array;
  /** CRC-16/MCRF4XX checksum */
  checksum: number;
  /** Optional signature for tamper-proof links */
  signature?: Uint8Array;
}

/**
 * MAVLink Message (generic)
 */
export interface MAVLinkMessage {
  msgid: number;
  sysid: number;
  compid: number;
  payload: Record<string, any>;
}

/**
 * HEARTBEAT Message (#0)
 * Sent at 1Hz to indicate system presence
 */
export interface HeartbeatMessage {
  msgid: 0;
  type: number; // MAV_TYPE
  autopilot: number; // MAV_AUTOPILOT
  base_mode: number; // MAV_MODE_FLAG
  custom_mode: number;
  system_status: number; // MAV_STATE
  mavlink_version: number;
}

/**
 * SYS_STATUS Message (#1)
 * System status including battery, sensors
 */
export interface SysStatusMessage {
  msgid: 1;
  onboard_control_sensors_present: number;
  onboard_control_sensors_enabled: number;
  onboard_control_sensors_health: number;
  load: number;
  voltage_battery: number; // mV
  current_battery: number; // cA (centi-Amps)
  battery_remaining: number; // % (0-100)
  drop_rate_comm: number;
  errors_comm: number;
  errors_count1: number;
  errors_count2: number;
  errors_count3: number;
  errors_count4: number;
}

/**
 * GLOBAL_POSITION_INT Message (#33)
 * Fused global position (GPS + IMU)
 */
export interface GlobalPositionIntMessage {
  msgid: 33;
  time_boot_ms: number;
  lat: number; // Latitude in degrees * 1E7
  lon: number; // Longitude in degrees * 1E7
  alt: number; // Altitude (MSL) in mm
  relative_alt: number; // Altitude above ground in mm
  vx: number; // Ground X speed (cm/s)
  vy: number; // Ground Y speed (cm/s)
  vz: number; // Ground Z speed (cm/s)
  hdg: number; // Vehicle heading (cdeg)
}

/**
 * COMMAND_LONG Message (#76)
 * Send a command with up to 7 parameters
 */
export interface CommandLongMessage {
  msgid: 76;
  target_system: number;
  target_component: number;
  command: number; // MAV_CMD
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number; // x position or latitude
  param6: number; // y position or longitude
  param7: number; // z position or altitude
}

/**
 * COMMAND_ACK Message (#77)
 * Report status of a command
 */
export interface CommandAckMessage {
  msgid: 77;
  command: number; // MAV_CMD that was executed
  result: number; // MAV_RESULT
  progress: number; // 0-100% or 255 if not applicable
  result_param2: number;
  target_system: number;
  target_component: number;
}

/**
 * MISSION_ITEM_INT Message (#73)
 * Message encoding a mission item using integer coordinates
 */
export interface MissionItemIntMessage {
  msgid: 73;
  target_system: number;
  target_component: number;
  seq: number; // Waypoint sequence number
  frame: number; // MAV_FRAME
  command: number; // MAV_CMD
  current: number; // false:0, true:1
  autocontinue: number; // Autocontinue to next waypoint
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number; // Latitude/X position (int-scaled if global frame)
  y: number; // Longitude/Y position (int-scaled if global frame)
  z: number; // Altitude/Z position
  mission_type: number; // MAV_MISSION_TYPE
}

export interface MissionCountMessage {
  msgid: 44;
  count: number;
  target_system: number;
  target_component: number;
  mission_type: number;
}

export interface MissionRequestIntMessage {
  msgid: 51;
  seq: number;
  target_system: number;
  target_component: number;
  mission_type: number;
}

export interface MissionRequestMessage {
  msgid: 40;
  seq: number;
  target_system: number;
  target_component: number;
}

export interface MissionAckMessage {
  msgid: 47;
  target_system: number;
  target_component: number;
  type: number;
  mission_type: number;
}

export interface MissionCurrentMessage {
  msgid: 42;
  seq: number;
  mission_state: number;
  mission_mode: number;
  mission_id: number;
}

export interface MissionItemReachedMessage {
  msgid: 46;
  seq: number;
}

/**
 * MAV_TYPE enum
 */
export const MAV_TYPE = {
  GENERIC: 0,
  FIXED_WING: 1,
  QUADROTOR: 2,
  COAXIAL: 3,
  HELICOPTER: 4,
  ANTENNA_TRACKER: 5,
  GCS: 6,
  AIRSHIP: 7,
  FREE_BALLOON: 8,
  ROCKET: 9,
  GROUND_ROVER: 10,
  SURFACE_BOAT: 11,
  SUBMARINE: 12,
  HEXAROTOR: 13,
  OCTOROTOR: 14,
  TRICOPTER: 15,
  FLAPPING_WING: 16,
  KITE: 17,
  ONBOARD_CONTROLLER: 18,
  VTOL_DUOROTOR: 19,
  VTOL_QUADROTOR: 20,
  VTOL_TILTROTOR: 21,
  VTOL_RESERVED2: 22,
  VTOL_RESERVED3: 23,
  VTOL_RESERVED4: 24,
  VTOL_RESERVED5: 25,
  GIMBAL: 26,
  ADSB: 27,
  PARAFOIL: 28,
  DODECAROTOR: 29,
} as const;

/**
 * MAV_AUTOPILOT enum
 */
export const MAV_AUTOPILOT = {
  GENERIC: 0,
  RESERVED: 1,
  SLUGS: 2,
  ARDUPILOTMEGA: 3,
  OPENPILOT: 4,
  GENERIC_WAYPOINTS_ONLY: 5,
  GENERIC_WAYPOINTS_AND_SIMPLE_NAVIGATION_ONLY: 6,
  GENERIC_MISSION_FULL: 7,
  INVALID: 8,
  PPZ: 9,
  UDB: 10,
  FP: 11,
  PX4: 12,
  SMACCMPILOT: 13,
  AUTOQUAD: 14,
  ARMAZILA: 15,
  AEROB: 16,
  ASLUAV: 17,
  SMARTAP: 18,
  AIRRAILS: 19,
} as const;

/**
 * MAV_STATE enum
 */
export const MAV_STATE = {
  UNINIT: 0,
  BOOT: 1,
  CALIBRATING: 2,
  STANDBY: 3,
  ACTIVE: 4,
  CRITICAL: 5,
  EMERGENCY: 6,
  POWEROFF: 7,
  FLIGHT_TERMINATION: 8,
} as const;

/**
 * MAV_MODE_FLAG enum (bitmask)
 */
export const MAV_MODE_FLAG = {
  SAFETY_ARMED: 128,
  MANUAL_INPUT_ENABLED: 64,
  HIL_ENABLED: 32,
  STABILIZE_ENABLED: 16,
  GUIDED_ENABLED: 8,
  AUTO_ENABLED: 4,
  TEST_ENABLED: 2,
  CUSTOM_MODE_ENABLED: 1,
} as const;

/**
 * MAV_RESULT enum
 */
export const MAV_RESULT = {
  ACCEPTED: 0,
  TEMPORARILY_REJECTED: 1,
  DENIED: 2,
  UNSUPPORTED: 3,
  FAILED: 4,
  IN_PROGRESS: 5,
  CANCELLED: 6,
} as const;

/**
 * MAV_FRAME enum
 */
export const MAV_FRAME = {
  GLOBAL: 0,
  LOCAL_NED: 1,
  MISSION: 2,
  GLOBAL_RELATIVE_ALT: 3,
  LOCAL_ENU: 4,
  GLOBAL_INT: 5,
  GLOBAL_RELATIVE_ALT_INT: 6,
  LOCAL_OFFSET_NED: 7,
  BODY_NED: 8,
  BODY_OFFSET_NED: 9,
  GLOBAL_TERRAIN_ALT: 10,
  GLOBAL_TERRAIN_ALT_INT: 11,
  BODY_FRD: 12,
  LOCAL_FRD: 20,
  LOCAL_FLU: 21,
} as const;

/**
 * MAVLink Command Constants (MAV_CMD)
 *
 * Command IDs used in COMMAND_LONG and MISSION_ITEM messages
 * Reference: https://mavlink.io/en/messages/common.html#mav_commands
 */

/**
 * MAV_CMD enum - Navigation Commands
 */
export const MAV_CMD = {
  // Navigation commands
  /** Navigate to waypoint */
  NAV_WAYPOINT: 16,
  /** Loiter around this waypoint */
  NAV_LOITER_UNLIM: 17,
  /** Loiter for N turns */
  NAV_LOITER_TURNS: 18,
  /** Loiter for N seconds */
  NAV_LOITER_TIME: 19,
  /** Return to launch location */
  NAV_RETURN_TO_LAUNCH: 20,
  /** Land at location */
  NAV_LAND: 21,
  /** Takeoff from ground / hand */
  NAV_TAKEOFF: 22,
  /** Land at local position (local frame only) */
  NAV_LAND_LOCAL: 23,
  /** Takeoff from local position (local frame only) */
  NAV_TAKEOFF_LOCAL: 24,
  /** Continue on the current course */
  NAV_CONTINUE_AND_CHANGE_ALT: 30,
  /** Begin loiter at location */
  NAV_LOITER_TO_ALT: 31,

  // DO commands (immediate actions)
  /** Set ROI (Region Of Interest) */
  DO_SET_ROI: 201,
  /** Control onboard camera system */
  DO_DIGICAM_CONTROL: 203,
  /** Control camera trigger */
  DO_SET_CAM_TRIGG_DIST: 206,
  /** Change to/from reverse mode */
  DO_SET_REVERSE: 194,
  /** Change speed and/or throttle set points */
  DO_CHANGE_SPEED: 178,
  /** Set operating mode */
  DO_SET_MODE: 176,
  /** Jump to specified command in mission list */
  DO_JUMP: 177,
  /** Mission complete (not a physical waypoint) */
  DO_SET_HOME: 179,
  /** Set servo or relay */
  DO_SET_RELAY: 181,
  DO_REPEAT_RELAY: 182,
  DO_SET_SERVO: 183,
  DO_REPEAT_SERVO: 184,
  /** Flight termination immediately */
  DO_FLIGHTTERMINATION: 185,
  /** Enables landing abort */
  DO_LAND_START: 189,
  /** Arms motors */
  COMPONENT_ARM_DISARM: 400,

  // Condition commands (wait for condition)
  /** Delay mission state machine */
  CONDITION_DELAY: 112,
  /** Delay until within desired distance */
  CONDITION_DISTANCE: 114,
  /** Delay until reach certain yaw angle */
  CONDITION_YAW: 115,
  /** Delay mission until altitude */
  CONDITION_LAST: 159,

  // Other commands
  /** Request autopilot version */
  REQUEST_AUTOPILOT_CAPABILITIES: 520,
  /** Starts receiver pairing */
  START_RX_PAIR: 500,
  /** Set system mode */
  DO_SET_SYSTEM_MODE: 176,
  /** Reposition vehicle to a specific position */
  DO_REPOSITION: 192,
  /** Start mission execution */
  MISSION_START: 300,
} as const;

export type MAV_CMD = (typeof MAV_CMD)[keyof typeof MAV_CMD];

/**
 * MAV_CMD Parameter Descriptions
 *
 * Maps command to parameter meanings for reference
 */
export const MAV_CMD_PARAMS = {
  [MAV_CMD.NAV_WAYPOINT]: {
    param1: "Hold time (s)",
    param2: "Acceptance radius (m)",
    param3: "Pass radius (m)",
    param4: "Yaw angle (deg)",
    param5: "Latitude",
    param6: "Longitude",
    param7: "Altitude",
  },

  [MAV_CMD.NAV_TAKEOFF]: {
    param1: "Pitch (deg)",
    param2: "Empty",
    param3: "Empty",
    param4: "Yaw angle (deg)",
    param5: "Latitude",
    param6: "Longitude",
    param7: "Altitude",
  },

  [MAV_CMD.NAV_LAND]: {
    param1: "Abort altitude (m)",
    param2: "Landing mode",
    param3: "Empty",
    param4: "Yaw angle (deg)",
    param5: "Latitude",
    param6: "Longitude",
    param7: "Altitude",
  },

  [MAV_CMD.NAV_LOITER_UNLIM]: {
    param1: "Empty",
    param2: "Empty",
    param3: "Radius (m)",
    param4: "Yaw angle (deg)",
    param5: "Latitude",
    param6: "Longitude",
    param7: "Altitude",
  },

  [MAV_CMD.DO_SET_MODE]: {
    param1: "Mode (MAV_MODE)",
    param2: "Custom mode",
    param3: "Custom sub mode",
    param4: "Empty",
    param5: "Empty",
    param6: "Empty",
    param7: "Empty",
  },

  [MAV_CMD.DO_CHANGE_SPEED]: {
    param1: "Speed type (0=Airspeed, 1=Ground)",
    param2: "Speed (m/s)",
    param3: "Throttle (%)",
    param4: "Absolute/Relative (0/1)",
    param5: "Empty",
    param6: "Empty",
    param7: "Empty",
  },

  [MAV_CMD.COMPONENT_ARM_DISARM]: {
    param1: "1 to arm, 0 to disarm",
    param2: "Force (21196 to force)",
    param3: "Empty",
    param4: "Empty",
    param5: "Empty",
    param6: "Empty",
    param7: "Empty",
  },

  [MAV_CMD.DO_FLIGHTTERMINATION]: {
    param1: "1 to terminate, 0 to restore",
    param2: "Empty",
    param3: "Empty",
    param4: "Empty",
    param5: "Empty",
    param6: "Empty",
    param7: "Empty",
  },

  [MAV_CMD.DO_SET_HOME]: {
    param1: "1=use current, 0=use specified",
    param2: "Empty",
    param3: "Empty",
    param4: "Yaw angle (deg)",
    param5: "Latitude",
    param6: "Longitude",
    param7: "Altitude",
  },
};

/**
 * Helper function to create COMMAND_LONG message
 */
export interface CommandLongParams {
  command: MAV_CMD;
  param1?: number;
  param2?: number;
  param3?: number;
  param4?: number;
  param5?: number;
  param6?: number;
  param7?: number;
  target_system?: number;
  target_component?: number;
  confirmation?: number;
}

/**
 * Create a COMMAND_LONG message with default parameters
 */
export function createCommandLong(params: CommandLongParams) {
  return {
    msgid: 76, // COMMAND_LONG
    target_system: params.target_system ?? 0,
    target_component: params.target_component ?? 0,
    command: params.command,
    confirmation: params.confirmation ?? 0,
    param1: params.param1 ?? 0,
    param2: params.param2 ?? 0,
    param3: params.param3 ?? 0,
    param4: params.param4 ?? 0,
    param5: params.param5 ?? 0,
    param6: params.param6 ?? 0,
    param7: params.param7 ?? 0,
  };
}

/**
 * Mission item frame constants
 */
export const MISSION_FRAME = {
  GLOBAL: 0,
  LOCAL_NED: 1,
  MISSION: 2,
  GLOBAL_RELATIVE_ALT: 3,
  LOCAL_ENU: 4,
  GLOBAL_INT: 5,
  GLOBAL_RELATIVE_ALT_INT: 6,
} as const;

/**
 * Helper function to create MISSION_ITEM_INT message
 */
export interface MissionItemIntParams {
  seq: number;
  command: MAV_CMD;
  x: number;
  y: number;
  z: number;
  frame?: number;
  param1?: number;
  param2?: number;
  param3?: number;
  param4?: number;
  current?: number;
  autocontinue?: number;
  target_system?: number;
  target_component?: number;
}

/**
 * Create a MISSION_ITEM_INT message with default parameters
 */
export function createMissionItemInt(params: MissionItemIntParams) {
  return {
    msgid: 73, // MISSION_ITEM_INT
    target_system: params.target_system ?? 0,
    target_component: params.target_component ?? 0,
    seq: params.seq,
    frame: params.frame ?? MISSION_FRAME.GLOBAL_RELATIVE_ALT,
    mission_type: 0, // MAV_MISSION_TYPE_MISSION
    current: params.current ?? 0,
    autocontinue: params.autocontinue ?? 1,
    command: params.command,
    param1: params.param1 ?? 0,
    param2: params.param2 ?? 0,
    param3: params.param3 ?? 0,
    param4: params.param4 ?? 0,
    x: params.x,
    y: params.y,
    z: params.z,
  };
}

/**
 * Drone control command constants.
 * User-facing Blockly exposes only scenario-oriented actions.
 * Legacy aliases remain for runtime compatibility with existing services.
 */

export const MessageType = {
  EXECUTE_SCRIPT: "execute_script",
  COMMAND_FINISH: "command_finish",
  ERROR: "error",
  TELEMETRY: "telemetry",
  ACK: "ack",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const CommandAction = {
  TAKEOFF_ALL: "takeoff_all",
  LAND_ALL: "land_all",
  MOVE_DIRECTION_ALL: "move_direction_all",

  TAKEOFF: "takeoff",
  LAND: "land",
  MOVE_DIRECTION: "move_direction",
  MOVE_DRONE: "move_drone",
  ROTATE: "rotate",
  HOVER: "hover",
  WAIT: "wait",
  SET_SPEED: "set_speed",

  SET_FORMATION: "set_formation",
  MOVE_FORMATION: "move_formation",
  SET_LED_COLOR: "set_led_color",

  // Legacy aliases (not exposed in Blockly toolbox)
  EMERGENCY: "emergency",
  RC_CONTROL: "rc_control",
  SYNC_ALL: "sync_all",
  WAIT_ALL: "wait_all",
  MOVE_XYZ: "move_drone",
  ROTATE_DRONE: "rotate",
  SET_COLOR: "set_led_color",
  MISSION_ADD_WAYPOINT: "mission_add_waypoint",
  MISSION_GOTO_WAYPOINT: "mission_goto_waypoint",
  MISSION_EXECUTE: "mission_execute",
  MISSION_CLEAR: "mission_clear",
  ADD_WAYPOINT: "mission_add_waypoint",
  GOTO_WAYPOINT: "mission_goto_waypoint",
  EXECUTE_MISSION: "mission_execute",
  CLEAR_WAYPOINTS: "mission_clear",
} as const;

export type CommandAction = (typeof CommandAction)[keyof typeof CommandAction];

export const FormationType = {
  GRID: "grid",
  LINE: "line",
  CIRCLE: "circle",
  V_SHAPE: "v_shape",
  TRIANGLE: "triangle",
  SQUARE: "square",
  DIAMOND: "diamond",
  ARROW: "arrow",
  STAR: "star",
} as const;

export type FormationType = (typeof FormationType)[keyof typeof FormationType];

export const Direction = {
  FORWARD: "forward",
  BACKWARD: "backward",
  LEFT: "left",
  RIGHT: "right",
  UP: "up",
  DOWN: "down",
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

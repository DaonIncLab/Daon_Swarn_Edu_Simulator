/**
 * 드론 군집 제어 명령어 상수
 */

// 메시지 타입
export const MessageType = {
  EXECUTE_SCRIPT: 'execute_script',
  COMMAND_FINISH: 'command_finish',
  ERROR: 'error',
  TELEMETRY: 'telemetry',
  ACK: 'ack',
} as const

export type MessageType = typeof MessageType[keyof typeof MessageType]

// 군집 제어 명령어 타입
export const CommandAction = {
  // 기본 제어
  TAKEOFF_ALL: 'takeoff_all',
  LAND_ALL: 'land_all',

  // 대형 제어
  SET_FORMATION: 'set_formation',
  MOVE_FORMATION: 'move_formation',

  // 개별 드론 제어
  MOVE_DRONE: 'move_drone',
  ROTATE_DRONE: 'rotate_drone',

  // 고급 제어
  HOVER: 'hover',
  WAIT: 'wait',

  // 제어 흐름
  REPEAT: 'repeat',
  FOR_LOOP: 'for_loop',
  IF: 'if',
  IF_ELSE: 'if_else',

  // 동기화
  SYNC_ALL: 'sync_all',
  WAIT_ALL: 'wait_all',

  // 웨이포인트 미션
  ADD_WAYPOINT: 'add_waypoint',
  GOTO_WAYPOINT: 'goto_waypoint',
  EXECUTE_MISSION: 'execute_mission',
  CLEAR_WAYPOINTS: 'clear_waypoints',
} as const

export type CommandAction = typeof CommandAction[keyof typeof CommandAction]

// 대형 타입
export const FormationType = {
  GRID: 'grid',
  LINE: 'line',
  CIRCLE: 'circle',
  V_SHAPE: 'v_shape',
  TRIANGLE: 'triangle',
  SQUARE: 'square',
  DIAMOND: 'diamond',
} as const

export type FormationType = typeof FormationType[keyof typeof FormationType]

// 이동 방향
export const Direction = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
} as const

export type Direction = typeof Direction[keyof typeof Direction]

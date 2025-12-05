/**
 * MAVLink Drone Blockly Toolbox 설정
 * 교육용 드론 SDK 기반 블록 카테고리
 */

// 카테고리별 블록 정의
const categoryBlocks = {
  // 1. 기본 비행 제어
  flight: [
    { kind: 'block', type: 'drone_takeoff', fields: { DRONE_ID: 1, ALTITUDE: 2 } },
    { kind: 'block', type: 'drone_land', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'drone_takeoff_all', fields: { ALTITUDE: 2 } },
    { kind: 'block', type: 'drone_land_all' },
    { kind: 'block', type: 'drone_hover', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'drone_emergency', fields: { DRONE_ID: 1 } },
  ],

  // 2. 이동
  movement: [
    { kind: 'block', type: 'drone_move_direction_all', fields: { DIRECTION: 'forward', DISTANCE: 3 } },
    { kind: 'block', type: 'drone_move_direction', fields: { DRONE_ID: 1, DIRECTION: 'forward', DISTANCE: 1 } },
    { kind: 'block', type: 'drone_move_xyz', fields: { DRONE_ID: 1, X: 0, Y: 0, Z: 0, SPEED: 2 } },
    { kind: 'block', type: 'drone_rotate', fields: { DRONE_ID: 1, DIRECTION: 'CW', DEGREES: 90 } },
  ],

  // 3. RC 제어
  rc: [
    { kind: 'block', type: 'drone_rc_control', fields: { DRONE_ID: 1, ROLL: 0, PITCH: 0, YAW: 0, THROTTLE: 0 } },
  ],

  // 4. 센서/텔레메트리
  sensors: [
    { kind: 'block', type: 'sensor_battery', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_altitude', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_pitch', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_roll', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_yaw', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_flight_time', fields: { DRONE_ID: 1 } },
  ],

  // 5. 미션/웨이포인트
  mission: [
    { kind: 'block', type: 'mission_add_waypoint', fields: { X: 0, Y: 0, Z: 2, SPEED: 2, HOLD_TIME: 0 } },
    { kind: 'block', type: 'mission_goto_waypoint', fields: { WAYPOINT_INDEX: 1, SPEED: 2 } },
    { kind: 'block', type: 'mission_execute', fields: { LOOP: 'FALSE' } },
    { kind: 'block', type: 'mission_clear' },
  ],

  // 6. 설정
  settings: [
    { kind: 'block', type: 'drone_set_speed', fields: { DRONE_ID: 1, SPEED: 2 } },
  ],

  // 7. 동기화 & 대기
  sync: [
    { kind: 'block', type: 'control_wait', fields: { DURATION: 2 } },
  ],

  // 8. 제어 흐름
  control: [
    { kind: 'block', type: 'control_repeat', fields: { TIMES: 3 } },
    { kind: 'block', type: 'control_for', fields: { FROM: 1, TO: 10, BY: 1 } },
    { kind: 'block', type: 'control_while' },
    { kind: 'block', type: 'control_if' },
    { kind: 'block', type: 'control_if_else' },
  ],

  // 9. 변수 & 수식
  variables: [
    { kind: 'block', type: 'var_set' },
    { kind: 'block', type: 'var_get' },
    { kind: 'block', type: 'math_arithmetic', fields: { OP: 'ADD' } },
    { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
  ],

  // 10. 논리
  logic: [
    { kind: 'block', type: 'logic_compare', fields: { OP: 'GT' } },
    { kind: 'block', type: 'logic_operation', fields: { OP: 'AND' } },
    { kind: 'block', type: 'logic_negate' },
    { kind: 'block', type: 'logic_boolean', fields: { BOOL: 'TRUE' } },
  ],
}

/**
 * 특정 카테고리의 블록 목록을 반환
 */
export function getCategoryBlocks(categoryId: string) {
  return categoryBlocks[categoryId as keyof typeof categoryBlocks] || []
}

/**
 * 전체 toolbox 설정
 */
export const toolboxConfig = {
  kind: 'flyoutToolbox',
  contents: []
}

/**
 * 카테고리 목록
 */
export const categories = [
  { id: 'flight', name: '🚁 비행 제어', colour: '230' },
  { id: 'movement', name: '➡️ 이동', colour: '160' },
  { id: 'rc', name: '🎮 RC 제어', colour: '290' },
  { id: 'sensors', name: '📊 센서', colour: '120' },
  { id: 'mission', name: '🗺️ 미션', colour: '60' },
  { id: 'settings', name: '⚙️ 설정', colour: '330' },
  { id: 'sync', name: '⏱️ 대기', colour: '120' },
  { id: 'control', name: '🔁 제어 흐름', colour: '210' },
  { id: 'variables', name: '📦 변수', colour: '330' },
  { id: 'logic', name: '🔍 논리', colour: '210' },
]

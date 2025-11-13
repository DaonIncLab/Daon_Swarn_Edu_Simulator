/**
 * Blockly Toolbox 설정
 * 사용 가능한 블록들을 카테고리별로 정의
 */

// 카테고리별 블록 정의
const categoryBlocks = {
  basic: [
    { kind: 'block', type: 'swarm_takeoff_all' },
    { kind: 'block', type: 'swarm_land_all' },
    { kind: 'block', type: 'swarm_hover' },
  ],
  formation: [
    {
      kind: 'block',
      type: 'swarm_set_formation',
      fields: { FORMATION_TYPE: 'grid', ROWS: 2, COLS: 5, SPACING: 2 }
    },
    {
      kind: 'block',
      type: 'swarm_move_formation',
      fields: { DIRECTION: 'forward', DISTANCE: 3 }
    },
  ],
  individual: [
    {
      kind: 'block',
      type: 'swarm_move_drone',
      fields: { DRONE_ID: 1, X: 0, Y: 0, Z: 0 }
    },
  ],
  control_flow: [
    { kind: 'block', type: 'controls_repeat', fields: { TIMES: 3 } },
    { kind: 'block', type: 'controls_for', fields: { FROM: 1, TO: 10, BY: 1 } },
    { kind: 'block', type: 'controls_while', fields: { CONDITION: 'battery > 20' } },
    { kind: 'block', type: 'controls_repeat_until', fields: { CONDITION: 'altitude > 10' } },
    { kind: 'block', type: 'controls_if_simple', fields: { CONDITION: 'all_connected' } },
    { kind: 'block', type: 'controls_if_else', fields: { CONDITION: 'all_connected' } },
  ],
  variables: [
    { kind: 'block', type: 'variables_set', fields: { VALUE: 0 } },
    { kind: 'block', type: 'variables_get' },
    { kind: 'block', type: 'math_arithmetic', fields: { A: 0, OP: 'ADD', B: 0 } },
  ],
  functions: [
    { kind: 'block', type: 'procedures_defnoreturn', fields: { NAME: 'my_function' } },
    { kind: 'block', type: 'procedures_callnoreturn', fields: { NAME: 'my_function' } },
  ],
  sensors: [
    { kind: 'block', type: 'sensor_battery', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_altitude', fields: { DRONE_ID: 1 } },
    { kind: 'block', type: 'sensor_elapsed_time' },
  ],
  logic: [
    { kind: 'block', type: 'logic_compare', fields: { OP: 'GT' } },
    { kind: 'block', type: 'logic_operation', fields: { OP: 'AND' } },
    { kind: 'block', type: 'logic_negate' },
  ],
  sync: [
    { kind: 'block', type: 'swarm_wait', fields: { DURATION: 2 } },
    { kind: 'block', type: 'swarm_wait_all', fields: { DURATION: 3 } },
    { kind: 'block', type: 'swarm_sync_all' },
  ],
}

/**
 * 특정 카테고리의 블록 목록을 반환
 */
export function getCategoryBlocks(categoryId: string) {
  return categoryBlocks[categoryId as keyof typeof categoryBlocks] || []
}

/**
 * 전체 toolbox 설정 (초기 설정용, 실제로는 사용하지 않음)
 */
export const toolboxConfig = {
  kind: 'flyoutToolbox',
  contents: []
}

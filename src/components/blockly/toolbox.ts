/**
 * Blockly Toolbox 설정
 * 사용 가능한 블록들을 카테고리별로 정의
 */

export const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '기본 제어',
      colour: '230',
      contents: [
        {
          kind: 'block',
          type: 'swarm_takeoff_all',
        },
        {
          kind: 'block',
          type: 'swarm_land_all',
        },
        {
          kind: 'block',
          type: 'swarm_hover',
        },
      ]
    },
    {
      kind: 'category',
      name: '대형 제어',
      colour: '160',
      contents: [
        {
          kind: 'block',
          type: 'swarm_set_formation',
          fields: {
            FORMATION_TYPE: 'grid',
            ROWS: 2,
            COLS: 5,
            SPACING: 2
          }
        },
        {
          kind: 'block',
          type: 'swarm_move_formation',
          fields: {
            DIRECTION: 'forward',
            DISTANCE: 3
          }
        },
      ]
    },
    {
      kind: 'category',
      name: '개별 제어',
      colour: '290',
      contents: [
        {
          kind: 'block',
          type: 'swarm_move_drone',
          fields: {
            DRONE_ID: 1,
            X: 0,
            Y: 0,
            Z: 0
          }
        },
      ]
    },
    {
      kind: 'category',
      name: '제어 흐름',
      colour: '210',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat',
          fields: {
            TIMES: 3
          }
        },
        {
          kind: 'block',
          type: 'controls_for',
          fields: {
            FROM: 1,
            TO: 10,
            BY: 1
          }
        },
        {
          kind: 'block',
          type: 'controls_if_simple',
          fields: {
            CONDITION: 'all_connected'
          }
        },
        {
          kind: 'block',
          type: 'controls_if_else',
          fields: {
            CONDITION: 'all_connected'
          }
        },
      ]
    },
    {
      kind: 'category',
      name: '변수 & 수식',
      colour: '330',
      contents: [
        {
          kind: 'block',
          type: 'variables_set',
          fields: {
            VALUE: 0
          }
        },
        {
          kind: 'block',
          type: 'math_arithmetic',
          fields: {
            A: 0,
            OP: 'ADD',
            B: 0
          }
        },
      ]
    },
    {
      kind: 'category',
      name: '동기화',
      colour: '120',
      contents: [
        {
          kind: 'block',
          type: 'swarm_wait',
          fields: {
            DURATION: 2
          }
        },
        {
          kind: 'block',
          type: 'swarm_wait_all',
          fields: {
            DURATION: 3
          }
        },
        {
          kind: 'block',
          type: 'swarm_sync_all',
        },
      ]
    },
  ]
}

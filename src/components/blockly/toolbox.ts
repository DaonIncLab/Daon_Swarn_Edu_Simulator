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
      name: '유틸리티',
      colour: '120',
      contents: [
        {
          kind: 'block',
          type: 'swarm_wait',
          fields: {
            DURATION: 2
          }
        },
      ]
    },
  ]
}

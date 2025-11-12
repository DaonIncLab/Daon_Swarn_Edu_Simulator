/**
 * 드론 군집 제어용 커스텀 Blockly 블록 정의
 */

import * as Blockly from 'blockly'
import { CommandAction, FormationType, Direction } from '@/constants/commands'

/**
 * 모든 드론 이륙
 */
Blockly.Blocks['swarm_takeoff_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚁 모든 드론 이륙')
      .appendField('고도(m)')
      .appendField(new Blockly.FieldNumber(2, 0, 10, 0.5), 'ALTITUDE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('모든 드론을 지정된 고도로 이륙시킵니다')
    this.setHelpUrl('')
  }
}

/**
 * 모든 드론 착륙
 */
Blockly.Blocks['swarm_land_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🛬 모든 드론 착륙')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('모든 드론을 착륙시킵니다')
    this.setHelpUrl('')
  }
}

/**
 * 대형 설정
 */
Blockly.Blocks['swarm_set_formation'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📐 대형 설정')
      .appendField(new Blockly.FieldDropdown([
        ['그리드 (Grid)', FormationType.GRID],
        ['일렬 (Line)', FormationType.LINE],
        ['원형 (Circle)', FormationType.CIRCLE],
        ['V자 (V-Shape)', FormationType.V_SHAPE]
      ]), 'FORMATION_TYPE')
    this.appendDummyInput()
      .appendField('행(rows)')
      .appendField(new Blockly.FieldNumber(2, 1, 10, 1), 'ROWS')
      .appendField('열(cols)')
      .appendField(new Blockly.FieldNumber(5, 1, 10, 1), 'COLS')
    this.appendDummyInput()
      .appendField('간격(m)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'SPACING')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('드론들을 지정된 대형으로 배치합니다')
    this.setHelpUrl('')
  }
}

/**
 * 대형 이동
 */
Blockly.Blocks['swarm_move_formation'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('➡️ 대형 이동')
      .appendField(new Blockly.FieldDropdown([
        ['앞으로 (Forward)', Direction.FORWARD],
        ['뒤로 (Backward)', Direction.BACKWARD],
        ['왼쪽 (Left)', Direction.LEFT],
        ['오른쪽 (Right)', Direction.RIGHT],
        ['위로 (Up)', Direction.UP],
        ['아래로 (Down)', Direction.DOWN]
      ]), 'DIRECTION')
    this.appendDummyInput()
      .appendField('거리(m)')
      .appendField(new Blockly.FieldNumber(3, 0.5, 20, 0.5), 'DISTANCE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('대형을 유지하면서 지정된 방향으로 이동합니다')
    this.setHelpUrl('')
  }
}

/**
 * 개별 드론 이동
 */
Blockly.Blocks['swarm_move_drone'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 10, 1), 'DRONE_ID')
      .appendField('번 이동')
    this.appendDummyInput()
      .appendField('X:')
      .appendField(new Blockly.FieldNumber(0, -10, 10, 0.5), 'X')
      .appendField('Y:')
      .appendField(new Blockly.FieldNumber(0, -10, 10, 0.5), 'Y')
      .appendField('Z:')
      .appendField(new Blockly.FieldNumber(0, -10, 10, 0.5), 'Z')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(290)
    this.setTooltip('특정 드론을 지정된 좌표로 이동시킵니다')
    this.setHelpUrl('')
  }
}

/**
 * 대기 (Wait)
 */
Blockly.Blocks['swarm_wait'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⏱️ 대기')
      .appendField(new Blockly.FieldNumber(2, 0.1, 60, 0.5), 'DURATION')
      .appendField('초')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('지정된 시간 동안 대기합니다')
    this.setHelpUrl('')
  }
}

/**
 * 호버링 (Hover)
 */
Blockly.Blocks['swarm_hover'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔄 호버링')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('모든 드론이 현재 위치에서 호버링합니다')
    this.setHelpUrl('')
  }
}

/**
 * 모든 커스텀 블록 등록
 */
export function registerSwarmBlocks() {
  // 블록은 이미 위에서 정의되었으므로 추가 등록 불필요
  console.log('Swarm blocks registered')
}

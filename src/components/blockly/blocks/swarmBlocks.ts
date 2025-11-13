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
        ['V자 (V-Shape)', FormationType.V_SHAPE],
        ['삼각형 (Triangle)', FormationType.TRIANGLE],
        ['사각형 (Square)', FormationType.SQUARE],
        ['다이아몬드 (Diamond)', FormationType.DIAMOND]
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
 * 반복 (Repeat N times)
 */
Blockly.Blocks['controls_repeat'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔁 반복')
      .appendField(new Blockly.FieldNumber(3, 1, 100, 1), 'TIMES')
      .appendField('번')
    this.appendStatementInput('DO')
      .appendField('실행')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(210)
    this.setTooltip('블록들을 지정된 횟수만큼 반복합니다')
    this.setHelpUrl('')
  }
}

/**
 * For 반복문
 */
Blockly.Blocks['controls_for'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔢 For')
      .appendField(new Blockly.FieldVariable('i'), 'VAR')
      .appendField('=')
      .appendField(new Blockly.FieldNumber(1, -100, 100, 1), 'FROM')
      .appendField('부터')
    this.appendDummyInput()
      .appendField(new Blockly.FieldNumber(10, -100, 100, 1), 'TO')
      .appendField('까지')
      .appendField(new Blockly.FieldNumber(1, 1, 10, 1), 'BY')
      .appendField('씩 증가')
    this.appendStatementInput('DO')
      .appendField('실행')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(210)
    this.setTooltip('변수를 사용한 반복문입니다')
    this.setHelpUrl('')
  }
}

/**
 * If 조건문
 */
Blockly.Blocks['controls_if_simple'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('❓ 만약')
      .appendField(new Blockly.FieldDropdown([
        ['모든 드론 연결됨', 'all_connected'],
        ['배터리 부족', 'low_battery'],
        ['고도 달성', 'altitude_reached'],
        ['대형 완료', 'formation_complete']
      ]), 'CONDITION')
    this.appendStatementInput('DO')
      .appendField('이면 실행')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(210)
    this.setTooltip('조건이 참일 때 블록들을 실행합니다')
    this.setHelpUrl('')
  }
}

/**
 * If-Else 조건문
 */
Blockly.Blocks['controls_if_else'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('❓ 만약')
      .appendField(new Blockly.FieldDropdown([
        ['모든 드론 연결됨', 'all_connected'],
        ['배터리 부족', 'low_battery'],
        ['고도 달성', 'altitude_reached'],
        ['대형 완료', 'formation_complete']
      ]), 'CONDITION')
    this.appendStatementInput('DO_IF')
      .appendField('이면 실행')
    this.appendStatementInput('DO_ELSE')
      .appendField('아니면 실행')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(210)
    this.setTooltip('조건에 따라 다른 블록들을 실행합니다')
    this.setHelpUrl('')
  }
}

/**
 * 모든 드론 동기화
 */
Blockly.Blocks['swarm_sync_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⏸️ 모든 드론 동기화')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('모든 드론이 현재 명령을 완료할 때까지 대기합니다')
    this.setHelpUrl('')
  }
}

/**
 * 모든 드론 대기
 */
Blockly.Blocks['swarm_wait_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⏳ 모든 드론 대기')
      .appendField(new Blockly.FieldNumber(3, 0.1, 60, 0.5), 'DURATION')
      .appendField('초')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('모든 드론이 지정된 시간 동안 대기합니다')
    this.setHelpUrl('')
  }
}

/**
 * 변수 설정
 */
Blockly.Blocks['variables_set'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📦 변수')
      .appendField(new Blockly.FieldVariable('altitude'), 'VAR')
      .appendField('=')
      .appendField(new Blockly.FieldNumber(0, -100, 100, 0.5), 'VALUE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(330)
    this.setTooltip('변수에 값을 저장합니다')
    this.setHelpUrl('')
  }
}

/**
 * 수식 계산
 */
Blockly.Blocks['math_arithmetic'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🧮')
      .appendField(new Blockly.FieldNumber(0), 'A')
      .appendField(new Blockly.FieldDropdown([
        ['+', 'ADD'],
        ['-', 'MINUS'],
        ['×', 'MULTIPLY'],
        ['÷', 'DIVIDE']
      ]), 'OP')
      .appendField(new Blockly.FieldNumber(0), 'B')
    this.setOutput(true, 'Number')
    this.setColour(230)
    this.setTooltip('수식 계산')
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

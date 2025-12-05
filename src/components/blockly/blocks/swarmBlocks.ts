/**
 * MAVLink 드론 제어용 커스텀 Blockly 블록 정의
 * 교육용 드론 SDK (Tello, Mambo, Fylo)의 MAVLink 구현 가능 기능
 */

import * as Blockly from 'blockly'
import { log } from '@/utils/logger'

// =============================================================================
// 1. Flight Control (비행 제어)
// =============================================================================

/**
 * 드론 이륙
 */
Blockly.Blocks['drone_takeoff'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚁 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('이륙')
    this.appendDummyInput()
      .appendField('고도(m)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'ALTITUDE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('드론을 지정된 고도로 이륙시킵니다\nMAVLink: MAV_CMD_NAV_TAKEOFF')
    this.setHelpUrl('')
  }
}

/**
 * 드론 착륙
 */
Blockly.Blocks['drone_land'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🛬 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('착륙')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('드론을 착륙시킵니다\nMAVLink: MAV_CMD_NAV_LAND')
    this.setHelpUrl('')
  }
}

/**
 * 모든 드론 이륙
 */
Blockly.Blocks['drone_takeoff_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚁 모든 드론 이륙')
    this.appendDummyInput()
      .appendField('고도(m)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'ALTITUDE')
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
Blockly.Blocks['drone_land_all'] = {
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
 * 호버링
 */
Blockly.Blocks['drone_hover'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔄 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('호버링')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(230)
    this.setTooltip('드론이 현재 위치에서 호버링합니다\nMAVLink: Position Hold Mode')
    this.setHelpUrl('')
  }
}

/**
 * 긴급 정지
 */
Blockly.Blocks['drone_emergency'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚨 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('긴급 정지')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(0)
    this.setTooltip('드론을 긴급 정지시킵니다 (모든 모터 즉시 정지)\nMAVLink: MAV_CMD_DO_FLIGHTTERMINATION')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 2. Movement (이동)
// =============================================================================

/**
 * 방향 이동 (개별)
 */
Blockly.Blocks['drone_move_direction'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('➡️ 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['위로 ⬆️', 'up'],
        ['아래로 ⬇️', 'down'],
        ['왼쪽 ⬅️', 'left'],
        ['오른쪽 ➡️', 'right'],
        ['앞으로 ⬆️', 'forward'],
        ['뒤로 ⬇️', 'backward']
      ]), 'DIRECTION')
      .appendField('이동')
    this.appendDummyInput()
      .appendField('거리(m)')
      .appendField(new Blockly.FieldNumber(1, 0.2, 20, 0.1), 'DISTANCE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('드론을 현재 위치에서 지정된 방향으로 상대 이동시킵니다\nMAVLink: SET_POSITION_TARGET_LOCAL_NED')
    this.setHelpUrl('')
  }
}

/**
 * 모든 드론 방향 이동
 */
Blockly.Blocks['drone_move_direction_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('➡️ 모든 드론')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['위로 ⬆️', 'up'],
        ['아래로 ⬇️', 'down'],
        ['왼쪽 ⬅️', 'left'],
        ['오른쪽 ➡️', 'right'],
        ['앞으로 ⬆️', 'forward'],
        ['뒤로 ⬇️', 'backward']
      ]), 'DIRECTION')
      .appendField('이동')
    this.appendDummyInput()
      .appendField('거리(m)')
      .appendField(new Blockly.FieldNumber(1, 0.2, 20, 0.1), 'DISTANCE')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('모든 드론을 현재 위치에서 지정된 방향으로 상대 이동시킵니다\nMAVLink: SET_POSITION_TARGET_LOCAL_NED')
    this.setHelpUrl('')
  }
}

/**
 * XYZ 좌표 이동
 */
Blockly.Blocks['drone_move_xyz'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('이동')
    this.appendDummyInput()
      .appendField('X:')
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.1), 'X')
      .appendField('Y:')
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.1), 'Y')
      .appendField('Z:')
      .appendField(new Blockly.FieldNumber(0, -20, 20, 0.1), 'Z')
    this.appendDummyInput()
      .appendField('속도(m/s)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'SPEED')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('드론을 현재 위치에서 XYZ 방향으로 상대 이동시킵니다 (현재 위치 기준)\nMAVLink: SET_POSITION_TARGET_LOCAL_NED')
    this.setHelpUrl('')
  }
}

/**
 * 회전
 */
Blockly.Blocks['drone_rotate'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔄 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('회전')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['시계방향 ↻', 'CW'],
        ['반시계방향 ↺', 'CCW']
      ]), 'DIRECTION')
    this.appendDummyInput()
      .appendField('각도(°)')
      .appendField(new Blockly.FieldNumber(90, 1, 360, 1), 'DEGREES')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(160)
    this.setTooltip('드론을 제자리에서 회전시킵니다\nMAVLink: MAV_CMD_CONDITION_YAW')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 3. RC Control (수동 제어)
// =============================================================================

/**
 * RC 제어
 */
Blockly.Blocks['drone_rc_control'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎮 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('RC 제어')
    this.appendDummyInput()
      .appendField('Roll')
      .appendField(new Blockly.FieldNumber(0, -100, 100, 1), 'ROLL')
      .appendField('%')
    this.appendDummyInput()
      .appendField('Pitch')
      .appendField(new Blockly.FieldNumber(0, -100, 100, 1), 'PITCH')
      .appendField('%')
    this.appendDummyInput()
      .appendField('Yaw')
      .appendField(new Blockly.FieldNumber(0, -100, 100, 1), 'YAW')
      .appendField('%')
    this.appendDummyInput()
      .appendField('Throttle')
      .appendField(new Blockly.FieldNumber(0, -100, 100, 1), 'THROTTLE')
      .appendField('%')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(290)
    this.setTooltip('드론을 RC 값으로 수동 제어합니다\nMAVLink: RC_CHANNELS_OVERRIDE / MANUAL_CONTROL')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 4. Telemetry (센서/텔레메트리)
// =============================================================================

/**
 * 센서: 배터리
 */
Blockly.Blocks['sensor_battery'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🔋 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('배터리 (%)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 배터리 잔량을 가져옵니다\nMAVLink: SYS_STATUS.battery_remaining')
    this.setHelpUrl('')
  }
}

/**
 * 센서: 고도
 */
Blockly.Blocks['sensor_altitude'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📏 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('고도 (m)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 현재 고도를 가져옵니다\nMAVLink: GLOBAL_POSITION_INT.relative_alt')
    this.setHelpUrl('')
  }
}

/**
 * 센서: Pitch
 */
Blockly.Blocks['sensor_pitch'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📐 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('Pitch (°)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 Pitch 각도를 가져옵니다\nMAVLink: ATTITUDE.pitch')
    this.setHelpUrl('')
  }
}

/**
 * 센서: Roll
 */
Blockly.Blocks['sensor_roll'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📐 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('Roll (°)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 Roll 각도를 가져옵니다\nMAVLink: ATTITUDE.roll')
    this.setHelpUrl('')
  }
}

/**
 * 센서: Yaw
 */
Blockly.Blocks['sensor_yaw'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📐 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('Yaw (°)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 Yaw 각도를 가져옵니다\nMAVLink: ATTITUDE.yaw')
    this.setHelpUrl('')
  }
}

/**
 * 센서: 비행 시간
 */
Blockly.Blocks['sensor_flight_time'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⏱️ 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('비행 시간 (초)')
    this.setOutput(true, 'Number')
    this.setColour(120)
    this.setTooltip('드론의 비행 시간을 가져옵니다\nMAVLink: System uptime')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 5. Mission (미션/웨이포인트)
// =============================================================================

/**
 * 웨이포인트 추가
 */
Blockly.Blocks['mission_add_waypoint'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📍 웨이포인트 추가')
    this.appendDummyInput()
      .appendField('X:')
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.5), 'X')
      .appendField('Y:')
      .appendField(new Blockly.FieldNumber(0, -50, 50, 0.5), 'Y')
      .appendField('Z:')
      .appendField(new Blockly.FieldNumber(2, 0, 20, 0.5), 'Z')
    this.appendDummyInput()
      .appendField('속도(m/s)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'SPEED')
      .appendField('대기(초)')
      .appendField(new Blockly.FieldNumber(0, 0, 60, 1), 'HOLD_TIME')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(60)
    this.setTooltip('미션에 웨이포인트를 추가합니다\nMAVLink: MISSION_ITEM_INT')
    this.setHelpUrl('')
  }
}

/**
 * 웨이포인트로 이동
 */
Blockly.Blocks['mission_goto_waypoint'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 웨이포인트')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'WAYPOINT_INDEX')
      .appendField('번으로 이동')
    this.appendDummyInput()
      .appendField('속도(m/s)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'SPEED')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(60)
    this.setTooltip('지정된 웨이포인트로 이동합니다')
    this.setHelpUrl('')
  }
}

/**
 * 미션 실행
 */
Blockly.Blocks['mission_execute'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚀 미션 실행')
    this.appendDummyInput()
      .appendField('반복')
      .appendField(new Blockly.FieldCheckbox('FALSE'), 'LOOP')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(60)
    this.setTooltip('등록된 모든 웨이포인트를 순서대로 비행합니다\nMAVLink: Mission Protocol')
    this.setHelpUrl('')
  }
}

/**
 * 미션 초기화
 */
Blockly.Blocks['mission_clear'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🗑️ 미션 초기화')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(60)
    this.setTooltip('모든 웨이포인트를 삭제합니다')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 6. Settings (설정)
// =============================================================================

/**
 * 속도 설정
 */
Blockly.Blocks['drone_set_speed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⚙️ 드론')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'DRONE_ID')
      .appendField('속도 설정')
    this.appendDummyInput()
      .appendField('속도(m/s)')
      .appendField(new Blockly.FieldNumber(2, 0.5, 10, 0.5), 'SPEED')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(330)
    this.setTooltip('드론의 비행 속도를 설정합니다\nMAVLink: Parameter MPC_XY_VEL_MAX')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 7. Sync & Wait (동기화 & 대기)
// =============================================================================

/**
 * 대기
 */
Blockly.Blocks['control_wait'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('⏱️ 대기')
      .appendField(new Blockly.FieldNumber(2, 0.1, 60, 0.1), 'DURATION')
      .appendField('초')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(120)
    this.setTooltip('지정된 시간 동안 대기합니다')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 8. Control Flow (제어 흐름)
// =============================================================================

/**
 * 반복 N번
 */
Blockly.Blocks['control_repeat'] = {
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
Blockly.Blocks['control_for'] = {
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
      .appendField('씩')
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
 * While 반복문
 */
Blockly.Blocks['control_while'] = {
  init: function() {
    this.appendValueInput('CONDITION')
      .setCheck('Boolean')
      .appendField('🔄 While')
    this.appendStatementInput('DO')
      .appendField('조건이 참인 동안 반복')
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(210)
    this.setTooltip('조건이 참인 동안 블록들을 반복합니다')
    this.setHelpUrl('')
  }
}

/**
 * If 조건문
 */
Blockly.Blocks['control_if'] = {
  init: function() {
    this.appendValueInput('CONDITION')
      .setCheck('Boolean')
      .appendField('❓ 만약')
    this.appendStatementInput('DO_IF')
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
Blockly.Blocks['control_if_else'] = {
  init: function() {
    this.appendValueInput('CONDITION')
      .setCheck('Boolean')
      .appendField('❓ 만약')
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

// =============================================================================
// 9. Variables & Math (변수 & 수식)
// =============================================================================

/**
 * 변수 설정
 */
Blockly.Blocks['var_set'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📦 변수')
      .appendField(new Blockly.FieldVariable('altitude'), 'VAR')
      .appendField('=')
    this.appendValueInput('VALUE')
      .setCheck('Number')
    this.setInputsInline(true)
    this.setPreviousStatement(true, null)
    this.setNextStatement(true, null)
    this.setColour(330)
    this.setTooltip('변수에 값을 저장합니다')
    this.setHelpUrl('')
  }
}

/**
 * 변수 가져오기
 */
Blockly.Blocks['var_get'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('📦')
      .appendField(new Blockly.FieldVariable('altitude'), 'VAR')
    this.setOutput(true, 'Number')
    this.setColour(330)
    this.setTooltip('변수의 값을 가져옵니다')
    this.setHelpUrl('')
  }
}

/**
 * 수식 계산
 */
Blockly.Blocks['math_arithmetic'] = {
  init: function() {
    this.appendValueInput('A')
      .setCheck('Number')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['+', 'ADD'],
        ['-', 'MINUS'],
        ['×', 'MULTIPLY'],
        ['÷', 'DIVIDE']
      ]), 'OP')
    this.appendValueInput('B')
      .setCheck('Number')
    this.setInputsInline(true)
    this.setOutput(true, 'Number')
    this.setColour(230)
    this.setTooltip('수식 계산')
    this.setHelpUrl('')
  }
}

/**
 * 숫자 상수
 */
Blockly.Blocks['math_number'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldNumber(0), 'NUM')
    this.setOutput(true, 'Number')
    this.setColour(230)
    this.setTooltip('숫자 값')
    this.setHelpUrl('')
  }
}

// =============================================================================
// 10. Logic (논리)
// =============================================================================

/**
 * 비교
 */
Blockly.Blocks['logic_compare'] = {
  init: function() {
    this.appendValueInput('A')
      .setCheck('Number')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['=', 'EQ'],
        ['≠', 'NEQ'],
        ['<', 'LT'],
        ['≤', 'LTE'],
        ['>', 'GT'],
        ['≥', 'GTE']
      ]), 'OP')
    this.appendValueInput('B')
      .setCheck('Number')
    this.setInputsInline(true)
    this.setOutput(true, 'Boolean')
    this.setColour(210)
    this.setTooltip('두 값을 비교합니다')
    this.setHelpUrl('')
  }
}

/**
 * 논리 연산
 */
Blockly.Blocks['logic_operation'] = {
  init: function() {
    this.appendValueInput('A')
      .setCheck('Boolean')
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['AND', 'AND'],
        ['OR', 'OR']
      ]), 'OP')
    this.appendValueInput('B')
      .setCheck('Boolean')
    this.setInputsInline(true)
    this.setOutput(true, 'Boolean')
    this.setColour(210)
    this.setTooltip('논리 연산을 수행합니다')
    this.setHelpUrl('')
  }
}

/**
 * 부정
 */
Blockly.Blocks['logic_negate'] = {
  init: function() {
    this.appendValueInput('BOOL')
      .setCheck('Boolean')
      .appendField('NOT')
    this.setOutput(true, 'Boolean')
    this.setColour(210)
    this.setTooltip('논리 값을 반전합니다')
    this.setHelpUrl('')
  }
}

/**
 * Boolean 상수
 */
Blockly.Blocks['logic_boolean'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['참', 'TRUE'],
        ['거짓', 'FALSE']
      ]), 'BOOL')
    this.setOutput(true, 'Boolean')
    this.setColour(210)
    this.setTooltip('참 또는 거짓 값')
    this.setHelpUrl('')
  }
}

/**
 * 모든 커스텀 블록 등록
 */
export function registerDroneBlocks() {
  log.info("Drone MAVLink blocks registered", { context: "droneBlocks" })
}

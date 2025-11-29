/**
 * Blockly 워크스페이스를 실행 가능한 노드 트리로 파싱
 */

import * as Blockly from 'blockly'
import type { Command } from '@/types/websocket'
import { CommandAction, FormationType, Direction } from '@/constants/commands'
import { log } from '@/utils/logger'
import type {
  ExecutableNode,
  CommandNode,
  SequenceNode,
  RepeatNode,
  ForLoopNode,
  WhileLoopNode,
  UntilLoopNode,
  IfNode,
  IfElseNode,
  WaitNode,
  VariableSetNode,
  VariableGetNode,
  FunctionDefNode,
  FunctionCallNode,
  NodeType,
} from '@/types/execution'

let nodeIdCounter = 0

/**
 * 고유 노드 ID 생성
 */
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`
}

/**
 * Blockly 워크스페이스를 실행 트리로 파싱
 */
export function parseBlocklyWorkspace(workspace: Blockly.Workspace): ExecutableNode | null {
  nodeIdCounter = 0 // 카운터 리셋

  const topBlocks = workspace.getTopBlocks(true)

  if (topBlocks.length === 0) {
    return null
  }

  // 모든 최상위 블록들을 시퀀스로 묶음
  const children: ExecutableNode[] = []
  const functionDefs: ExecutableNode[] = []

  for (const block of topBlocks) {
    // 함수 정의 블록은 별도로 수집 (실행 순서와 무관하게 먼저 등록)
    if (block.type === 'procedures_defnoreturn') {
      const funcDef = parseFunctionDefBlock(block)
      if (funcDef) {
        functionDefs.push(funcDef)
      }
    } else {
      const parsed = parseBlock(block)
      if (parsed) {
        children.push(parsed)
      }
    }
  }

  // 함수 정의가 있으면 먼저 추가
  const allNodes = [...functionDefs, ...children]

  if (allNodes.length === 0) {
    return null
  }

  if (allNodes.length === 1) {
    return allNodes[0]
  }

  // 여러 최상위 블록이 있으면 시퀀스로 묶음
  return {
    id: generateNodeId(),
    type: 'sequence',
    children: allNodes,
  }
}

/**
 * 개별 블록을 노드로 파싱 (재귀적)
 */
function parseBlock(block: Blockly.Block): ExecutableNode | null {
  if (!block) {
    return null
  }

  // 블록 체인을 시퀀스로 변환
  const sequence: ExecutableNode[] = []
  let currentBlock: Blockly.Block | null = block

  while (currentBlock) {
    const node = parseSingleBlock(currentBlock)
    if (node) {
      sequence.push(node)
    }
    currentBlock = currentBlock.getNextBlock()
  }

  if (sequence.length === 0) {
    return null
  }

  if (sequence.length === 1) {
    return sequence[0]
  }

  return {
    id: generateNodeId(),
    type: 'sequence',
    children: sequence,
  }
}

/**
 * 단일 블록을 노드로 변환
 */
function parseSingleBlock(block: Blockly.Block): ExecutableNode | null {
  const type = block.type

  // 제어 흐름 블록 (기존 이름)
  if (type === 'controls_repeat' || type === 'control_repeat') {
    return parseRepeatBlock(block)
  }

  if (type === 'controls_for' || type === 'control_for') {
    return parseForLoopBlock(block)
  }

  if (type === 'controls_while' || type === 'control_while') {
    return parseWhileLoopBlock(block)
  }

  if (type === 'controls_repeat_until') {
    return parseUntilLoopBlock(block)
  }

  if (type === 'controls_if_simple' || type === 'control_if') {
    return parseIfBlock(block)
  }

  if (type === 'controls_if_else' || type === 'control_if_else') {
    return parseIfElseBlock(block)
  }

  // 변수 블록 (기존 이름 + 새 이름)
  if (type === 'variables_set' || type === 'var_set') {
    return parseVariableSetBlock(block)
  }

  if (type === 'variables_get' || type === 'var_get') {
    return parseVariableGetBlock(block)
  }

  // 함수 블록
  if (type === 'procedures_defnoreturn') {
    return parseFunctionDefBlock(block)
  }

  if (type === 'procedures_callnoreturn') {
    return parseFunctionCallBlock(block)
  }

  // 대기 블록
  if (type === 'swarm_wait' || type === 'swarm_wait_all' || type === 'control_wait') {
    return parseWaitBlock(block)
  }

  // 드론 명령 블록 (swarm_ 또는 drone_로 시작)
  if (type.startsWith('swarm_') || type.startsWith('drone_') || type.startsWith('mission_')) {
    return parseCommandBlock(block)
  }

  // 센서 블록과 논리 블록은 값 블록이므로 단독으로 파싱하지 않음
  if (type.startsWith('sensor_') || type.startsWith('logic_')) {
    log.warn('BlocklyParser', 'Value block cannot be used as statement:', type)
    return null
  }

  // 알 수 없는 블록 타입
  log.warn('BlocklyParser', 'Unknown block type:', type)
  return null
}

/**
 * 반복 블록 파싱
 */
function parseRepeatBlock(block: Blockly.Block): RepeatNode | null {
  const times = block.getFieldValue('TIMES') as number

  // statement 입력 (반복문 내부 블록들)
  const statementInput = block.getInput('DO')
  const statementConnection = statementInput?.connection
  const statementBlock = statementConnection?.targetBlock()

  const body = statementBlock ? parseBlock(statementBlock) : null

  if (!body) {
    log.warn('BlocklyParser', 'Repeat block has no body')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'repeat',
    times,
    body,
  }
}

/**
 * For 루프 블록 파싱
 */
function parseForLoopBlock(block: Blockly.Block): ForLoopNode | null {
  const variable = block.getFieldValue('VAR') as string || 'i'
  const from = block.getFieldValue('FROM') as number
  const to = block.getFieldValue('TO') as number
  const by = block.getFieldValue('BY') as number || 1

  const statementInput = block.getInput('DO')
  const statementBlock = statementInput?.connection?.targetBlock()

  const body = statementBlock ? parseBlock(statementBlock) : null

  if (!body) {
    log.warn('BlocklyParser', 'For loop has no body')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'for_loop',
    variable,
    from,
    to,
    by,
    body,
  }
}

/**
 * If 블록 파싱
 */
function parseIfBlock(block: Blockly.Block): IfNode | null {
  const condition = block.getFieldValue('CONDITION') as string

  const thenInput = block.getInput('DO')
  const thenBlock = thenInput?.connection?.targetBlock()

  const thenBranch = thenBlock ? parseBlock(thenBlock) : null

  if (!thenBranch) {
    log.warn('BlocklyParser', 'If block has no then branch')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'if',
    condition,
    thenBranch,
  }
}

/**
 * If-Else 블록 파싱
 */
function parseIfElseBlock(block: Blockly.Block): IfElseNode | null {
  const condition = block.getFieldValue('CONDITION') as string

  // swarmBlocks.ts에서는 'DO_IF'와 'DO_ELSE'를 사용
  const thenInput = block.getInput('DO_IF') || block.getInput('DO')
  const thenBlock = thenInput?.connection?.targetBlock()
  const thenBranch = thenBlock ? parseBlock(thenBlock) : null

  const elseInput = block.getInput('DO_ELSE') || block.getInput('ELSE')
  const elseBlock = elseInput?.connection?.targetBlock()
  const elseBranch = elseBlock ? parseBlock(elseBlock) : null

  if (!thenBranch) {
    log.warn('BlocklyParser', 'If-Else block has no then branch')
    return null
  }

  if (!elseBranch) {
    log.warn('BlocklyParser', 'If-Else block has no else branch')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'if_else',
    condition,
    thenBranch,
    elseBranch,
  }
}

/**
 * 대기 블록 파싱
 */
function parseWaitBlock(block: Blockly.Block): WaitNode {
  const duration = block.getFieldValue('DURATION') as number

  return {
    id: generateNodeId(),
    type: 'wait',
    duration,
  }
}

/**
 * While 루프 블록 파싱 (Phase 6-A)
 */
function parseWhileLoopBlock(block: Blockly.Block): WhileLoopNode | null {
  const condition = block.getFieldValue('CONDITION') as string

  const statementInput = block.getInput('DO')
  const statementBlock = statementInput?.connection?.targetBlock()

  const body = statementBlock ? parseBlock(statementBlock) : null

  if (!body) {
    log.warn('BlocklyParser', 'While loop has no body')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'while_loop',
    condition,
    body,
    maxIterations: 1000, // 무한 루프 방지
  }
}

/**
 * Repeat Until 루프 블록 파싱 (Phase 6-A)
 */
function parseUntilLoopBlock(block: Blockly.Block): UntilLoopNode | null {
  const condition = block.getFieldValue('CONDITION') as string

  const statementInput = block.getInput('DO')
  const statementBlock = statementInput?.connection?.targetBlock()

  const body = statementBlock ? parseBlock(statementBlock) : null

  if (!body) {
    log.warn('BlocklyParser', 'Repeat Until loop has no body')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'until_loop',
    condition,
    body,
    maxIterations: 1000, // 무한 루프 방지
  }
}

/**
 * 변수 설정 블록 파싱 (Phase 6-A)
 */
function parseVariableSetBlock(block: Blockly.Block): VariableSetNode | null {
  const variableName = block.getFieldValue('VAR') as string

  // VALUE 입력이 연결되어 있는지 확인
  const valueInput = block.getInput('VALUE')
  const valueConnection = valueInput?.connection
  const valueBlock = valueConnection?.targetBlock()

  let value: number | VariableGetNode

  if (valueBlock) {
    // 다른 블록으로부터 값을 받는 경우 (예: variables_get)
    if (valueBlock.type === 'variables_get') {
      const varGetNode = parseVariableGetBlock(valueBlock)
      value = varGetNode
    } else {
      // 센서 블록이나 수식 블록 등은 현재 미지원
      log.warn('BlocklyParser', 'Unsupported value block type in variable_set:', valueBlock.type)
      return null
    }
  } else {
    // 필드로부터 직접 값을 받는 경우
    value = block.getFieldValue('VALUE') as number
  }

  return {
    id: generateNodeId(),
    type: 'variable_set',
    variableName,
    value,
  }
}

/**
 * 변수 값 가져오기 블록 파싱 (Phase 6-A)
 */
function parseVariableGetBlock(block: Blockly.Block): VariableGetNode {
  const variableName = block.getFieldValue('VAR') as string

  return {
    id: generateNodeId(),
    type: 'variable_get',
    variableName,
  }
}

/**
 * 함수 정의 블록 파싱 (Phase 6-A)
 */
function parseFunctionDefBlock(block: Blockly.Block): FunctionDefNode | null {
  const functionName = block.getFieldValue('NAME') as string

  const statementInput = block.getInput('STACK')
  const statementBlock = statementInput?.connection?.targetBlock()

  const body = statementBlock ? parseBlock(statementBlock) : null

  if (!body) {
    log.warn('BlocklyParser', 'Function definition has no body')
    return null
  }

  return {
    id: generateNodeId(),
    type: 'function_def',
    functionName,
    body,
  }
}

/**
 * 함수 호출 블록 파싱 (Phase 6-A)
 */
function parseFunctionCallBlock(block: Blockly.Block): FunctionCallNode {
  const functionName = block.getFieldValue('NAME') as string

  return {
    id: generateNodeId(),
    type: 'function_call',
    functionName,
  }
}

/**
 * 드론 명령 블록 파싱
 */
function parseCommandBlock(block: Blockly.Block): CommandNode | null {
  const command = blockToCommand(block)

  if (!command) {
    return null
  }

  return {
    id: generateNodeId(),
    type: 'command',
    command,
  }
}

/**
 * Blockly 블록을 Command 객체로 변환
 */
function blockToCommand(block: Blockly.Block): Command | null {
  switch (block.type) {
    // ============= 새로운 드론 블록들 =============
    case 'drone_takeoff':
      return {
        action: 'DRONE_TAKEOFF',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          altitude: block.getFieldValue('ALTITUDE') as number
        }
      }

    case 'drone_land':
      return {
        action: 'DRONE_LAND',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number
        }
      }

    case 'drone_takeoff_all':
      return {
        action: CommandAction.TAKEOFF_ALL,
        params: {
          altitude: block.getFieldValue('ALTITUDE') as number
        }
      }

    case 'drone_land_all':
      return {
        action: CommandAction.LAND_ALL,
        params: {}
      }

    case 'drone_hover':
      return {
        action: 'DRONE_HOVER',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number
        }
      }

    case 'drone_emergency':
      return {
        action: 'DRONE_EMERGENCY',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number
        }
      }

    case 'drone_move_direction':
      return {
        action: 'DRONE_MOVE_DIRECTION',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          direction: block.getFieldValue('DIRECTION') as string,
          distance: block.getFieldValue('DISTANCE') as number
        }
      }

    case 'drone_move_direction_all':
      return {
        action: 'DRONE_MOVE_DIRECTION_ALL',
        params: {
          direction: block.getFieldValue('DIRECTION') as string,
          distance: block.getFieldValue('DISTANCE') as number
        }
      }

    case 'drone_move_xyz':
      return {
        action: 'DRONE_MOVE_XYZ',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          x: block.getFieldValue('X') as number,
          y: block.getFieldValue('Y') as number,
          z: block.getFieldValue('Z') as number,
          speed: block.getFieldValue('SPEED') as number
        }
      }

    case 'drone_rotate':
      return {
        action: 'DRONE_ROTATE',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          direction: block.getFieldValue('DIRECTION') as string,
          degrees: block.getFieldValue('DEGREES') as number
        }
      }

    case 'drone_rc_control':
      return {
        action: 'DRONE_RC_CONTROL',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          roll: block.getFieldValue('ROLL') as number,
          pitch: block.getFieldValue('PITCH') as number,
          yaw: block.getFieldValue('YAW') as number,
          throttle: block.getFieldValue('THROTTLE') as number
        }
      }

    case 'drone_set_speed':
      return {
        action: 'DRONE_SET_SPEED',
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          speed: block.getFieldValue('SPEED') as number
        }
      }

    case 'mission_add_waypoint':
      return {
        action: 'MISSION_ADD_WAYPOINT',
        params: {
          waypoint: {
            id: `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x: block.getFieldValue('X') as number,
            y: block.getFieldValue('Y') as number,
            z: block.getFieldValue('Z') as number,
            speed: block.getFieldValue('SPEED') as number,
            holdTime: block.getFieldValue('HOLD_TIME') as number
          }
        }
      }

    case 'mission_goto_waypoint':
      return {
        action: 'MISSION_GOTO_WAYPOINT',
        params: {
          waypointIndex: block.getFieldValue('WAYPOINT_INDEX') as number,
          speed: block.getFieldValue('SPEED') as number
        }
      }

    case 'mission_execute':
      return {
        action: 'MISSION_EXECUTE',
        params: {
          loop: block.getFieldValue('LOOP') === 'TRUE'
        }
      }

    case 'mission_clear':
      return {
        action: 'MISSION_CLEAR',
        params: {}
      }

    // ============= 기존 스웜 블록들 (하위 호환성) =============
    case 'swarm_takeoff_all':
      return {
        action: CommandAction.TAKEOFF_ALL,
        params: {
          altitude: block.getFieldValue('ALTITUDE') as number
        }
      }

    case 'swarm_land_all':
      return {
        action: CommandAction.LAND_ALL,
        params: {}
      }

    case 'swarm_formation_grid':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.GRID,
          rows: block.getFieldValue('ROWS') as number,
          cols: block.getFieldValue('COLS') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_line':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.LINE,
          rows: block.getFieldValue('ROWS') as number,
          cols: block.getFieldValue('COLS') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_circle':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.CIRCLE,
          cols: block.getFieldValue('RADIUS') as number, // RADIUS → cols (반지름)
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_vshape':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.V_SHAPE,
          rows: block.getFieldValue('DEPTH') as number, // DEPTH → rows (깊이)
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_triangle':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.TRIANGLE,
          rows: block.getFieldValue('MAX_ROWS') as number, // MAX_ROWS → rows
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_square':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.SQUARE,
          rows: block.getFieldValue('ROWS') as number,
          cols: block.getFieldValue('COLS') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_diamond':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.DIAMOND,
          rows: block.getFieldValue('SIZE') as number, // SIZE → rows (크기)
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_move_formation':
      return {
        action: CommandAction.MOVE_FORMATION,
        params: {
          direction: block.getFieldValue('DIRECTION') as Direction,
          distance: block.getFieldValue('DISTANCE') as number
        }
      }

    case 'swarm_move_drone':
      return {
        action: CommandAction.MOVE_DRONE,
        params: {
          droneId: block.getFieldValue('DRONE_ID') as number,
          x: block.getFieldValue('X') as number,
          y: block.getFieldValue('Y') as number,
          z: block.getFieldValue('Z') as number
        }
      }

    case 'swarm_hover':
      return {
        action: CommandAction.HOVER,
        params: {}
      }

    case 'swarm_sync_all':
      return {
        action: CommandAction.SYNC_ALL,
        params: {}
      }

    default:
      return null
  }
}

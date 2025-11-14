/**
 * Blockly 워크스페이스를 실행 가능한 노드 트리로 파싱
 */

import * as Blockly from 'blockly'
import type { Command } from '@/types/websocket'
import { CommandAction } from '@/constants/commands'
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

  for (const block of topBlocks) {
    const parsed = parseBlock(block)
    if (parsed) {
      children.push(parsed)
    }
  }

  if (children.length === 0) {
    return null
  }

  if (children.length === 1) {
    return children[0]
  }

  // 여러 최상위 블록이 있으면 시퀀스로 묶음
  return {
    id: generateNodeId(),
    type: 'sequence',
    children,
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

  // 제어 흐름 블록
  if (type === 'controls_repeat') {
    return parseRepeatBlock(block)
  }

  if (type === 'controls_for') {
    return parseForLoopBlock(block)
  }

  if (type === 'controls_while') {
    return parseWhileLoopBlock(block)
  }

  if (type === 'controls_repeat_until') {
    return parseUntilLoopBlock(block)
  }

  if (type === 'controls_if_simple') {
    return parseIfBlock(block)
  }

  if (type === 'controls_if_else') {
    return parseIfElseBlock(block)
  }

  // 변수 블록
  if (type === 'variables_set') {
    return parseVariableSetBlock(block)
  }

  if (type === 'variables_get') {
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
  if (type === 'swarm_wait' || type === 'swarm_wait_all') {
    return parseWaitBlock(block)
  }

  // 드론 명령 블록
  if (type.startsWith('swarm_')) {
    return parseCommandBlock(block)
  }

  // 센서 블록과 논리 블록은 값 블록이므로 단독으로 파싱하지 않음
  if (type.startsWith('sensor_') || type.startsWith('logic_')) {
    console.warn(`[BlocklyParser] Value block cannot be used as statement: ${type}`)
    return null
  }

  // 알 수 없는 블록 타입
  console.warn(`[BlocklyParser] Unknown block type: ${type}`)
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
    console.warn('[BlocklyParser] Repeat block has no body')
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
    console.warn('[BlocklyParser] For loop has no body')
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
    console.warn('[BlocklyParser] If block has no then branch')
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
    console.warn('[BlocklyParser] If-Else block has no then branch')
    return null
  }

  if (!elseBranch) {
    console.warn('[BlocklyParser] If-Else block has no else branch')
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
    console.warn('[BlocklyParser] While loop has no body')
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
    console.warn('[BlocklyParser] Repeat Until loop has no body')
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
function parseVariableSetBlock(block: Blockly.Block): VariableSetNode {
  const variableName = block.getFieldValue('VAR') as string
  const value = block.getFieldValue('VALUE') as number

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
    console.warn('[BlocklyParser] Function definition has no body')
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

    case 'swarm_set_formation':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: block.getFieldValue('FORMATION_TYPE') as string,
          rows: block.getFieldValue('ROWS') as number,
          cols: block.getFieldValue('COLS') as number,
          spacing: block.getFieldValue('SPACING') as number
        }
      }

    case 'swarm_move_formation':
      return {
        action: CommandAction.MOVE_FORMATION,
        params: {
          direction: block.getFieldValue('DIRECTION') as string,
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

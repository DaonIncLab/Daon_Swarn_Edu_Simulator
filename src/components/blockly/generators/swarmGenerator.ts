/**
 * Blockly 블록을 드론 제어 JSON 명령으로 변환하는 코드 생성기
 */

import * as Blockly from 'blockly'
import type { Command } from '@/types/websocket'
import { CommandAction, FormationType } from '@/constants/commands'

// JSON 생성기 정의
export const jsonGenerator = new Blockly.Generator('JSON')

// 코드 생성 순서 정의
jsonGenerator.PRECEDENCE = 0

/**
 * 워크스페이스를 명령 배열로 변환
 */
jsonGenerator.workspaceToCode = function(workspace: Blockly.Workspace): string {
  const commands: Command[] = []
  const topBlocks = workspace.getTopBlocks(true)

  topBlocks.forEach(block => {
    if (block.type.startsWith('swarm_')) {
      const command = blockToCommand(block)
      if (command) {
        commands.push(command)
      }
    }
  })

  return JSON.stringify(commands, null, 2)
}

/**
 * 개별 블록을 명령 객체로 변환
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
          cols: block.getFieldValue('RADIUS') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_vshape':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.V_SHAPE,
          rows: block.getFieldValue('DEPTH') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
        }
      }

    case 'swarm_formation_triangle':
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          type: FormationType.TRIANGLE,
          rows: block.getFieldValue('MAX_ROWS') as number,
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
          rows: block.getFieldValue('SIZE') as number,
          spacing: block.getFieldValue('SPACING') as number,
          leaderDroneId: (block.getFieldValue('LEADER_DRONE') as number) - 1
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

    case 'swarm_wait':
      return {
        action: CommandAction.WAIT,
        params: {
          duration: block.getFieldValue('DURATION') as number
        }
      }

    case 'swarm_hover':
      return {
        action: CommandAction.HOVER,
        params: {}
      }

    case 'controls_repeat':
      return {
        action: CommandAction.REPEAT,
        params: {
          times: block.getFieldValue('TIMES') as number
        }
      }

    case 'controls_for':
      return {
        action: CommandAction.FOR_LOOP,
        params: {
          variable: block.getFieldValue('VAR') as string,
          from: block.getFieldValue('FROM') as number,
          to: block.getFieldValue('TO') as number,
          by: block.getFieldValue('BY') as number
        }
      }

    case 'controls_if_simple':
      return {
        action: CommandAction.IF,
        params: {
          condition: block.getFieldValue('CONDITION') as string
        }
      }

    case 'controls_if_else':
      return {
        action: CommandAction.IF_ELSE,
        params: {
          condition: block.getFieldValue('CONDITION') as string
        }
      }

    case 'swarm_sync_all':
      return {
        action: CommandAction.SYNC_ALL,
        params: {}
      }

    case 'swarm_wait_all':
      return {
        action: CommandAction.WAIT_ALL,
        params: {
          duration: block.getFieldValue('DURATION') as number
        }
      }

    case 'variables_set':
      return {
        action: 'set_variable',
        params: {
          variable: block.getFieldValue('VAR') as string,
          value: block.getFieldValue('VALUE') as number
        }
      }

    case 'math_arithmetic':
      return {
        action: 'math_op',
        params: {
          a: block.getFieldValue('A') as number,
          op: block.getFieldValue('OP') as string,
          b: block.getFieldValue('B') as number
        }
      }

    case 'swarm_add_waypoint':
      return {
        action: CommandAction.ADD_WAYPOINT,
        params: {
          waypoint: {
            id: `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: block.getFieldValue('NAME') as string,
            x: block.getFieldValue('X') as number,
            y: block.getFieldValue('Y') as number,
            z: block.getFieldValue('Z') as number,
            speed: block.getFieldValue('SPEED') as number,
            holdTime: block.getFieldValue('HOLD_TIME') as number
          }
        }
      }

    case 'swarm_goto_waypoint':
      return {
        action: CommandAction.GOTO_WAYPOINT,
        params: {
          waypointId: block.getFieldValue('WAYPOINT_NAME') as string,
          speed: block.getFieldValue('SPEED') as number
        }
      }

    case 'swarm_execute_mission':
      return {
        action: CommandAction.EXECUTE_MISSION,
        params: {
          loop: block.getFieldValue('LOOP') === 'TRUE',
          speed: block.getFieldValue('SPEED') as number
        }
      }

    case 'swarm_clear_waypoints':
      return {
        action: CommandAction.CLEAR_WAYPOINTS,
        params: {}
      }

    default:
      return null
  }
}

/**
 * 워크스페이스에서 명령 배열 추출
 */
export function generateCommands(workspace: Blockly.Workspace): Command[] {
  const commands: Command[] = []
  const topBlocks = workspace.getTopBlocks(true)

  topBlocks.forEach(block => {
    // 연결된 블록들을 순서대로 처리
    let currentBlock: Blockly.Block | null = block
    while (currentBlock) {
      if (currentBlock.type.startsWith('swarm_')) {
        const command = blockToCommand(currentBlock)
        if (command) {
          commands.push(command)
        }
      }
      currentBlock = currentBlock.getNextBlock()
    }
  })

  return commands
}

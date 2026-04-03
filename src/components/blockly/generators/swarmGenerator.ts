/**
 * Blockly 블록을 MAVLink 드론 제어 JSON 명령으로 변환하는 코드 생성기
 */

import * as Blockly from "blockly";
import type { Command } from "@/types/websocket";
import { CommandAction } from "@/constants/commands";

// JSON 생성기 정의
export const droneJsonGenerator = new Blockly.Generator("DroneJSON");

// 코드 생성 순서 정의
droneJsonGenerator.PRECEDENCE = 0;

/**
 * 워크스페이스를 명령 배열로 변환
 */
droneJsonGenerator.workspaceToCode = function (
  workspace: Blockly.Workspace,
): string {
  const commands: Command[] = [];
  const topBlocks = workspace.getTopBlocks(true);

  topBlocks.forEach((block) => {
    const blockCommands = processBlock(block);
    commands.push(...blockCommands);
  });

  return JSON.stringify(commands, null, 2);
};

/**
 * 블록과 연결된 모든 블록을 재귀적으로 처리
 */
function processBlock(block: Blockly.Block): Command[] {
  const commands: Command[] = [];

  let currentBlock: Blockly.Block | null = block;
  while (currentBlock) {
    const command = blockToCommand(currentBlock);
    if (command) {
      commands.push(command);
    }
    currentBlock = currentBlock.getNextBlock();
  }

  return commands;
}

/**
 * Value input에서 값 가져오기
 */
function getValueInput(block: Blockly.Block, inputName: string): any {
  const targetBlock = block.getInputTargetBlock(inputName);
  if (!targetBlock) return null;

  // 숫자 블록
  if (targetBlock.type === "math_number") {
    return targetBlock.getFieldValue("NUM");
  }

  // 변수 블록
  if (targetBlock.type === "var_get") {
    return { type: "variable", name: targetBlock.getFieldValue("VAR") };
  }

  // 센서 블록
  if (targetBlock.type.startsWith("sensor_")) {
    return {
      type: "sensor",
      sensorType: targetBlock.type,
      droneId: targetBlock.getFieldValue("DRONE_ID"),
    };
  }

  // 수식 블록
  if (targetBlock.type === "math_arithmetic") {
    return {
      type: "expression",
      operator: targetBlock.getFieldValue("OP"),
      left: getValueInput(targetBlock, "A"),
      right: getValueInput(targetBlock, "B"),
    };
  }

  // 비교 블록
  if (targetBlock.type === "logic_compare") {
    return {
      type: "comparison",
      operator: targetBlock.getFieldValue("OP"),
      left: getValueInput(targetBlock, "A"),
      right: getValueInput(targetBlock, "B"),
    };
  }

  // 논리 연산 블록
  if (targetBlock.type === "logic_operation") {
    return {
      type: "logic",
      operator: targetBlock.getFieldValue("OP"),
      left: getValueInput(targetBlock, "A"),
      right: getValueInput(targetBlock, "B"),
    };
  }

  // Boolean 블록
  if (targetBlock.type === "logic_boolean") {
    return targetBlock.getFieldValue("BOOL") === "TRUE";
  }

  return null;
}

/**
 * Statement input에서 명령들 가져오기
 */
function getStatementCommands(
  block: Blockly.Block,
  inputName: string,
): Command[] {
  const statementBlock = block.getInputTargetBlock(inputName);
  if (!statementBlock) return [];

  return processBlock(statementBlock);
}

/**
 * 개별 블록을 명령 객체로 변환
 */
function blockToCommand(block: Blockly.Block): Command | null {
  switch (block.type) {
    // =============================================================================
    // 1. Flight Control (비행 제어)
    // =============================================================================

    case "drone_takeoff":
      return {
        action: CommandAction.TAKEOFF,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          altitude: block.getFieldValue("ALTITUDE") as number,
        },
      };

    case "drone_land":
      return {
        action: CommandAction.LAND,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    case "drone_takeoff_all":
      return {
        action: CommandAction.TAKEOFF_ALL,
        params: {
          altitude: block.getFieldValue("ALTITUDE") as number,
        },
      };

    case "drone_land_all":
      return {
        action: CommandAction.LAND_ALL,
        params: {},
      };

    case "drone_hover":
      return {
        action: CommandAction.HOVER,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    case "drone_emergency":
      return {
        action: CommandAction.EMERGENCY,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    // =============================================================================
    // 2. Movement (이동)
    // =============================================================================

    case "drone_move_direction":
      return {
        action: CommandAction.MOVE_DIRECTION,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          direction: block.getFieldValue("DIRECTION") as string,
          distance: block.getFieldValue("DISTANCE") as number,
        },
      };

    case "drone_move_xyz":
      return {
        action: CommandAction.MOVE_DRONE,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          x: block.getFieldValue("X") as number,
          y: block.getFieldValue("Y") as number,
          z: block.getFieldValue("Z") as number,
          speed: block.getFieldValue("SPEED") as number,
        },
      };

    case "drone_rotate":
      return {
        action: CommandAction.ROTATE,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          direction: block.getFieldValue("DIRECTION") as string,
          degrees: block.getFieldValue("DEGREES") as number,
        },
      };

    // =============================================================================
    // 3. Group (그룹)
    // =============================================================================

    case "group_formation":
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          formation: block.getFieldValue("FORMATION"),
        },
      };

    case "group_led_color": {
      const hex = (block.getFieldValue("COLOUR") as string) || "#ff0000";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return {
        action: CommandAction.SET_LED_COLOR,
        params: {
          r: r,
          g: g,
          b: b,
        },
      };
    }

    // =============================================================================
    // 4. RC Control (수동 제어)
    // =============================================================================

    case "drone_rc_control":
      return {
        action: CommandAction.RC_CONTROL,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          roll: block.getFieldValue("ROLL") as number,
          pitch: block.getFieldValue("PITCH") as number,
          yaw: block.getFieldValue("YAW") as number,
          throttle: block.getFieldValue("THROTTLE") as number,
        },
      };

    // =============================================================================
    // 5. Telemetry (센서) - Value blocks는 별도 처리
    // =============================================================================

    // sensor_battery, sensor_altitude 등은 getValueInput에서 처리됨

    // =============================================================================
    // 6. Mission (미션)
    // =============================================================================

    case "mission_add_waypoint":
      return {
        action: CommandAction.MISSION_ADD_WAYPOINT,
        params: {
          waypoint: {
            id: `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x: block.getFieldValue("X") as number,
            y: block.getFieldValue("Y") as number,
            z: block.getFieldValue("Z") as number,
            speed: block.getFieldValue("SPEED") as number,
            holdTime: block.getFieldValue("HOLD_TIME") as number,
          },
        },
      };

    case "mission_goto_waypoint":
      return {
        action: CommandAction.MISSION_GOTO_WAYPOINT,
        params: {
          waypointIndex: block.getFieldValue("WAYPOINT_INDEX") as number,
          speed: block.getFieldValue("SPEED") as number,
        },
      };

    case "mission_execute":
      return {
        action: CommandAction.MISSION_EXECUTE,
        params: {
          loop: block.getFieldValue("LOOP") === "TRUE",
        },
      };

    case "mission_clear":
      return {
        action: CommandAction.MISSION_CLEAR,
        params: {},
      };

    // =============================================================================
    // 7. Settings (설정)
    // =============================================================================

    case "drone_set_speed":
      return {
        action: CommandAction.SET_SPEED,
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          speed: block.getFieldValue("SPEED") as number,
        },
      };

    // =============================================================================
    // 8. Sync & Wait (동기화 & 대기)
    // =============================================================================

    case "control_wait":
      return {
        action: "CONTROL_WAIT",
        params: {
          duration: block.getFieldValue("DURATION") as number,
        },
      };

    // =============================================================================
    // 9. Control Flow (제어 흐름)
    // =============================================================================

    case "control_repeat":
      return {
        action: "CONTROL_REPEAT",
        params: {
          times: block.getFieldValue("TIMES") as number,
          commands: getStatementCommands(block, "DO"),
        },
      };

    case "control_for":
      return {
        action: "CONTROL_FOR",
        params: {
          variable: block.getFieldValue("VAR") as string,
          from: block.getFieldValue("FROM") as number,
          to: block.getFieldValue("TO") as number,
          by: block.getFieldValue("BY") as number,
          commands: getStatementCommands(block, "DO"),
        },
      };

    case "control_while":
      return {
        action: "CONTROL_WHILE",
        params: {
          condition: getValueInput(block, "CONDITION"),
          commands: getStatementCommands(block, "DO"),
        },
      };

    case "control_if":
      return {
        action: "CONTROL_IF",
        params: {
          condition: getValueInput(block, "CONDITION"),
          commandsIf: getStatementCommands(block, "DO_IF"),
        },
      };

    case "control_if_else":
      return {
        action: "CONTROL_IF_ELSE",
        params: {
          condition: getValueInput(block, "CONDITION"),
          commandsIf: getStatementCommands(block, "DO_IF"),
          commandsElse: getStatementCommands(block, "DO_ELSE"),
        },
      };

    // =============================================================================
    // 10. Variables & Math (변수 & 수식)
    // =============================================================================

    case "var_set":
      return {
        action: "VAR_SET",
        params: {
          variable: block.getFieldValue("VAR") as string,
          value: getValueInput(block, "VALUE"),
        },
      };

    // var_get, math_arithmetic, math_number는 getValueInput에서 처리됨

    // =============================================================================
    // 10. Logic (논리) - Value blocks는 별도 처리
    // =============================================================================

    // logic_compare, logic_operation, logic_negate, logic_boolean은 getValueInput에서 처리됨

    default:
      return null;
  }
}

/**
 * 워크스페이스에서 명령 배열 추출
 */
export function generateCommands(workspace: Blockly.Workspace): Command[] {
  const commands: Command[] = [];
  const topBlocks = workspace.getTopBlocks(true);

  topBlocks.forEach((block) => {
    const blockCommands = processBlock(block);
    commands.push(...blockCommands);
  });

  return commands;
}

// 별칭 export (하위 호환성)
export const generateDroneCommands = generateCommands;

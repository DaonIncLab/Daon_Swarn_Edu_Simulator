/**
 * Blockly 블록을 MAVLink 드론 제어 JSON 명령으로 변환하는 코드 생성기
 */

import * as Blockly from "blockly";
import type { Command } from "@/types/websocket";

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
        action: "DRONE_TAKEOFF",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          altitude: block.getFieldValue("ALTITUDE") as number,
        },
      };

    case "drone_land":
      return {
        action: "DRONE_LAND",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    case "drone_takeoff_all":
      return {
        action: "DRONE_TAKEOFF_ALL",
        params: {
          altitude: block.getFieldValue("ALTITUDE") as number,
        },
      };

    case "drone_land_all":
      return {
        action: "DRONE_LAND_ALL",
        params: {},
      };

    case "drone_hover":
      return {
        action: "DRONE_HOVER",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    case "drone_emergency":
      return {
        action: "DRONE_EMERGENCY",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
        },
      };

    // =============================================================================
    // 2. Movement (이동)
    // =============================================================================

    case "drone_move_direction":
      return {
        action: "DRONE_MOVE_DIRECTION",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          direction: block.getFieldValue("DIRECTION") as string,
          distance: block.getFieldValue("DISTANCE") as number,
        },
      };

    case "drone_move_xyz":
      return {
        action: "DRONE_MOVE_XYZ",
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
        action: "DRONE_ROTATE",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          direction: block.getFieldValue("DIRECTION") as string,
          degrees: block.getFieldValue("DEGREES") as number,
        },
      };

    // =============================================================================
    // 3. RC Control (수동 제어)
    // =============================================================================

    case "drone_rc_control":
      return {
        action: "DRONE_RC_CONTROL",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          roll: block.getFieldValue("ROLL") as number,
          pitch: block.getFieldValue("PITCH") as number,
          yaw: block.getFieldValue("YAW") as number,
          throttle: block.getFieldValue("THROTTLE") as number,
        },
      };

    // =============================================================================
    // 4. Telemetry (센서) - Value blocks는 별도 처리
    // =============================================================================

    // sensor_battery, sensor_altitude 등은 getValueInput에서 처리됨

    // =============================================================================
    // 5. Mission (미션)
    // =============================================================================

    case "mission_add_waypoint":
      return {
        action: "MISSION_ADD_WAYPOINT",
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
        action: "MISSION_GOTO_WAYPOINT",
        params: {
          waypointIndex: block.getFieldValue("WAYPOINT_INDEX") as number,
          speed: block.getFieldValue("SPEED") as number,
        },
      };

    case "mission_execute":
      return {
        action: "MISSION_EXECUTE",
        params: {
          loop: block.getFieldValue("LOOP") === "TRUE",
        },
      };

    case "mission_clear":
      return {
        action: "MISSION_CLEAR",
        params: {},
      };

    // =============================================================================
    // 6. Settings (설정)
    // =============================================================================

    case "drone_set_speed":
      return {
        action: "DRONE_SET_SPEED",
        params: {
          droneId: block.getFieldValue("DRONE_ID") as number,
          speed: block.getFieldValue("SPEED") as number,
        },
      };

    // =============================================================================
    // 7. Sync & Wait (동기화 & 대기)
    // =============================================================================

    case "control_wait":
      return {
        action: "CONTROL_WAIT",
        params: {
          duration: block.getFieldValue("DURATION") as number,
        },
      };

    // =============================================================================
    // 8. Control Flow (제어 흐름)
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
    // 9. Variables & Math (변수 & 수식)
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

    // unity webgl
    case "unity_execute_all":
      return {
        action: "UNITY_EXECUTE_ALL",
        params: {
          intent: "0",
          items: [],
        },
      };

    case "unity_add_drone":
      return {
        action: "UNITY_ADD_DRONE",
        params: {
          intent: 1,
          items: [],
        },
      };

    case "unity_delete_drone":
      return {
        action: "UNITY_DELETE_DRONE",
        params: {
          intent: 2,
          items: [],
        },
      };

    case "unity_change_camera":
      return {
        action: "UNITY_CHANGE_CAMERA",
        params: {
          intent: 5,
          items: [],
        },
      };
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

import { CommandAction } from "@/constants/commands";
import type {
  CommandNode,
  ConditionNode,
  ExecutableNode,
  ForLoopNode,
  IfElseNode,
  IfNode,
  LogicCompareNode,
  LogicNegateNode,
  LogicOperationNode,
  MathExprNode,
  RepeatNode,
  ScenarioConfigNode,
  ScenarioPlan,
  ScenarioStep,
  SensorValueNode,
  ValueNode,
  VariableGetNode,
  VariableSetNode,
  WaitNode,
} from "@/types/execution";
import type { Command } from "@/types/websocket";
import { log } from "@/utils/logger";
import * as Blockly from "blockly";

let nodeIdCounter = 0;

const REMOVED_BLOCKS = new Set([
  "drone_rc_control",
  "mission_add_waypoint",
  "mission_goto_waypoint",
  "mission_execute",
  "mission_clear",
]);

const HIDDEN_BLOCKS = new Set([
  "control_while",
  "sensor_pitch",
  "sensor_roll",
  "sensor_yaw",
  "sensor_flight_time",
]);

function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

export function parseBlocklyWorkspace(
  workspace: Blockly.Workspace,
): ScenarioPlan | null {
  nodeIdCounter = 0;

  const topBlocks = workspace.getTopBlocks(true);
  if (topBlocks.length === 0) {
    return null;
  }

  const children = topBlocks
    .map((block) => parseBlock(block))
    .filter((node): node is ExecutableNode => node !== null);

  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return children[0];
  }

  return {
    id: generateNodeId(),
    type: "sequence",
    children,
  };
}

export function collectScenarioSteps(plan: ScenarioPlan | null): ScenarioStep[] {
  if (!plan) {
    return [];
  }

  const steps: ScenarioStep[] = [];

  const visit = (node: ExecutableNode, depth: number) => {
    switch (node.type) {
      case "sequence":
        node.children.forEach((child) => visit(child, depth));
        break;
      case "repeat":
        steps.push({
          id: node.id,
          label: `반복 ${node.times}번`,
          depth,
          nodeType: node.type,
        });
        visit(node.body, depth + 1);
        break;
      case "for_loop":
        steps.push({
          id: node.id,
          label: `For ${node.variable}=${node.from}..${node.to}`,
          depth,
          nodeType: node.type,
        });
        visit(node.body, depth + 1);
        break;
      case "if":
        steps.push({
          id: node.id,
          label: "조건문",
          depth,
          nodeType: node.type,
        });
        visit(node.thenBranch, depth + 1);
        break;
      case "if_else":
        steps.push({
          id: node.id,
          label: "조건문 분기",
          depth,
          nodeType: node.type,
        });
        visit(node.thenBranch, depth + 1);
        visit(node.elseBranch, depth + 1);
        break;
      case "wait":
        steps.push({
          id: node.id,
          label: `${node.duration}초 대기`,
          depth,
          nodeType: node.type,
        });
        break;
      case "scenario_config":
        steps.push({
          id: node.id,
          label: `드론 속도 ${node.config.speed ?? 2}m/s`,
          depth,
          nodeType: node.type,
        });
        break;
      case "command":
        steps.push({
          id: node.id,
          label: commandToLabel(node.command),
          depth,
          nodeType: node.type,
        });
        break;
      case "variable_set":
        steps.push({
          id: node.id,
          label: `변수 ${node.variableName} 저장`,
          depth,
          nodeType: node.type,
        });
        break;
      default:
        break;
    }
  };

  visit(plan, 0);
  return steps;
}

function commandToLabel(command: Command): string {
  switch (command.action) {
    case CommandAction.TAKEOFF:
      return `드론 ${(command.params as { droneId: number }).droneId} 이륙`;
    case CommandAction.LAND:
      return `드론 ${(command.params as { droneId: number }).droneId} 착륙`;
    case CommandAction.TAKEOFF_ALL:
      return "모든 드론 이륙";
    case CommandAction.LAND_ALL:
      return "모든 드론 착륙";
    case CommandAction.HOVER:
      return `드론 ${(command.params as { droneId: number }).droneId} 위치 유지`;
    case CommandAction.MOVE_DIRECTION:
      return `드론 ${(command.params as { droneId: number }).droneId} 방향 이동`;
    case CommandAction.MOVE_DIRECTION_ALL:
      return "모든 드론 방향 이동";
    case CommandAction.MOVE_DRONE:
      return `드론 ${(command.params as { droneId: number }).droneId} 좌표 이동`;
    case CommandAction.ROTATE:
      return `드론 ${(command.params as { droneId: number }).droneId} 회전`;
    case CommandAction.SET_FORMATION:
      return "군집 대형 설정";
    case CommandAction.SET_LED_COLOR:
      return "군집 LED 색상";
    default:
      return command.action;
  }
}

function parseBlock(block: Blockly.Block): ExecutableNode | null {
  const sequence: ExecutableNode[] = [];
  let currentBlock: Blockly.Block | null = block;

  while (currentBlock) {
    const node = parseSingleBlock(currentBlock);
    if (node) {
      sequence.push(node);
    }
    currentBlock = currentBlock.getNextBlock();
  }

  if (sequence.length === 0) {
    return null;
  }

  if (sequence.length === 1) {
    return sequence[0];
  }

  return {
    id: generateNodeId(),
    type: "sequence",
    children: sequence,
  };
}

function parseSingleBlock(block: Blockly.Block): ExecutableNode | null {
  if (REMOVED_BLOCKS.has(block.type)) {
    log.warn("BlocklyParser", "Removed block is not supported", block.type);
    return null;
  }

  if (HIDDEN_BLOCKS.has(block.type)) {
    log.warn("BlocklyParser", "Advanced block is hidden from scenario plan", block.type);
    return null;
  }

  switch (block.type) {
    case "control_repeat":
    case "controls_repeat":
      return parseRepeatBlock(block);
    case "control_for":
    case "controls_for":
      return parseForLoopBlock(block);
    case "control_if":
    case "controls_if_simple":
      return parseIfBlock(block);
    case "control_if_else":
    case "controls_if_else":
      return parseIfElseBlock(block);
    case "control_wait":
      return parseWaitBlock(block);
    case "var_set":
    case "variables_set":
      return parseVariableSetBlock(block);
    case "drone_set_speed":
      return parseScenarioConfigBlock(block);
    default:
      return parseCommandBlock(block);
  }
}

function parseRepeatBlock(block: Blockly.Block): RepeatNode | null {
  const body = parseStatementBody(block, "DO");
  if (!body) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "repeat",
    times: Number(block.getFieldValue("TIMES") || 1),
    body,
  };
}

function parseForLoopBlock(block: Blockly.Block): ForLoopNode | null {
  const body = parseStatementBody(block, "DO");
  if (!body) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "for_loop",
    variable: String(block.getFieldValue("VAR") || "i"),
    from: Number(block.getFieldValue("FROM") || 1),
    to: Number(block.getFieldValue("TO") || 1),
    by: Number(block.getFieldValue("BY") || 1),
    body,
  };
}

function parseIfBlock(block: Blockly.Block): IfNode | null {
  const thenBranch = parseStatementBody(block, "DO_IF") ?? parseStatementBody(block, "DO");
  if (!thenBranch) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "if",
    condition: parseCondition(block),
    thenBranch,
  };
}

function parseIfElseBlock(block: Blockly.Block): IfElseNode | null {
  const thenBranch = parseStatementBody(block, "DO_IF");
  const elseBranch = parseStatementBody(block, "DO_ELSE");
  if (!thenBranch || !elseBranch) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "if_else",
    condition: parseCondition(block),
    thenBranch,
    elseBranch,
  };
}

function parseWaitBlock(block: Blockly.Block): WaitNode {
  return {
    id: generateNodeId(),
    type: "wait",
    duration: Number(block.getFieldValue("DURATION") || 1),
  };
}

function parseVariableSetBlock(block: Blockly.Block): VariableSetNode | null {
  const valueBlock = block.getInputTargetBlock("VALUE");
  const value = valueBlock ? parseValueBlock(valueBlock) : Number(block.getFieldValue("VALUE") || 0);
  if (value === null) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "variable_set",
    variableName: String(block.getFieldValue("VAR") || "value"),
    value,
  };
}

function parseScenarioConfigBlock(block: Blockly.Block): ScenarioConfigNode {
  return {
    id: generateNodeId(),
    type: "scenario_config",
    config: {
      speed: Number(block.getFieldValue("SPEED") || 2),
    },
  };
}

function parseCommandBlock(block: Blockly.Block): CommandNode | null {
  const command = blockToCommand(block);
  if (!command) {
    log.warn("BlocklyParser", "Unknown block type", block.type);
    return null;
  }

  return {
    id: generateNodeId(),
    type: "command",
    command,
  };
}

function blockToCommand(block: Blockly.Block): Command | null {
  switch (block.type) {
    case "drone_takeoff":
      return {
        action: CommandAction.TAKEOFF,
        params: {
          droneId: Number(block.getFieldValue("DRONE_ID") || 1),
          altitude: Number(block.getFieldValue("ALTITUDE") || 2),
        },
      };
    case "drone_land":
      return {
        action: CommandAction.LAND,
        params: { droneId: Number(block.getFieldValue("DRONE_ID") || 1) },
      };
    case "drone_takeoff_all":
      return {
        action: CommandAction.TAKEOFF_ALL,
        params: { altitude: Number(block.getFieldValue("ALTITUDE") || 2) },
      };
    case "drone_land_all":
      return { action: CommandAction.LAND_ALL, params: {} };
    case "drone_hover":
      return {
        action: CommandAction.HOVER,
        params: { droneId: Number(block.getFieldValue("DRONE_ID") || 1) },
      };
    case "drone_move_direction":
      return {
        action: CommandAction.MOVE_DIRECTION,
        params: {
          droneId: Number(block.getFieldValue("DRONE_ID") || 1),
          direction: String(block.getFieldValue("DIRECTION") || "forward"),
          distance: Number(block.getFieldValue("DISTANCE") || 1),
        },
      };
    case "drone_move_direction_all":
      return {
        action: CommandAction.MOVE_DIRECTION_ALL,
        params: {
          direction: String(block.getFieldValue("DIRECTION") || "forward"),
          distance: Number(block.getFieldValue("DISTANCE") || 1),
        },
      };
    case "drone_move_xyz":
      return {
        action: CommandAction.MOVE_DRONE,
        params: {
          droneId: Number(block.getFieldValue("DRONE_ID") || 1),
          x: Number(block.getFieldValue("X") || 0),
          y: Number(block.getFieldValue("Y") || 0),
          z: Number(block.getFieldValue("Z") || 0),
        },
      };
    case "drone_rotate":
      return {
        action: CommandAction.ROTATE,
        params: {
          droneId: Number(block.getFieldValue("DRONE_ID") || 1),
          direction: String(block.getFieldValue("DIRECTION") || "CW"),
          degrees: Number(block.getFieldValue("DEGREES") || 90),
        },
      };
    case "group_formation":
      return {
        action: CommandAction.SET_FORMATION,
        params: {
          formation: String(block.getFieldValue("FORMATION") || "triangle"),
        },
      };
    case "group_led_color": {
      const hex = String(block.getFieldValue("COLOUR") || "#ff0000");
      return {
        action: CommandAction.SET_LED_COLOR,
        params: {
          r: parseInt(hex.slice(1, 3), 16),
          g: parseInt(hex.slice(3, 5), 16),
          b: parseInt(hex.slice(5, 7), 16),
        },
      };
    }
    default:
      return null;
  }
}

function parseStatementBody(
  block: Blockly.Block,
  inputName: string,
): ExecutableNode | null {
  const statementBlock = block.getInputTargetBlock(inputName);
  return statementBlock ? parseBlock(statementBlock) : null;
}

function parseCondition(block: Blockly.Block): ConditionNode {
  const conditionBlock = block.getInputTargetBlock("CONDITION");
  if (!conditionBlock) {
    return false;
  }
  return parseConditionExpression(conditionBlock);
}

function parseConditionExpression(block: Blockly.Block): ConditionNode {
  switch (block.type) {
    case "logic_compare":
      return parseLogicCompare(block);
    case "logic_operation":
      return parseLogicOperation(block);
    case "logic_negate":
      return parseLogicNegate(block);
    case "logic_boolean":
      return String(block.getFieldValue("BOOL")) === "TRUE";
    default:
      return false;
  }
}

function parseValueBlock(block: Blockly.Block): ValueNode | null {
  switch (block.type) {
    case "math_number":
      return Number(block.getFieldValue("NUM") || 0);
    case "variables_get":
    case "var_get":
      return parseVariableGetBlock(block);
    case "sensor_battery":
    case "sensor_altitude":
    case "sensor_flight_time":
      return parseSensorBlock(block);
    case "math_arithmetic":
      return parseMathBlock(block);
    default:
      return null;
  }
}

function parseVariableGetBlock(block: Blockly.Block): VariableGetNode {
  return {
    id: generateNodeId(),
    type: "variable_get",
    variableName: String(block.getFieldValue("VAR") || "value"),
  };
}

function parseSensorBlock(block: Blockly.Block): SensorValueNode | null {
  switch (block.type) {
    case "sensor_battery":
      return {
        id: generateNodeId(),
        type: "sensor_value",
        sensorType: "battery",
        droneId: Number(block.getFieldValue("DRONE_ID") || 1),
      };
    case "sensor_altitude":
      return {
        id: generateNodeId(),
        type: "sensor_value",
        sensorType: "altitude",
        droneId: Number(block.getFieldValue("DRONE_ID") || 1),
      };
    case "sensor_flight_time":
      return {
        id: generateNodeId(),
        type: "sensor_value",
        sensorType: "elapsed_time",
      };
    default:
      return null;
  }
}

function parseMathBlock(block: Blockly.Block): MathExprNode | null {
  const left = parseValueInput(block, "A");
  const right = parseValueInput(block, "B");
  if (left === null || right === null) {
    return null;
  }

  return {
    id: generateNodeId(),
    type: "math_expr",
    operator: block.getFieldValue("OP") as MathExprNode["operator"],
    left,
    right,
  };
}

function parseLogicCompare(block: Blockly.Block): LogicCompareNode {
  return {
    id: generateNodeId(),
    type: "logic_compare",
    operator: block.getFieldValue("OP") as LogicCompareNode["operator"],
    left: parseValueInput(block, "A") ?? 0,
    right: parseValueInput(block, "B") ?? 0,
  };
}

function parseLogicOperation(block: Blockly.Block): LogicOperationNode {
  return {
    id: generateNodeId(),
    type: "logic_operation",
    operator: block.getFieldValue("OP") as LogicOperationNode["operator"],
    left: parseConditionInput(block, "A"),
    right: parseConditionInput(block, "B"),
  };
}

function parseLogicNegate(block: Blockly.Block): LogicNegateNode {
  return {
    id: generateNodeId(),
    type: "logic_negate",
    operand: parseConditionInput(block, "BOOL"),
  };
}

function parseValueInput(block: Blockly.Block, inputName: string): ValueNode | null {
  const target = block.getInputTargetBlock(inputName);
  return target ? parseValueBlock(target) : null;
}

function parseConditionInput(block: Blockly.Block, inputName: string): ConditionNode {
  const target = block.getInputTargetBlock(inputName);
  return target ? parseConditionExpression(target) : false;
}

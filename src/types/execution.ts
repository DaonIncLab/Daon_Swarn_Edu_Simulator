import type { Command } from "./websocket";

export const NodeType = {
  COMMAND: "command",
  SEQUENCE: "sequence",
  REPEAT: "repeat",
  FOR_LOOP: "for_loop",
  WHILE_LOOP: "while_loop",
  UNTIL_LOOP: "until_loop",
  IF: "if",
  IF_ELSE: "if_else",
  WAIT: "wait",
  VARIABLE_SET: "variable_set",
  VARIABLE_GET: "variable_get",
  FUNCTION_DEF: "function_def",
  FUNCTION_CALL: "function_call",
  SENSOR_VALUE: "sensor_value",
  MATH_EXPR: "math_expr",
  LOGIC_COMPARE: "logic_compare",
  LOGIC_OPERATION: "logic_operation",
  LOGIC_NEGATE: "logic_negate",
  SCENARIO_CONFIG: "scenario_config",
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export interface BaseNode {
  id: string;
  type: NodeType;
}

export interface CommandNode extends BaseNode {
  type: "command";
  command: Command;
}

export interface SequenceNode extends BaseNode {
  type: "sequence";
  children: ExecutableNode[];
}

export interface RepeatNode extends BaseNode {
  type: "repeat";
  times: number;
  body: ExecutableNode;
}

export interface ForLoopNode extends BaseNode {
  type: "for_loop";
  variable: string;
  from: number;
  to: number;
  by: number;
  body: ExecutableNode;
}

export interface IfNode extends BaseNode {
  type: "if";
  condition: ConditionNode;
  thenBranch: ExecutableNode;
}

export interface IfElseNode extends BaseNode {
  type: "if_else";
  condition: ConditionNode;
  thenBranch: ExecutableNode;
  elseBranch: ExecutableNode;
}

export interface WaitNode extends BaseNode {
  type: "wait";
  duration: number;
}

export interface WhileLoopNode extends BaseNode {
  type: "while_loop";
  condition: ConditionNode;
  body: ExecutableNode;
  maxIterations?: number;
}

export interface UntilLoopNode extends BaseNode {
  type: "until_loop";
  condition: ConditionNode;
  body: ExecutableNode;
  maxIterations?: number;
}

export interface VariableSetNode extends BaseNode {
  type: "variable_set";
  variableName: string;
  value: ValueNode;
}

export interface VariableGetNode extends BaseNode {
  type: "variable_get";
  variableName: string;
}

export interface FunctionDefNode extends BaseNode {
  type: "function_def";
  functionName: string;
  body: ExecutableNode;
}

export interface FunctionCallNode extends BaseNode {
  type: "function_call";
  functionName: string;
}

export interface SensorValueNode extends BaseNode {
  type: "sensor_value";
  sensorType: "battery" | "altitude" | "elapsed_time";
  droneId?: number;
}

export interface MathExprNode extends BaseNode {
  type: "math_expr";
  operator: "ADD" | "MINUS" | "MULTIPLY" | "DIVIDE";
  left: ValueNode;
  right: ValueNode;
}

export interface LogicCompareNode extends BaseNode {
  type: "logic_compare";
  operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE";
  left: ValueNode;
  right: ValueNode;
}

export interface LogicOperationNode extends BaseNode {
  type: "logic_operation";
  operator: "AND" | "OR";
  left: ConditionNode;
  right: ConditionNode;
}

export interface LogicNegateNode extends BaseNode {
  type: "logic_negate";
  operand: ConditionNode;
}

export interface ScenarioConfig {
  speed?: number;
}

export interface ScenarioConfigNode extends BaseNode {
  type: "scenario_config";
  config: ScenarioConfig;
}

export type ValueNode =
  | number
  | VariableGetNode
  | SensorValueNode
  | MathExprNode;

export type ConditionNode =
  | boolean
  | string
  | LogicCompareNode
  | LogicOperationNode
  | LogicNegateNode;

export type ExecutableNode =
  | CommandNode
  | SequenceNode
  | RepeatNode
  | ForLoopNode
  | WhileLoopNode
  | UntilLoopNode
  | IfNode
  | IfElseNode
  | WaitNode
  | VariableSetNode
  | VariableGetNode
  | FunctionDefNode
  | FunctionCallNode
  | ScenarioConfigNode;

export type ScenarioNode = ExecutableNode;
export type ScenarioPlan = ExecutableNode;

export interface ExecutionContext {
  variables: Map<string, number>;
  functions: Map<string, ExecutableNode>;
  callStack: string[];
  currentRepeatCount?: number;
  currentLoopVariable?: { name: string; value: number };
  executionStartTime?: number;
  speed?: number;
}

export interface ExecutionState {
  status: "idle" | "running" | "paused" | "completed" | "error";
  currentNodeId: string | null;
  currentNodePath: number[];
  error: string | null;
  context: ExecutionContext;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  executedNodes: number;
}

export interface ScenarioStep {
  id: string;
  label: string;
  depth: number;
  nodeType: ScenarioNode["type"];
}

export interface ScenarioSummary {
  totalNodes: number;
  commandNodes: number;
  maxDepth: number;
}

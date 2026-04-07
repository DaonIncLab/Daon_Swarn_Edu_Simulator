import type { DroneState } from "@/types/websocket";
import type {
  ConditionNode,
  ExecutionContext,
  LogicCompareNode,
  LogicNegateNode,
  LogicOperationNode,
  MathExprNode,
  SensorValueNode,
  ValueNode,
  VariableGetNode,
} from "@/types/execution";
import { log } from "@/utils/logger";

export interface ConditionResult {
  result: boolean;
  error?: string;
}

export class ConditionEvaluator {
  private droneStates: DroneState[];
  private context: ExecutionContext;

  constructor(droneStates: DroneState[], context: ExecutionContext) {
    this.droneStates = droneStates;
    this.context = context;
  }

  evaluate(condition: ConditionNode): ConditionResult {
    try {
      return { result: this.evaluateConditionNode(condition) };
    } catch (error) {
      log.error("ConditionEvaluator", "Error evaluating condition", {
        condition,
        error,
      });
      return {
        result: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  evaluateValue(value: ValueNode): number {
    if (typeof value === "number") {
      return value;
    }

    switch (value.type) {
      case "variable_get":
        return this.evaluateVariableGet(value);
      case "sensor_value":
        return this.evaluateSensorValue(value);
      case "math_expr":
        return this.evaluateMathExpr(value);
      default:
        return 0;
    }
  }

  private evaluateConditionNode(condition: ConditionNode): boolean {
    if (typeof condition === "boolean") {
      return condition;
    }

    if (typeof condition === "string") {
      return this.evaluateLegacyStringCondition(condition);
    }

    switch (condition.type) {
      case "logic_compare":
        return this.evaluateLogicCompare(condition);
      case "logic_operation":
        return this.evaluateLogicOperation(condition);
      case "logic_negate":
        return this.evaluateLogicNegate(condition);
      default:
        return false;
    }
  }

  private evaluateLegacyStringCondition(condition: string): boolean {
    const trimmed = condition.trim();

    if (trimmed === "all_connected") {
      return this.droneStates.length > 0 && this.droneStates.every((drone) => drone.isActive);
    }

    if (trimmed === "any_connected") {
      return this.droneStates.some((drone) => drone.isActive);
    }

    if (trimmed === "none_connected") {
      return this.droneStates.every((drone) => !drone.isActive);
    }

    const batteryMatch = trimmed.match(/^battery\s*([><=]+)\s*(\d+(?:\.\d+)?)$/);
    if (batteryMatch) {
      const averageBattery = this.getDroneValue(undefined, (drone) => drone.battery);
      return this.compareNumbers(
        averageBattery,
        batteryMatch[1],
        Number(batteryMatch[2]),
      );
    }

    const altitudeMatch = trimmed.match(/^altitude\s*([><=]+)\s*(\d+(?:\.\d+)?)$/);
    if (altitudeMatch) {
      const averageAltitude = this.getDroneValue(undefined, (drone) => drone.position.z);
      return this.compareNumbers(
        averageAltitude,
        altitudeMatch[1],
        Number(altitudeMatch[2]),
      );
    }

    const droneBatteryMatch = trimmed.match(
      /^drone_(\d+)_battery\s*([><=]+)\s*(\d+(?:\.\d+)?)$/,
    );
    if (droneBatteryMatch) {
      return this.compareNumbers(
        this.getDroneValue(Number(droneBatteryMatch[1]), (drone) => drone.battery),
        droneBatteryMatch[2],
        Number(droneBatteryMatch[3]),
      );
    }

    const droneAltitudeMatch = trimmed.match(
      /^drone_(\d+)_altitude\s*([><=]+)\s*(\d+(?:\.\d+)?)$/,
    );
    if (droneAltitudeMatch) {
      return this.compareNumbers(
        this.getDroneValue(Number(droneAltitudeMatch[1]), (drone) => drone.position.z),
        droneAltitudeMatch[2],
        Number(droneAltitudeMatch[3]),
      );
    }

    const elapsedTimeMatch = trimmed.match(
      /^elapsed_time\s*([><=]+)\s*(\d+(?:\.\d+)?)$/,
    );
    if (elapsedTimeMatch) {
      return this.compareNumbers(
        this.evaluateSensorValue({
          id: "elapsed_time",
          type: "sensor_value",
          sensorType: "elapsed_time",
        }),
        elapsedTimeMatch[1],
        Number(elapsedTimeMatch[2]),
      );
    }

    if (trimmed.includes(" AND ") || trimmed.includes(" && ")) {
      return trimmed.split(/\s+(?:AND|&&)\s+/).every((part) =>
        this.evaluateLegacyStringCondition(part),
      );
    }

    if (trimmed.includes(" OR ") || trimmed.includes(" || ")) {
      return trimmed.split(/\s+(?:OR|\|\|)\s+/).some((part) =>
        this.evaluateLegacyStringCondition(part),
      );
    }

    const variableMatch = trimmed.match(/^(\w+)\s*([><=]+)\s*(\d+(?:\.\d+)?)$/);
    if (variableMatch) {
      return this.compareNumbers(
        this.context.variables.get(variableMatch[1]) ?? 0,
        variableMatch[2],
        Number(variableMatch[3]),
      );
    }

    if (trimmed === "true") {
      return true;
    }
    if (trimmed === "false") {
      return false;
    }

    log.warn("ConditionEvaluator", "Unknown string condition", { condition });
    return false;
  }

  private evaluateVariableGet(node: VariableGetNode): number {
    return this.context.variables.get(node.variableName) ?? 0;
  }

  private evaluateSensorValue(node: SensorValueNode): number {
    switch (node.sensorType) {
      case "battery":
        return this.getDroneValue(node.droneId, (drone) => drone.battery);
      case "altitude":
        return this.getDroneValue(node.droneId, (drone) => drone.position.z);
      case "elapsed_time": {
        const startTime = this.context.executionStartTime;
        if (!startTime) {
          return 0;
        }
        return (Date.now() - startTime) / 1000;
      }
      default:
        return 0;
    }
  }

  private getDroneValue(
    droneId: number | undefined,
    selector: (drone: DroneState) => number,
  ): number {
    if (droneId !== undefined) {
      const target = this.droneStates.find((drone) => drone.id === droneId);
      return target ? selector(target) : 0;
    }

    if (this.droneStates.length === 0) {
      return 0;
    }

    const total = this.droneStates.reduce((sum, drone) => sum + selector(drone), 0);
    return total / this.droneStates.length;
  }

  private evaluateMathExpr(node: MathExprNode): number {
    const left = this.evaluateValue(node.left);
    const right = this.evaluateValue(node.right);

    switch (node.operator) {
      case "ADD":
        return left + right;
      case "MINUS":
        return left - right;
      case "MULTIPLY":
        return left * right;
      case "DIVIDE":
        return right === 0 ? 0 : left / right;
      default:
        return 0;
    }
  }

  private evaluateLogicCompare(node: LogicCompareNode): boolean {
    const left = this.evaluateValue(node.left);
    const right = this.evaluateValue(node.right);

    return this.compareNumbers(left, node.operator, right);
  }

  private compareNumbers(left: number, operator: string, right: number): boolean {
    switch (operator) {
      case "EQ":
        return left === right;
      case "NEQ":
        return left !== right;
      case "LT":
        return left < right;
      case "LTE":
        return left <= right;
      case "GT":
        return left > right;
      case "GTE":
        return left >= right;
      case "==":
      case "===":
        return left === right;
      case "!=":
      case "!==":
        return left !== right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      default:
        return false;
    }
  }

  private evaluateLogicOperation(node: LogicOperationNode): boolean {
    const left = this.evaluateConditionNode(node.left);
    if (node.operator === "AND") {
      return left && this.evaluateConditionNode(node.right);
    }
    return left || this.evaluateConditionNode(node.right);
  }

  private evaluateLogicNegate(node: LogicNegateNode): boolean {
    return !this.evaluateConditionNode(node.operand);
  }
}

export function evaluateCondition(
  condition: ConditionNode,
  droneStates: DroneState[],
  context: ExecutionContext,
): ConditionResult {
  const evaluator = new ConditionEvaluator(droneStates, context);
  return evaluator.evaluate(condition);
}

export function evaluateValueNode(
  value: ValueNode,
  droneStates: DroneState[],
  context: ExecutionContext,
): number {
  const evaluator = new ConditionEvaluator(droneStates, context);
  return evaluator.evaluateValue(value);
}

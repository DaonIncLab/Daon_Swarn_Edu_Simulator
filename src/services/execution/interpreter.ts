/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 실행 인터프리터
 * ExecutableNode 트리를 실제로 실행하는 엔진
 */

import {
  MAVLinkConnectionService,
  UnityWebGLConnectionService,
  type IConnectionService,
  type CommandBatchContext,
} from "@/services/connection";
import { CommandAction } from "@/constants/commands";
import type {
  ExecutableNode,
  ExecutionResult,
  ExecutionState,
  ScenarioConfigNode,
} from "@/types/execution";
import type { Command, CommandResponse, DroneState } from "@/types/websocket";
import { log } from "@/utils/logger";
import { evaluateCondition, evaluateValueNode } from "./conditionEvaluator";

/**
 * 실행 상태 변경 리스너
 */
export type ExecutionStateListener = (state: ExecutionState) => void;

/**
 * 실행 인터프리터
 */
export class Interpreter {
  private connectionService: IConnectionService;
  private droneStates: DroneState[];
  private state: ExecutionState;
  private stateListener: ExecutionStateListener | null = null;
  private shouldStop: boolean = false;
  private isPaused: boolean = false;
  private resumePromise: Promise<void> | null = null;
  private resumeResolver: (() => void) | null = null;
  private size: number | null = null;

  private static readonly MAVLINK_WAIT_UNSUPPORTED_ERROR =
    "WAIT nodes are not supported in MAVLink mission batches";

  constructor(connectionService: IConnectionService) {
    this.connectionService = connectionService;
    this.droneStates = [];
    this.state = {
      status: "idle",
      currentNodeId: null,
      currentNodePath: [],
      error: null,
      context: {
        variables: new Map(),
        functions: new Map(),
        callStack: [],
        speed: 2,
      },
    };
  }

  /**
   * 드론 상태 업데이트 (텔레메트리 데이터)
   */
  updateDroneStates(states: DroneState[]): void {
    this.droneStates = states;
  }

  /**
   * 상태 변경 리스너 등록
   */
  setStateListener(listener: ExecutionStateListener): void {
    this.stateListener = listener;
  }

  /**
   * 상태 업데이트 및 리스너 호출
   */
  private updateState(update: Partial<ExecutionState>): void {
    this.state = { ...this.state, ...update };
    this.stateListener?.(this.state);
  }

  /**
   * 트리 실행
   */
  async execute(tree: ExecutableNode): Promise<ExecutionResult> {
    log.info("Interpreter", "Starting execution", tree);

    // Reset execution flags
    this.shouldStop = false;
    this.isPaused = false;
    this.resumePromise = null;
    this.resumeResolver = null;

    this.updateState({
      status: "running",
      currentNodeId: null,
      currentNodePath: [],
      error: null,
      context: {
        variables: new Map(),
        functions: new Map(),
        callStack: [],
        executionStartTime: Date.now(),
        speed: 2,
      },
    });

    let executedNodes = 0;

    try {
      if (this.connectionService instanceof MAVLinkConnectionService) {
        executedNodes = await this.executeAsMAVLinkMission(tree);
      } else {
        executedNodes = await this.executeNode(tree, [0]);
      }

      if (this.shouldStop) {
        this.updateState({ status: "idle" });
        return {
          success: false,
          error: "Execution stopped by user",
          executedNodes,
        };
      }

      this.updateState({ status: "completed", currentNodeId: null });
      return { success: true, executedNodes };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      log.error("Interpreter", "Execution error:", error);
      this.updateState({ status: "error", error: errorMsg });
      return { success: false, error: errorMsg, executedNodes };
    }
  }

  private async executeAsMAVLinkMission(
    tree: ExecutableNode,
  ): Promise<number> {
    const plan = await this.buildCommandList(tree, [0]);

    if (this.shouldStop || plan.commands.length === 0) {
      return plan.executedNodes;
    }

    const response = await this.connectionService.sendCommands(plan.commands);
    if (!response.success) {
      throw new Error(`Command failed: ${response.error || "Unknown error"}`);
    }

    await this.delay(100);
    return plan.executedNodes;
  }

  /**
   * 실행 중단
   */
  stop(): void {
    log.info("Interpreter", "Stopping execution");
    this.shouldStop = true;
    this.updateState({ status: "idle" });
  }

  /**
   * 일시정지
   */
  pause(): void {
    if (this.state.status !== "running") {
      log.warn("Interpreter", "Cannot pause: not running");
      return;
    }

    log.info("Interpreter", "Pausing execution");
    this.isPaused = true;

    // Create a new promise that will be resolved when resume() is called
    this.resumePromise = new Promise((resolve) => {
      this.resumeResolver = resolve;
    });

    this.updateState({ status: "paused" });
  }

  /**
   * 재개
   */
  resume(): void {
    if (this.state.status !== "paused") {
      log.warn("Interpreter", "Cannot resume: not paused");
      return;
    }

    log.info("Interpreter", "Resuming execution");
    this.isPaused = false;

    // Resolve the pause promise to unblock execution
    if (this.resumeResolver) {
      this.resumeResolver();
      this.resumeResolver = null;
      this.resumePromise = null;
    }

    this.updateState({ status: "running" });
  }

  /**
   * Check if paused and wait until resumed
   */
  private async checkPause(): Promise<void> {
    if (this.isPaused && this.resumePromise) {
      await this.resumePromise;
    }
  }

  /**
   * 개별 노드 실행 (재귀적)
   */
  private async executeNode(
    node: ExecutableNode,
    path: number[],
  ): Promise<number> {
    // Check for stop signal
    if (this.shouldStop) {
      return 0;
    }
    // Check for pause and wait if paused
    await this.checkPause();

    this.updateState({ currentNodeId: node.id, currentNodePath: path });

    log.debug("Interpreter", `Executing node ${node.id} (type: ${node.type})`);

    if (node.type == "sequence") {
      this.size = node.children.length;
    }

    let executedCount = 1; // 현재 노드 포함

    switch (node.type) {
      case "command":
        await this.executeCommand(
          node,
          this.size,
          Number(node.id.substring(5)),
        );
        break;

      case "sequence":
        executedCount = await this.executeSequence(node, path);
        break;

      case "repeat":
        executedCount = await this.executeRepeat(node, path);
        break;

      case "for_loop":
        executedCount = await this.executeForLoop(node, path);
        break;

      case "while_loop":
        executedCount = await this.executeWhileLoop(node, path);
        break;

      case "until_loop":
        executedCount = await this.executeUntilLoop(node, path);
        break;

      case "if":
        executedCount = await this.executeIf(node, path);
        break;

      case "if_else":
        executedCount = await this.executeIfElse(node, path);
        break;

      case "wait":
        await this.executeWait(node);
        break;

      case "variable_set":
        await this.executeVariableSet(node);
        break;

      case "variable_get":
        // Variable get is a value node, shouldn't be executed as statement
        log.warn("Interpreter", "Variable get node used as statement");
        break;

      case "function_def":
        await this.executeFunctionDef(node);
        break;

      case "function_call":
        executedCount = await this.executeFunctionCall(node, path);
        break;

      case "scenario_config":
        await this.executeScenarioConfig(node);
        break;

      default:
        log.warn("Interpreter", "Unknown node type:", (node as any).type);
    }

    return executedCount;
  }

  private async buildCommandList(
    node: ExecutableNode,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    if (this.shouldStop) {
      return { commands: [], executedNodes: 0 };
    }

    await this.checkPause();

    this.updateState({ currentNodeId: node.id, currentNodePath: path });

    log.debug("Interpreter", `Planning node ${node.id} (type: ${node.type})`);

    switch (node.type) {
      case "command":
        return {
          commands: [this.applyScenarioContext(node.command)],
          executedNodes: 1,
        };

      case "sequence":
        return this.buildSequenceCommandList(node, path);

      case "repeat":
        return this.buildRepeatCommandList(node, path);

      case "for_loop":
        return this.buildForLoopCommandList(node, path);

      case "while_loop":
        return this.buildWhileLoopCommandList(node, path);

      case "until_loop":
        return this.buildUntilLoopCommandList(node, path);

      case "if":
        return this.buildIfCommandList(node, path);

      case "if_else":
        return this.buildIfElseCommandList(node, path);

      case "wait":
        throw new Error(Interpreter.MAVLINK_WAIT_UNSUPPORTED_ERROR);

      case "variable_set":
        await this.executeVariableSet(node);
        return { commands: [], executedNodes: 1 };

      case "variable_get":
        log.warn("Interpreter", "Variable get node used as statement");
        return { commands: [], executedNodes: 1 };

      case "function_def":
        await this.executeFunctionDef(node);
        return { commands: [], executedNodes: 1 };

      case "function_call":
        return this.buildFunctionCallCommandList(node, path);

      case "scenario_config":
        await this.executeScenarioConfig(node);
        return { commands: [], executedNodes: 1 };

      default:
        log.warn("Interpreter", "Unknown node type:", (node as any).type);
        return { commands: [], executedNodes: 1 };
    }
  }

  /**
   * 명령 노드 실행
   */
  private async executeCommand(
    node: any,
    size?: number,
    index?: number,
  ): Promise<void> {
    const originalCommand = node.command as Command;
    const command = this.applyScenarioContext(originalCommand);
    log.debug(
      "Interpreter",
      "Executing command:",
      command.action,
      command.params,
    );

    const batchContext: CommandBatchContext | undefined =
      typeof size === "number" && size > 0 && typeof index === "number"
        ? {
            index,
            total: size,
            isLast: index >= size,
          }
        : undefined;

    const response: CommandResponse = await this.connectionService.sendCommands(
      [command],
      batchContext,
    );

    if (!response.success) {
      throw new Error(`Command failed: ${response.error || "Unknown error"}`);
    }

    // 명령 완료 대기 (Unity 응답 시뮬레이션 - 실제로는 Unity에서 완료 신호를 받아야 함)
    await this.delay(100);
  }

  /**
   * 시퀀스 노드 실행
   */
  private async executeSequence(node: any, path: number[]): Promise<number> {
    let totalExecuted = 0;

    for (let i = 0; i < node.children.length; i++) {
      if (this.shouldStop) break;

      const child = node.children[i];
      const childPath = [...path, i];
      const executed = await this.executeNode(child, childPath);
      totalExecuted += executed;
    }

    return totalExecuted;
  }

  private async buildSequenceCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    const commands: Command[] = [];
    let executedNodes = 0;

    for (let i = 0; i < node.children.length; i++) {
      if (this.shouldStop) {
        break;
      }

      const childPlan = await this.buildCommandList(node.children[i], [...path, i]);
      commands.push(...childPlan.commands);
      executedNodes += childPlan.executedNodes;
    }

    return { commands, executedNodes };
  }

  /**
   * 반복 노드 실행
   */
  private async executeRepeat(node: any, path: number[]): Promise<number> {
    log.debug("Interpreter", `Repeating ${node.times} times`);

    let totalExecuted = 0;

    for (let i = 0; i < node.times; i++) {
      if (this.shouldStop) break;

      log.debug("Interpreter", `Repeat iteration ${i + 1}/${node.times}`);

      // 컨텍스트에 반복 횟수 저장
      const oldRepeatCount = this.state.context.currentRepeatCount;
      this.state.context.currentRepeatCount = i + 1;

      const childPath = [...path, i];
      const executed = await this.executeNode(node.body, childPath);
      totalExecuted += executed;

      // 복원
      this.state.context.currentRepeatCount = oldRepeatCount;
    }

    return totalExecuted;
  }

  private async buildRepeatCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    log.debug("Interpreter", `Planning repeat ${node.times} times`);

    const commands: Command[] = [];
    let executedNodes = 0;

    for (let i = 0; i < node.times; i++) {
      if (this.shouldStop) {
        break;
      }

      const oldRepeatCount = this.state.context.currentRepeatCount;
      this.state.context.currentRepeatCount = i + 1;

      const iterationPlan = await this.buildCommandList(node.body, [...path, i]);
      commands.push(...iterationPlan.commands);
      executedNodes += iterationPlan.executedNodes;

      this.state.context.currentRepeatCount = oldRepeatCount;
    }

    return { commands, executedNodes };
  }

  /**
   * For 루프 노드 실행
   */
  private async executeForLoop(node: any, path: number[]): Promise<number> {
    log.debug(
      "Interpreter",
      `For loop: ${node.variable} from ${node.from} to ${node.to} by ${node.by}`,
    );

    let totalExecuted = 0;
    const { variable, from, to, by } = node;

    const isIncrementing = by > 0;
    let loopIndex = 0;

    for (let i = from; isIncrementing ? i <= to : i >= to; i += by) {
      if (this.shouldStop) break;

      log.debug("Interpreter", `Loop variable ${variable} = ${i}`);

      // 변수를 컨텍스트에 설정
      this.state.context.variables.set(variable, i);
      this.state.context.currentLoopVariable = { name: variable, value: i };

      const childPath = [...path, loopIndex];
      const executed = await this.executeNode(node.body, childPath);
      totalExecuted += executed;

      loopIndex++;
    }

    // 변수 정리
    this.state.context.variables.delete(variable);
    this.state.context.currentLoopVariable = undefined;

    return totalExecuted;
  }

  private async buildForLoopCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    log.debug(
      "Interpreter",
      `Planning for loop: ${node.variable} from ${node.from} to ${node.to} by ${node.by}`,
    );

    const commands: Command[] = [];
    let executedNodes = 0;
    const { variable, from, to, by } = node;
    const isIncrementing = by > 0;
    let loopIndex = 0;

    for (let i = from; isIncrementing ? i <= to : i >= to; i += by) {
      if (this.shouldStop) {
        break;
      }

      this.state.context.variables.set(variable, i);
      this.state.context.currentLoopVariable = { name: variable, value: i };

      const loopPlan = await this.buildCommandList(node.body, [...path, loopIndex]);
      commands.push(...loopPlan.commands);
      executedNodes += loopPlan.executedNodes;

      loopIndex++;
    }

    this.state.context.variables.delete(variable);
    this.state.context.currentLoopVariable = undefined;

    return { commands, executedNodes };
  }

  /**
   * If 노드 실행
   */
  private async executeIf(node: any, path: number[]): Promise<number> {
    log.debug("Interpreter", `Evaluating condition: ${node.condition}`);

    const conditionResult = evaluateCondition(
      node.condition,
      this.droneStates,
      this.state.context,
    );

    if (conditionResult.error) {
      log.warn(
        "Interpreter",
        "Condition evaluation error:",
        conditionResult.error,
      );
    }

    log.debug("Interpreter", `Condition result: ${conditionResult.result}`);

    if (conditionResult.result) {
      const childPath = [...path, 0];
      return await this.executeNode(node.thenBranch, childPath);
    }

    return 0;
  }

  private async buildIfCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    log.debug("Interpreter", `Evaluating condition: ${node.condition}`);

    const conditionResult = evaluateCondition(
      node.condition,
      this.droneStates,
      this.state.context,
    );

    if (conditionResult.error) {
      log.warn(
        "Interpreter",
        "Condition evaluation error:",
        conditionResult.error,
      );
    }

    if (!conditionResult.result) {
      return { commands: [], executedNodes: 0 };
    }

    return this.buildCommandList(node.thenBranch, [...path, 0]);
  }

  /**
   * If-Else 노드 실행
   */
  private async executeIfElse(node: any, path: number[]): Promise<number> {
    log.debug("Interpreter", `Evaluating condition: ${node.condition}`);

    const conditionResult = evaluateCondition(
      node.condition,
      this.droneStates,
      this.state.context,
    );

    if (conditionResult.error) {
      log.warn(
        "Interpreter",
        "Condition evaluation error:",
        conditionResult.error,
      );
    }

    log.debug("Interpreter", `Condition result: ${conditionResult.result}`);

    if (conditionResult.result) {
      const childPath = [...path, 0];
      return await this.executeNode(node.thenBranch, childPath);
    } else {
      const childPath = [...path, 1];
      return await this.executeNode(node.elseBranch, childPath);
    }
  }

  private async buildIfElseCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    log.debug("Interpreter", `Evaluating condition: ${node.condition}`);

    const conditionResult = evaluateCondition(
      node.condition,
      this.droneStates,
      this.state.context,
    );

    if (conditionResult.error) {
      log.warn(
        "Interpreter",
        "Condition evaluation error:",
        conditionResult.error,
      );
    }

    if (conditionResult.result) {
      return this.buildCommandList(node.thenBranch, [...path, 0]);
    }

    return this.buildCommandList(node.elseBranch, [...path, 1]);
  }

  /**
   * 대기 노드 실행
   */
  private async executeWait(node: any): Promise<void> {
    if (this.connectionService instanceof UnityWebGLConnectionService) {
      await this.executeCommand(
        {
          id: node,
          type: "command",
          command: {
            action: "wait",
            params: { duration: node.duration },
          },
        },
        this.size,
        Number(node.id.substring(5)),
      );

      return;
    }
    log.debug("Interpreter", `Waiting ${node.duration} seconds`);
    await this.delay(node.duration * 1000);
  }

  /**
   * While 루프 노드 실행 (Phase 6-A)
   */
  private async executeWhileLoop(node: any, path: number[]): Promise<number> {
    log.debug(
      "Interpreter",
      `While loop: ${node.condition} (max ${node.maxIterations} iterations)`,
    );

    let totalExecuted = 0;
    let iteration = 0;
    const maxIterations = node.maxIterations || 1000;

    while (iteration < maxIterations) {
      if (this.shouldStop) break;

      // 조건 평가
      const conditionResult = evaluateCondition(
        node.condition,
        this.droneStates,
        this.state.context,
      );

      if (conditionResult.error) {
        log.warn(
          "Interpreter",
          "While condition error:",
          conditionResult.error,
        );
        break;
      }

      if (!conditionResult.result) {
        log.debug("Interpreter", "While condition false, exiting loop");
        break;
      }

      log.debug("Interpreter", `While iteration ${iteration + 1}`);

      const childPath = [...path, iteration];
      const executed = await this.executeNode(node.body, childPath);
      totalExecuted += executed;

      iteration++;
    }

    if (iteration >= maxIterations) {
      log.warn(
        "Interpreter",
        `While loop reached max iterations (${maxIterations})`,
      );
    }

    return totalExecuted;
  }

  private async buildWhileLoopCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    const commands: Command[] = [];
    let executedNodes = 0;
    let iteration = 0;
    const maxIterations = node.maxIterations || 1000;

    while (iteration < maxIterations) {
      if (this.shouldStop) {
        break;
      }

      const conditionResult = evaluateCondition(
        node.condition,
        this.droneStates,
        this.state.context,
      );

      if (conditionResult.error) {
        log.warn(
          "Interpreter",
          "While condition error:",
          conditionResult.error,
        );
        break;
      }

      if (!conditionResult.result) {
        break;
      }

      const loopPlan = await this.buildCommandList(node.body, [...path, iteration]);
      commands.push(...loopPlan.commands);
      executedNodes += loopPlan.executedNodes;
      iteration++;
    }

    if (iteration >= maxIterations) {
      log.warn(
        "Interpreter",
        `While loop reached max iterations (${maxIterations})`,
      );
    }

    return { commands, executedNodes };
  }

  /**
   * Repeat Until 루프 노드 실행 (Phase 6-A)
   */
  private async executeUntilLoop(node: any, path: number[]): Promise<number> {
    log.debug(
      "Interpreter",
      `Repeat Until loop: ${node.condition} (max ${node.maxIterations} iterations)`,
    );

    let totalExecuted = 0;
    let iteration = 0;
    const maxIterations = node.maxIterations || 1000;

    while (iteration < maxIterations) {
      if (this.shouldStop) break;

      log.debug("Interpreter", `Until iteration ${iteration + 1}`);

      // 먼저 본문 실행
      const childPath = [...path, iteration];
      const executed = await this.executeNode(node.body, childPath);
      totalExecuted += executed;

      // 조건 평가 (참이면 종료)
      const conditionResult = evaluateCondition(
        node.condition,
        this.droneStates,
        this.state.context,
      );

      if (conditionResult.error) {
        log.warn(
          "Interpreter",
          "Until condition error:",
          conditionResult.error,
        );
        break;
      }

      if (conditionResult.result) {
        log.debug("Interpreter", "Until condition true, exiting loop");
        break;
      }

      iteration++;
    }

    if (iteration >= maxIterations) {
      log.warn(
        "Interpreter",
        `Until loop reached max iterations (${maxIterations})`,
      );
    }

    return totalExecuted;
  }

  private async buildUntilLoopCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    const commands: Command[] = [];
    let executedNodes = 0;
    let iteration = 0;
    const maxIterations = node.maxIterations || 1000;

    while (iteration < maxIterations) {
      if (this.shouldStop) {
        break;
      }

      const loopPlan = await this.buildCommandList(node.body, [...path, iteration]);
      commands.push(...loopPlan.commands);
      executedNodes += loopPlan.executedNodes;

      const conditionResult = evaluateCondition(
        node.condition,
        this.droneStates,
        this.state.context,
      );

      if (conditionResult.error) {
        log.warn(
          "Interpreter",
          "Until condition error:",
          conditionResult.error,
        );
        break;
      }

      if (conditionResult.result) {
        break;
      }

      iteration++;
    }

    if (iteration >= maxIterations) {
      log.warn(
        "Interpreter",
        `Until loop reached max iterations (${maxIterations})`,
      );
    }

    return { commands, executedNodes };
  }

  /**
   * 변수 설정 노드 실행 (Phase 6-A)
   */
  private async executeVariableSet(node: any): Promise<void> {
    const resolvedValue = evaluateValueNode(
      node.value,
      this.droneStates,
      this.state.context,
    );
    log.debug(
      "Interpreter",
      `Setting variable ${node.variableName} = ${resolvedValue}`,
    );
    this.state.context.variables.set(node.variableName, resolvedValue);
  }

  /**
   * 함수 정의 노드 실행 (Phase 6-A)
   */
  private async executeFunctionDef(node: any): Promise<void> {
    log.debug("Interpreter", `Defining function: ${node.functionName}`);
    this.state.context.functions.set(node.functionName, node.body);
  }

  /**
   * 함수 호출 노드 실행 (Phase 6-A)
   */
  private async executeFunctionCall(
    node: any,
    path: number[],
  ): Promise<number> {
    const functionName = node.functionName;
    log.debug("Interpreter", `Calling function: ${functionName}`);

    // 함수 존재 확인
    const functionBody = this.state.context.functions.get(functionName);
    if (!functionBody) {
      throw new Error(`Function '${functionName}' is not defined`);
    }

    // 재귀 호출 방지 (최대 깊이 10)
    const MAX_CALL_DEPTH = 10;
    if (this.state.context.callStack.length >= MAX_CALL_DEPTH) {
      throw new Error(
        `Maximum function call depth (${MAX_CALL_DEPTH}) exceeded`,
      );
    }

    // 호출 스택에 추가
    this.state.context.callStack.push(functionName);

    try {
      // 함수 본문 실행
      const childPath = [...path, 0];
      const executed = await this.executeNode(functionBody, childPath);

      return executed;
    } finally {
      // 호출 스택에서 제거
      this.state.context.callStack.pop();
    }
  }

  private async buildFunctionCallCommandList(
    node: any,
    path: number[],
  ): Promise<{ commands: Command[]; executedNodes: number }> {
    const functionName = node.functionName;
    const functionBody = this.state.context.functions.get(functionName);

    if (!functionBody) {
      throw new Error(`Function '${functionName}' is not defined`);
    }

    const MAX_CALL_DEPTH = 10;
    if (this.state.context.callStack.length >= MAX_CALL_DEPTH) {
      throw new Error(
        `Maximum function call depth (${MAX_CALL_DEPTH}) exceeded`,
      );
    }

    this.state.context.callStack.push(functionName);

    try {
      return await this.buildCommandList(functionBody, [...path, 0]);
    } finally {
      this.state.context.callStack.pop();
    }
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeScenarioConfig(node: ScenarioConfigNode): Promise<void> {
    if (typeof node.config.speed === "number") {
      this.state.context.speed = node.config.speed;
      log.debug("Interpreter", "Scenario speed updated", {
        speed: this.state.context.speed,
      });
    }
  }

  private applyScenarioContext(command: Command): Command {
    const speed = this.state.context.speed ?? 2;
    if (
      command.action !== CommandAction.MOVE_DRONE &&
      command.action !== CommandAction.MOVE_DIRECTION &&
      command.action !== CommandAction.MOVE_DIRECTION_ALL
    ) {
      return command;
    }

    if (typeof command.params.speed === "number") {
      return command;
    }

    return {
      ...command,
      params: {
        ...command.params,
        speed,
      },
    };
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): ExecutionState {
    return this.state;
  }
}

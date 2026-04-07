/**
 * 연결 관리자 (Strategy Pattern)
 *
 * 다양한 연결 모드(Unity, MAVLink, Test)를 통합 관리하며,
 * 런타임에 연결 방식을 동적으로 전환할 수 있습니다.
 */

import type { Command } from "@/types/blockly";
import type { IConnectionService } from "./IConnectionService";
import type {
  CommandBatchContext,
  ConnectionConfig,
  ConnectionMode,
  ConnectionEventListeners,
  CommandResponse,
} from "./types";
import { UnityWebGLConnectionService } from "./UnityWebGLConnectionService";
import { MAVLinkConnectionService } from "./MAVLinkConnectionService";
import { TestConnectionService } from "./TestConnectionService";
import { ConnectionStatus } from "@/constants/connection";
import { log } from "@/utils/logger";

/**
 * 연결 관리자
 *
 * Strategy Pattern을 사용하여 다양한 연결 서비스를 관리합니다.
 */
export class ConnectionManager {
  private currentService: IConnectionService | null = null;
  private currentMode: ConnectionMode | null = null;
  private config: ConnectionConfig | null = null;
  private listeners: ConnectionEventListeners | null = null;

  /**
   * 연결 설정 및 시작
   */
  async connect(config: ConnectionConfig): Promise<void> {
    // 기존 연결이 있으면 완전히 종료

    if (this.currentService) {
      log.info(
        "ConnectionManager",
        "Cleaning up previous connection before new connect"
      );
      await this.disconnect();
    }

    // 모드에 따라 적절한 서비스 선택 (config 전달)
    this.currentService = this._createService(config.mode, config);
    this.currentMode = config.mode;
    this.config = config;

    // 이벤트 리스너 전달
    this.propagateEventListeners();

    // 연결 시작
    await this.currentService.connect(config);
  }

  /**
   * 이벤트 리스너를 현재 활성 서비스에 전달
   */
  private propagateEventListeners(): void {
    if (this.currentService && this.listeners) {
      this.currentService.setEventListeners(this.listeners);
    }
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    if (this.currentService) {
      log.info("ConnectionManager", "Disconnecting and cleaning up service");
      await this.currentService.disconnect();
      this.currentService.cleanup();

      // Explicitly null out service reference
      this.currentService = null;
    }

    // Clear all connection state
    this.currentMode = null;
    this.config = null;
    // Note: listeners are kept so they can be reused on reconnect
    // If you want to clear listeners too, uncomment:
    // this.listeners = null
  }

  /**
   * 명령 리스트 전송
   */
  async sendCommands(
    commands: Command[],
    context?: CommandBatchContext,
  ): Promise<CommandResponse> {
    if (!this.currentService) {
      return {
        success: false,
        error: "No active connection",
        timestamp: Date.now(),
      };
    }

    return this.currentService.sendCommands(commands, context);
  }

  /**
   * 비상 정지
   */
  async emergencyStop(): Promise<CommandResponse> {
    if (!this.currentService) {
      return {
        success: false,
        error: "No active connection",
        timestamp: Date.now(),
      };
    }

    return this.currentService.emergencyStop();
  }

  /**
   * 드론 위치 및 상태 초기화
   */
  async reset(): Promise<CommandResponse> {
    if (!this.currentService) {
      return {
        success: false,
        error: "No active connection",
        timestamp: Date.now(),
      };
    }

    return this.currentService.reset();
  }

  /**
   * 현재 연결 서비스 가져오기
   */
  getCurrentService(): IConnectionService | null {
    return this.currentService;
  }

  /**
   * 현재 연결 서비스 가져오기 (별칭)
   */
  getService(): IConnectionService | null {
    return this.currentService;
  }

  /**
   * 현재 연결 상태 조회
   */
  getStatus(): ConnectionStatus {
    if (!this.currentService) {
      return ConnectionStatus.DISCONNECTED;
    }

    return this.currentService.getStatus();
  }

  /**
   * 연결 여부 확인
   */
  isConnected(): boolean {
    return this.currentService?.isConnected() ?? false;
  }

  /**
   * 현재 연결 모드 조회
   */
  getCurrentMode(): ConnectionMode | null {
    return this.currentMode;
  }

  /**
   * 이벤트 리스너 등록
   */
  setEventListeners(listeners: ConnectionEventListeners): void {
    this.listeners = listeners;
    this.currentService?.setEventListeners(listeners);
  }

  /**
   * Set message listener (for services that support it like TestConnectionService)
   */
  setMessageListener(listener: (message: unknown) => void): void {
    if (this.currentService && "setMessageListener" in this.currentService) {
      const serviceWithListener = this.currentService as IConnectionService & {
        setMessageListener: (listener: (message: unknown) => void) => void;
      };
      serviceWithListener.setMessageListener(listener);
    }
  }

  /**
   * 핑 테스트
   */
  async ping(): Promise<number> {
    if (!this.currentService) {
      throw new Error("No active connection");
    }

    return this.currentService.ping();
  }

  /**
   * 연결 모드 전환 (재연결 필요)
   */
  async switchMode(newConfig: ConnectionConfig): Promise<void> {
    log.info(
      "ConnectionManager",
      `Switching mode from ${this.currentMode} to ${newConfig.mode}`
    );

    await this.disconnect();
    await this.connect(newConfig);
  }

  /**
   * 클린업 (완전한 정리)
   */
  cleanup(): void {
    log.info("ConnectionManager", "Complete cleanup");

    if (this.currentService) {
      this.currentService.cleanup();
      this.currentService = null;
    }

    // Clear all state
    this.currentMode = null;
    this.config = null;
    this.listeners = null;
  }

  // Private methods

  /**
   * 모드에 따라 적절한 연결 서비스 생성
   */
  private _createService(
    mode: ConnectionMode,
    config?: ConnectionConfig
  ): IConnectionService {
    switch (mode) {
      case "unity":
        log.info("ConnectionManager", "Creating Unity WebGL service");
        return new UnityWebGLConnectionService();

      case "mavlink":
        log.info("ConnectionManager", "Creating MAVLink Real Drone service");
        return new MAVLinkConnectionService(1);

      case "test": {
        const droneCount = config?.test?.droneCount || 4;
        log.info(
          "ConnectionManager",
          "Creating Test service with",
          droneCount,
          "drones"
        );
        return new TestConnectionService(droneCount);
      }

      default:
        throw new Error(`Unsupported connection mode: ${mode}`);
    }
  }
}

// Singleton 인스턴스
let connectionManagerInstance: ConnectionManager | null = null;

/**
 * ConnectionManager 싱글톤 인스턴스 획득
 */
export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}

/**
 * ConnectionManager 싱글톤 인스턴스 초기화
 */
export function resetConnectionManager(): void {
  if (connectionManagerInstance) {
    connectionManagerInstance.cleanup();
    connectionManagerInstance = null;
  }
}

/**
 * 연결 서비스 공통 타입 정의
 */

import type { ConnectionStatus } from "@/constants/connection";

/**
 * 연결 모드
 */
export const ConnectionMode = {
  /** Unity WebGL 임베드 모드 (클라이언트 내장) */
  UNITY: "unity",
  /** 실제 드론 MAVLink 연동 */
  MAVLINK: "mavlink",
  /** 테스트/더미 모드 */
  TEST: "test",
} as const;

export type ConnectionMode =
  (typeof ConnectionMode)[keyof typeof ConnectionMode];

/**
 * 연결 설정
 */
export interface ConnectionConfig {
  mode: ConnectionMode;

  // Unity WebGL 설정 (임베드 모드)
  unityWebGL?: {
    loaderUrl: string;
    dataUrl: string;
    frameworkUrl: string;
    codeUrl: string;
  };

  // MAVLink 설정 (실제 드론)
  mavlink?: {
    transportType?: "udp" | "serial" | "tcp";
    device?: string;
    baudRate?: number;
    host?: string;
    port?: number;
  };

  // Test 모드 설정
  test?: {
    droneCount?: number;
  };
}

/**
 * 수신 메시지 타입
 */
export interface ReceivedMessage {
  type:
    | "init"
    | "telemetry"
    | "ack"
    | "error"
    | "command_finish"
    | "log"
    | "complete";
  timestamp: number;
  data: unknown;
}

/**
 * 텔레메트리 데이터
 */
export interface TelemetryData {
  droneId?: string | number;
  position?: { x: number; y: number; z: number };
  altitude?: number;
  velocity?: { vx: number; vy: number; vz: number };
  battery?: number;
  flightMode?: string;
  isArmed?: boolean;
  timestamp: number;
}

/**
 * 명령 응답
 */
export interface CommandResponse {
  success: boolean;
  commandId?: string;
  error?: string;
  timestamp: number;
}

/**
 * 명령 배치 실행 문맥
 */
export interface CommandBatchContext {
  index: number;
  total: number;
  isLast: boolean;
}

/**
 * 연결 이벤트 리스너
 */
export interface ConnectionEventListeners {
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessage?: (message: ReceivedMessage) => void;
  onTelemetry?: (data: TelemetryData) => void;
  onError?: (error: string) => void;
  onLog?: (log: string) => void;
}

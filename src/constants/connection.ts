/**
 * WebSocket 연결 관련 상수
 */

// 연결 상태
export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus]

// WebSocket 기본 설정
export const WS_CONFIG = {
  RECONNECT_INTERVAL: 3000, // 재연결 시도 간격 (ms)
  MAX_RECONNECT_ATTEMPTS: 5, // 최대 재연결 시도 횟수
  PING_INTERVAL: 30000, // 핑 전송 간격 (ms)
  CONNECTION_TIMEOUT: 10000, // 연결 타임아웃 (ms)
} as const

// 기본 포트
export const DEFAULT_WS_PORT = 8080

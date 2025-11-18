/**
 * Unity WebGL 관련 타입 정의
 */

/**
 * Unity WebGL 빌드 설정
 */
export interface UnityBuildConfig {
  loaderUrl: string
  dataUrl: string
  frameworkUrl: string
  codeUrl: string
}

/**
 * Unity → React 메시지
 */
export interface UnityToReactMessage {
  type: 'init' | 'telemetry' | 'command_finish' | 'error' | 'log'
  data: unknown
  timestamp: number
}

/**
 * React → Unity 메시지
 */
export interface ReactToUnityMessage {
  type: 'request_init' | 'execute_script' | 'emergency_stop' | 'config'
  data: unknown
  timestamp: number
}

/**
 * Unity 초기화 응답 데이터
 */
export interface UnityInitData {
  droneCount: number
  positions?: Array<{ x: number; y: number; z: number }>
  config?: Record<string, unknown>
}

/**
 * Unity 로드 진행 상태
 */
export interface UnityLoadingProgress {
  progress: number // 0.0 ~ 1.0
  stage: 'downloading' | 'loading' | 'ready' | 'error'
  message?: string
}

/**
 * Unity Bridge 인터페이스
 * useUnityBridge hook의 반환 타입
 */
export interface UnityBridge {
  isReady: boolean
  loadingProgress: number
  sendToUnity: (message: ReactToUnityMessage) => boolean
  executeCommands: (commands: unknown[]) => boolean
  emergencyStop: () => boolean
  unload: () => Promise<void>
  unityProvider: unknown
}

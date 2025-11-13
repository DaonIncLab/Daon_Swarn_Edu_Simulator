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
  type: 'telemetry' | 'command_finish' | 'error' | 'log'
  data: unknown
  timestamp: number
}

/**
 * React → Unity 메시지
 */
export interface ReactToUnityMessage {
  type: 'execute_script' | 'emergency_stop' | 'config'
  data: unknown
  timestamp: number
}

/**
 * Unity 로드 진행 상태
 */
export interface UnityLoadingProgress {
  progress: number // 0.0 ~ 1.0
  stage: 'downloading' | 'loading' | 'ready' | 'error'
  message?: string
}

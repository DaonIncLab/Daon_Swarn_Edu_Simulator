/**
 * Unity WebGL ↔ React 브릿지 Hook
 *
 * Unity와 React 간의 양방향 통신을 담당합니다.
 */

import { useEffect, useCallback, useState } from 'react'
import { useUnityContext } from 'react-unity-webgl'
import type { UnityBuildConfig, UnityToReactMessage, ReactToUnityMessage } from '@/types/unity'

interface UseUnityBridgeProps {
  buildConfig: UnityBuildConfig
  onMessage?: (message: UnityToReactMessage) => void
  onReady?: () => void
  onError?: (error: string) => void
}

/**
 * Unity WebGL 브릿지 Hook
 */
export function useUnityBridge({
  buildConfig,
  onMessage,
  onReady,
  onError,
}: UseUnityBridgeProps) {
  const [isReady, setIsReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Unity Context 초기화
  const {
    unityProvider,
    isLoaded,
    loadingProgression,
    sendMessage,
    addEventListener,
    removeEventListener,
    unload,
  } = useUnityContext({
    loaderUrl: buildConfig.loaderUrl,
    dataUrl: buildConfig.dataUrl,
    frameworkUrl: buildConfig.frameworkUrl,
    codeUrl: buildConfig.codeUrl,
  })

  // 로딩 진행 상태 업데이트
  useEffect(() => {
    setLoadingProgress(loadingProgression)
  }, [loadingProgression])

  // Unity 로드 완료 시
  useEffect(() => {
    if (isLoaded) {
      console.log('[UnityBridge] Unity WebGL loaded successfully')
      setIsReady(true)
      onReady?.()
    }
  }, [isLoaded, onReady])

  /**
   * Unity에 메시지 전송
   * @param message React → Unity 메시지
   */
  const sendToUnity = useCallback(
    (message: ReactToUnityMessage) => {
      if (!isLoaded) {
        console.warn('[UnityBridge] Unity not loaded yet')
        return false
      }

      try {
        // Unity의 GameManager 오브젝트의 ReceiveMessage 메서드 호출
        sendMessage('GameManager', 'ReceiveMessage', JSON.stringify(message))
        console.log('[UnityBridge] Message sent to Unity:', message.type)
        return true
      } catch (error) {
        console.error('[UnityBridge] Failed to send message to Unity:', error)
        onError?.(`Failed to send message: ${error}`)
        return false
      }
    },
    [isLoaded, sendMessage, onError]
  )

  /**
   * Unity로부터 메시지 수신
   */
  const handleUnityMessage = useCallback(
    (messageJson: string) => {
      try {
        const message: UnityToReactMessage = JSON.parse(messageJson)
        console.log('[UnityBridge] Message received from Unity:', message.type)
        onMessage?.(message)
      } catch (error) {
        console.error('[UnityBridge] Failed to parse Unity message:', error)
        onError?.(`Failed to parse Unity message: ${error}`)
      }
    },
    [onMessage, onError]
  )

  // Unity 이벤트 리스너 등록
  useEffect(() => {
    // Unity → React 메시지 수신 이벤트
    addEventListener('OnMessageToReact', handleUnityMessage)

    return () => {
      removeEventListener('OnMessageToReact', handleUnityMessage)
    }
  }, [addEventListener, removeEventListener, handleUnityMessage])

  /**
   * 명령 전송 (편의 함수)
   */
  const executeCommands = useCallback(
    (commands: unknown[]) => {
      return sendToUnity({
        type: 'execute_script',
        data: { commands },
        timestamp: Date.now(),
      })
    },
    [sendToUnity]
  )

  /**
   * 비상 정지 (편의 함수)
   */
  const emergencyStop = useCallback(() => {
    return sendToUnity({
      type: 'emergency_stop',
      data: {},
      timestamp: Date.now(),
    })
  }, [sendToUnity])

  return {
    unityProvider,
    isReady,
    loadingProgress,
    sendToUnity,
    executeCommands,
    emergencyStop,
    unload,
  }
}

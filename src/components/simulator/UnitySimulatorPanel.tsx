/**
 * Unity Simulator Panel
 *
 * Unity WebGL 모드일 때 시뮬레이터를 표시하는 패널
 */

import { useEffect } from 'react'
import { UnityWebGLEmbed } from './UnityWebGLEmbed'
import { useUnityBridge } from '@/hooks/useUnityBridge'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { getConnectionManager } from '@/services/connection'
import type { UnityWebGLConnectionService } from '@/services/connection/UnityWebGLConnectionService'

// Unity 빌드 설정 (실제 빌드 파일 경로)
const UNITY_BUILD_CONFIG = {
  loaderUrl: '/unity/Build/DroneSwarmSim.loader.js',
  dataUrl: '/unity/Build/DroneSwarmSim.data',
  frameworkUrl: '/unity/Build/DroneSwarmSim.framework.js',
  codeUrl: '/unity/Build/DroneSwarmSim.wasm',
}

export function UnitySimulatorPanel() {
  const { setStatus, setError } = useConnectionStore()

  // Unity 브릿지 초기화
  const unityBridge = useUnityBridge({
    buildConfig: UNITY_BUILD_CONFIG,
    onMessage: (message) => {
      console.log('[UnitySimulatorPanel] Message from Unity:', message)

      // Unity 메시지를 ConnectionService로 전달
      const manager = getConnectionManager()
      const service = (manager as any).currentService as UnityWebGLConnectionService | null

      if (service && 'handleUnityMessage' in service) {
        service.handleUnityMessage(message)
      }
    },
    onReady: () => {
      console.log('[UnitySimulatorPanel] Unity WebGL ready')

      // Unity 브릿지를 ConnectionService에 주입
      const manager = getConnectionManager()
      const service = (manager as any).currentService as UnityWebGLConnectionService | null

      if (service && 'setUnityBridge' in service) {
        service.setUnityBridge(unityBridge)
      }
    },
    onError: (error) => {
      console.error('[UnitySimulatorPanel] Unity error:', error)
      setError(error)
    },
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Unity Simulator
      </h2>

      {/* Unity WebGL Embed */}
      <UnityWebGLEmbed
        unityProvider={unityBridge.unityProvider}
        isReady={unityBridge.isReady}
        loadingProgress={unityBridge.loadingProgress}
        height="600px"
      />

      {/* Simulator Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Loading Progress:</span>
          <span className="font-mono font-semibold text-gray-900">
            {Math.round(unityBridge.loadingProgress * 100)}%
          </span>
        </div>
        {unityBridge.isReady && (
          <div className="mt-2 text-xs text-success">
            ✓ Unity simulator is ready to receive commands
          </div>
        )}
      </div>

      {/* Unity Controls (Future) */}
      {unityBridge.isReady && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => unityBridge.emergencyStop()}
            className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger-dark transition-colors"
          >
            🛑 Emergency Stop
          </button>
        </div>
      )}
    </div>
  )
}

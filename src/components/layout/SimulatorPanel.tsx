/**
 * Simulator Panel Component
 *
 * Right panel that displays:
 * - Unity WebGL simulator (when in Unity WebGL mode)
 * - 3D Preview using Three.js (when in Test mode)
 * - Connection info (when in WebSocket mode)
 */

import { useConnectionStore } from '@/stores/useConnectionStore'
import { ConnectionMode } from '@/constants/connection'
import { UnitySimulatorPanel } from '@/components/simulator/UnitySimulatorPanel'
import { Drone3DView } from '@/components/visualization/Drone3DView'

interface SimulatorPanelProps {
  className?: string
}

export function SimulatorPanel({ className = '' }: SimulatorPanelProps) {
  const { mode } = useConnectionStore()

  return (
    <div className={`flex flex-col bg-gray-900 ${className}`}>
      {/* Conditional Rendering based on Connection Mode */}
      {mode === ConnectionMode.UNITY_WEBGL ? (
        // Unity WebGL Embedded Simulator
        <UnitySimulatorPanel />
      ) : mode === ConnectionMode.TEST ? (
        // 3D Preview for Test Mode
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-3 bg-gray-800 text-white border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">3D 미리보기</h3>
                <span className="px-2 py-1 bg-purple-600 text-xs font-medium rounded">
                  Test Mode
                </span>
              </div>
              <p className="text-sm text-gray-400">
                실시간 드론 위치 시각화
              </p>
            </div>
          </div>

          {/* 3D View */}
          <div className="flex-1">
            <Drone3DView />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-800 text-white border-t border-gray-700 flex items-center justify-between text-xs flex-shrink-0">
            <span className="text-gray-400">
              카메라: 마우스 드래그 / 휠 줌
            </span>
            <span className="text-gray-400">
              Three.js • React Three Fiber
            </span>
          </div>
        </div>
      ) : (
        // WebSocket Mode - External Unity Info
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-gray-500 mb-6">
              <svg
                className="w-20 h-20 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              외부 Unity 시뮬레이터
            </h3>
            <p className="text-gray-400 mb-6 text-sm">
              WebSocket 모드에서는 Unity가 별도 창에서 실행됩니다
            </p>

            {/* Info Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
              <h4 className="text-sm font-semibold text-white mb-2">
                📌 Unity 실행 방법
              </h4>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Unity Control Server 프로젝트 열기</li>
                <li>Unity Editor에서 Play 버튼 클릭</li>
                <li>표시된 IP 주소 확인</li>
                <li>설정에서 해당 IP로 연결</li>
              </ol>
            </div>

            <div className="mt-6 bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 text-left">
              <p className="text-xs text-blue-300">
                💡 <strong>Tip:</strong> 브라우저에서 바로 시뮬레이터를 보려면{' '}
                <strong>Unity WebGL</strong> 모드를 사용하세요
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

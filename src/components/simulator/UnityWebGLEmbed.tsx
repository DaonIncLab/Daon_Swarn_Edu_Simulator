/**
 * Unity WebGL Embed 컴포넌트
 *
 * Unity WebGL 빌드를 React 앱에 임베드하고,
 * 로딩 상태 UI를 제공합니다.
 */

import { Unity } from 'react-unity-webgl'
import type { UnityProvider } from 'react-unity-webgl'

interface UnityWebGLEmbedProps {
  unityProvider: UnityProvider
  isReady: boolean
  loadingProgress: number
  width?: string
  height?: string
}

export function UnityWebGLEmbed({
  unityProvider,
  isReady,
  loadingProgress,
  width = '100%',
  height = '600px',
}: UnityWebGLEmbedProps) {
  const progressPercent = Math.round(loadingProgress * 100)

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Unity Canvas */}
      <div className={`w-full h-full ${!isReady ? 'hidden' : ''}`}>
        <Unity
          unityProvider={unityProvider}
          style={{
            width,
            height,
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
      </div>

      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 border border-gray-300 rounded-lg">
          {/* Unity Logo Placeholder */}
          <div className="mb-6">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
              />
            </svg>
          </div>

          {/* Loading Text */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unity 시뮬레이터 로딩 중...
          </h3>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <p className="text-sm text-gray-600">{progressPercent}%</p>

          {/* Loading Message */}
          <p className="text-xs text-gray-500 mt-4">
            Unity WebGL을 로드하는 중입니다. 처음 실행 시 시간이 걸릴 수 있습니다.
          </p>
        </div>
      )}

      {/* Ready Indicator */}
      {isReady && (
        <div className="absolute top-2 right-2 px-3 py-1 bg-success/90 text-white text-xs font-medium rounded-full shadow-lg">
          ✓ Unity Ready
        </div>
      )}
    </div>
  )
}
